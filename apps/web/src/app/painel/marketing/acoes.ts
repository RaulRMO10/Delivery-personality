"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TIPOS_CUPOM, lerDinheiro, lerNumero, normalizarCodigoCupom, validarCupom } from "@delivery/core";
import { count, db, eq, schema } from "@delivery/db";
import { registrarAtividade } from "@/lib/atividades";
import { exigirModulo } from "@/lib/sessao";

export type Resultado = { ok: true; mensagem?: string } | { ok: false; mensagem: string } | null;

/** Data local (AAAA-MM-DD) no fuso da loja: início ou fim do dia. */
function dataLocal(texto: string, fimDoDia: boolean): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return null;
  return new Date(`${texto}T${fimDoDia ? "23:59:59" : "00:00:00"}-03:00`);
}

const inteiroOpcional = z.string().transform((v, ctx) => {
  if (v.trim() === "") return null;
  const n = lerNumero(v);
  if (n === null || n < 1 || !Number.isInteger(n)) {
    ctx.addIssue({ code: "custom", message: "Limites devem ser números inteiros." });
    return z.NEVER;
  }
  return n;
});

const esquemaCupom = z.object({
  id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  codigo: z.string().transform(normalizarCodigoCupom),
  tipo: z.enum(TIPOS_CUPOM),
  valor: z.string(),
  pedidoMinimo: z.string(),
  validoDe: z.string(),
  validoAte: z.string(),
  limiteTotal: inteiroOpcional,
  limitePorCliente: inteiroOpcional,
  somentePrimeiraCompra: z
    .string()
    .optional()
    .transform((v) => v === "on"),
});

export async function salvarCupom(_anterior: Resultado, dados: FormData): Promise<Resultado> {
  const usuario = await exigirModulo("marketing");
  const validacao = esquemaCupom.safeParse(Object.fromEntries(dados));
  if (!validacao.success) return { ok: false, mensagem: validacao.error.issues[0]?.message ?? "Dados inválidos." };
  const { id, valor: valorTexto, pedidoMinimo: minimoTexto, validoDe: deTexto, validoAte: ateTexto, ...campos } = validacao.data;

  const valor = campos.tipo === "frete" ? 0 : campos.tipo === "percentual" ? lerNumero(valorTexto) : lerDinheiro(valorTexto);
  if (valor === null) return { ok: false, mensagem: "Informe o valor do desconto." };
  const pedidoMinimo = minimoTexto.trim() ? lerDinheiro(minimoTexto) : 0;
  if (pedidoMinimo === null || pedidoMinimo < 0) return { ok: false, mensagem: "Pedido mínimo inválido." };
  const validoDe = deTexto ? dataLocal(deTexto, false) : null;
  const validoAte = ateTexto ? dataLocal(ateTexto, true) : null;

  const cupom = { ...campos, valor, pedidoMinimo, validoDe, validoAte };
  const erro = validarCupom(cupom);
  if (erro) return { ok: false, mensagem: erro };

  try {
    if (id) await db.update(schema.cupons).set(cupom).where(eq(schema.cupons.id, id));
    else await db.insert(schema.cupons).values(cupom);
  } catch (e) {
    const codigo = (e as { cause?: { code?: string } })?.cause?.code;
    if (codigo === "23505") return { ok: false, mensagem: "Já existe um cupom com este código." };
    throw e;
  }
  await registrarAtividade({ usuarioId: usuario.id, acao: "cupom.salvo", entidade: "cupom", entidadeId: id ?? null, detalhes: { nome: cupom.codigo } });
  revalidatePath("/painel/marketing");
  return { ok: true };
}

export async function alternarCupom(id: string, ativo: boolean): Promise<Resultado> {
  await exigirModulo("marketing");
  await db.update(schema.cupons).set({ ativo }).where(eq(schema.cupons.id, z.uuid().parse(id)));
  revalidatePath("/painel/marketing");
  return { ok: true };
}

export async function excluirCupom(id: string): Promise<Resultado> {
  const usuario = await exigirModulo("marketing");
  const cupomId = z.uuid().parse(id);
  const [uso] = await db.select({ total: count() }).from(schema.pedidos).where(eq(schema.pedidos.cupomId, cupomId));
  if ((uso?.total ?? 0) > 0) return { ok: false, mensagem: "Cupom já usado em pedidos. Desative em vez de excluir." };
  const [cupom] = await db.delete(schema.cupons).where(eq(schema.cupons.id, cupomId)).returning({ codigo: schema.cupons.codigo });
  if (cupom) await registrarAtividade({ usuarioId: usuario.id, acao: "cupom.excluido", entidade: "cupom", entidadeId: cupomId, detalhes: { nome: cupom.codigo } });
  revalidatePath("/painel/marketing");
  return { ok: true };
}

const esquemaFidelidade = z.object({
  fidelidadeAtiva: z
    .string()
    .optional()
    .transform((v) => v === "on"),
  fidelidadePedidos: z.string().transform((v, ctx) => {
    const n = lerNumero(v);
    if (n === null || n < 1 || n > 100 || !Number.isInteger(n)) {
      ctx.addIssue({ code: "custom", message: "Pedidos necessários: de 1 a 100." });
      return z.NEVER;
    }
    return n;
  }),
  fidelidadeTipo: z.enum(["valor", "percentual"]),
  fidelidadeValor: z.string(),
});

export async function salvarFidelidade(_anterior: Resultado, dados: FormData): Promise<Resultado> {
  const usuario = await exigirModulo("marketing");
  const validacao = esquemaFidelidade.safeParse(Object.fromEntries(dados));
  if (!validacao.success) return { ok: false, mensagem: validacao.error.issues[0]?.message ?? "Dados inválidos." };
  const { fidelidadeValor: texto, ...campos } = validacao.data;
  const valor = campos.fidelidadeTipo === "percentual" ? lerNumero(texto) : lerDinheiro(texto);
  if (valor === null || valor < 0 || (campos.fidelidadeTipo === "percentual" && valor > 100) || !Number.isInteger(valor)) {
    return { ok: false, mensagem: "Valor da recompensa inválido." };
  }
  if (campos.fidelidadeAtiva && valor === 0) return { ok: false, mensagem: "Informe o valor da recompensa." };
  const valores = { ...campos, fidelidadeValor: valor };
  await db.insert(schema.configuracaoLoja).values({ id: 1, ...valores }).onConflictDoUpdate({ target: schema.configuracaoLoja.id, set: valores });
  await registrarAtividade({ usuarioId: usuario.id, acao: "fidelidade.salva", entidade: "loja", detalhes: valores });
  revalidatePath("/", "layout");
  return { ok: true, mensagem: "Salvo." };
}
