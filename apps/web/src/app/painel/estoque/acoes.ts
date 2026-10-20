"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { UNIDADES_ENTRADA, lerNumero, paraUnidadeBase, type UnidadeEntrada } from "@delivery/core";
import { db, eq, schema, sql } from "@delivery/db";
import { registrarAtividade } from "@/lib/atividades";
import { exigirModulo } from "@/lib/sessao";

export type Resultado = { ok: true; mensagem?: string } | { ok: false; mensagem: string } | null;

const unidade = z.enum(Object.keys(UNIDADES_ENTRADA) as [UnidadeEntrada, ...UnidadeEntrada[]]);

async function carregarInsumo(id: string) {
  const [insumo] = await db.select().from(schema.insumos).where(eq(schema.insumos.id, z.uuid().parse(id)));
  return insumo;
}

/** Converte a quantidade informada para a unidade base do insumo, recusando unidades incompatíveis. */
function converter(quantidade: number, unidadeEntrada: UnidadeEntrada, unidadeBase: string): number | null {
  const base = paraUnidadeBase(quantidade, unidadeEntrada);
  return base.unidade === unidadeBase ? base.quantidade : null;
}

const esquemaConfig = z.object({
  insumoId: z.uuid(),
  controlarEstoque: z
    .string()
    .optional()
    .transform((v) => v === "on"),
  minimo: z.string(),
  unidade,
});

export async function configurarEstoque(_anterior: Resultado, dados: FormData): Promise<Resultado> {
  const usuario = await exigirModulo("estoque");
  const validacao = esquemaConfig.safeParse(Object.fromEntries(dados));
  if (!validacao.success) return { ok: false, mensagem: "Dados inválidos." };
  const insumo = await carregarInsumo(validacao.data.insumoId);
  if (!insumo) return { ok: false, mensagem: "Item não encontrado." };
  const numero = validacao.data.minimo.trim() ? lerNumero(validacao.data.minimo) : 0;
  if (numero === null || numero < 0) return { ok: false, mensagem: "Mínimo inválido." };
  const minimo = converter(numero, validacao.data.unidade, insumo.unidade);
  if (minimo === null) return { ok: false, mensagem: "Unidade incompatível com o item." };
  await db.update(schema.insumos).set({ controlarEstoque: validacao.data.controlarEstoque, estoqueMinimo: minimo }).where(eq(schema.insumos.id, insumo.id));
  await registrarAtividade({ usuarioId: usuario.id, acao: "estoque.configurado", entidade: "insumo", entidadeId: insumo.id, detalhes: { nome: insumo.nome } });
  revalidatePath("/painel/estoque");
  return { ok: true };
}

const esquemaMovimento = z.object({
  insumoId: z.uuid(),
  tipo: z.enum(["entrada", "perda", "ajuste"]),
  quantidade: z.string(),
  unidade,
  observacao: z
    .string()
    .trim()
    .max(200)
    .transform((v) => v || null),
});

export async function movimentarEstoque(_anterior: Resultado, dados: FormData): Promise<Resultado> {
  const usuario = await exigirModulo("estoque");
  const validacao = esquemaMovimento.safeParse(Object.fromEntries(dados));
  if (!validacao.success) return { ok: false, mensagem: "Dados inválidos." };
  const { insumoId, tipo, observacao } = validacao.data;
  const insumo = await carregarInsumo(insumoId);
  if (!insumo) return { ok: false, mensagem: "Item não encontrado." };
  const numero = lerNumero(validacao.data.quantidade);
  if (numero === null || numero < 0 || (tipo !== "ajuste" && numero === 0)) return { ok: false, mensagem: "Quantidade inválida." };
  const quantidade = converter(numero, validacao.data.unidade, insumo.unidade);
  if (quantidade === null) return { ok: false, mensagem: "Unidade incompatível com o item." };

  // Ajuste: a quantidade informada é o saldo contado; o movimento registra a diferença.
  await db.transaction(async (tx) => {
    const [atual] = await tx.select({ saldo: schema.insumos.estoqueAtual }).from(schema.insumos).where(eq(schema.insumos.id, insumoId)).for("update");
    const variacao = tipo === "entrada" ? quantidade : tipo === "perda" ? -quantidade : quantidade - (atual?.saldo ?? 0);
    await tx.insert(schema.movimentosEstoque).values({ insumoId, tipo, quantidade: variacao, usuarioId: usuario.id, observacao });
    await tx
      .update(schema.insumos)
      .set({ estoqueAtual: sql`${schema.insumos.estoqueAtual} + ${variacao}`, controlarEstoque: true })
      .where(eq(schema.insumos.id, insumoId));
  });
  await registrarAtividade({ usuarioId: usuario.id, acao: `estoque.${tipo}`, entidade: "insumo", entidadeId: insumoId, detalhes: { nome: insumo.nome, quantidade } });
  revalidatePath("/painel/estoque");
  return { ok: true };
}
