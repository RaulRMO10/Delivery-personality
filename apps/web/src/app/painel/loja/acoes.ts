"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { lerDinheiro, lerNumero, podeOperarLoja, validarIntervalos } from "@delivery/core";
import { db, eq, schema } from "@delivery/db";
import { registrarAtividade } from "@/lib/atividades";
import { exigirModulo, exigirUsuario } from "@/lib/sessao";

export type Resultado = { ok: true; mensagem?: string } | { ok: false; mensagem: string } | null;

function erroValidacao(erro: z.ZodError) {
  return { ok: false as const, mensagem: erro.issues[0]?.message ?? "Dados inválidos." };
}

async function atualizarConfiguracao(valores: Partial<typeof schema.configuracaoLoja.$inferInsert>) {
  await db
    .insert(schema.configuracaoLoja)
    .values({ id: 1, ...valores })
    .onConflictDoUpdate({ target: schema.configuracaoLoja.id, set: valores });
  revalidatePath("/", "layout");
}

/* ---------- Operação: pausar, fechar, reabrir ---------- */

async function exigirOperador() {
  const usuario = await exigirUsuario();
  if (!podeOperarLoja(usuario.perfil)) throw new Error("Sem permissão.");
  return usuario;
}

const MINUTOS_PAUSA = [15, 30, 60, 120] as const;

export async function pausarLoja(minutos: number): Promise<Resultado> {
  const usuario = await exigirOperador();
  if (!(MINUTOS_PAUSA as readonly number[]).includes(minutos)) return { ok: false, mensagem: "Tempo de pausa inválido." };
  const ate = new Date(Date.now() + minutos * 60_000);
  await atualizarConfiguracao({ pausadaAte: ate, fechadaManual: false });
  await registrarAtividade({ usuarioId: usuario.id, acao: "loja.pausada", entidade: "loja", detalhes: { minutos } });
  return { ok: true };
}

export async function fecharLoja(): Promise<Resultado> {
  const usuario = await exigirOperador();
  await atualizarConfiguracao({ fechadaManual: true, pausadaAte: null });
  await registrarAtividade({ usuarioId: usuario.id, acao: "loja.fechada", entidade: "loja" });
  return { ok: true };
}

export async function reabrirLoja(): Promise<Resultado> {
  const usuario = await exigirOperador();
  await atualizarConfiguracao({ fechadaManual: false, pausadaAte: null });
  await registrarAtividade({ usuarioId: usuario.id, acao: "loja.reaberta", entidade: "loja" });
  return { ok: true };
}

/* ---------- Dados da loja ---------- */

const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

const esquemaDados = z.object({
  nome: opcional(60),
  telefone: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v === "" || (v.length >= 10 && v.length <= 13), "Telefone inválido.")
    .transform((v) => v || null),
  endereco: opcional(200),
  documento: opcional(20),
  aviso: opcional(200),
  tempoPreparoMin: z.string().transform((v, ctx) => {
    const n = lerNumero(v);
    if (n === null || n < 0 || n > 600 || !Number.isInteger(n)) {
      ctx.addIssue({ code: "custom", message: "Tempo de preparo: informe minutos inteiros." });
      return z.NEVER;
    }
    return n;
  }),
});

export async function salvarDadosLoja(_anterior: Resultado, dados: FormData): Promise<Resultado> {
  const usuario = await exigirModulo("loja");
  const validacao = esquemaDados.safeParse(Object.fromEntries(dados));
  if (!validacao.success) return erroValidacao(validacao.error);
  await atualizarConfiguracao(validacao.data);
  await registrarAtividade({ usuarioId: usuario.id, acao: "loja.dados_salvos", entidade: "loja" });
  return { ok: true, mensagem: "Salvo." };
}

/* ---------- Horários e datas fechadas ---------- */

const esquemaHorarios = z.array(
  z.object({
    diaSemana: z.number().int().min(0).max(6),
    abre: z.number().int().min(0).max(1439),
    fecha: z.number().int().min(0).max(1439),
  }),
).max(42);

export async function salvarHorarios(intervalos: z.input<typeof esquemaHorarios>): Promise<Resultado> {
  const usuario = await exigirModulo("loja");
  const validacao = esquemaHorarios.safeParse(intervalos);
  if (!validacao.success) return { ok: false, mensagem: "Horário inválido." };
  const erro = validarIntervalos(validacao.data);
  if (erro) return { ok: false, mensagem: erro };

  await db.transaction(async (tx) => {
    await tx.delete(schema.horariosFuncionamento);
    if (validacao.data.length > 0) await tx.insert(schema.horariosFuncionamento).values(validacao.data);
  });
  await registrarAtividade({ usuarioId: usuario.id, acao: "loja.horarios_salvos", entidade: "loja" });
  revalidatePath("/", "layout");
  return { ok: true, mensagem: "Horários salvos." };
}

const esquemaData = z.object({
  data: z.iso.date("Data inválida."),
  motivo: opcional(80),
});

export async function adicionarDataFechada(_anterior: Resultado, dados: FormData): Promise<Resultado> {
  const usuario = await exigirModulo("loja");
  const validacao = esquemaData.safeParse(Object.fromEntries(dados));
  if (!validacao.success) return erroValidacao(validacao.error);
  await db
    .insert(schema.datasFechadas)
    .values(validacao.data)
    .onConflictDoUpdate({ target: schema.datasFechadas.data, set: { motivo: validacao.data.motivo } });
  await registrarAtividade({ usuarioId: usuario.id, acao: "loja.data_fechada", entidade: "loja", detalhes: { data: validacao.data.data } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removerDataFechada(data: string): Promise<Resultado> {
  await exigirModulo("loja");
  await db.delete(schema.datasFechadas).where(eq(schema.datasFechadas.data, z.iso.date().parse(data)));
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ---------- Entrega ---------- */

const dinheiroOpcional = (rotulo: string) =>
  z.string().transform((v, ctx) => {
    if (v.trim() === "") return null;
    const n = lerDinheiro(v);
    if (n === null || n < 0) {
      ctx.addIssue({ code: "custom", message: `${rotulo}: valor inválido.` });
      return z.NEVER;
    }
    return n;
  });

const esquemaRegras = z.object({
  pedidoMinimo: dinheiroOpcional("Pedido mínimo").transform((v) => v ?? 0),
  freteGratisAcima: dinheiroOpcional("Frete grátis"),
  aceitaRetirada: z
    .string()
    .optional()
    .transform((v) => v === "on"),
});

export async function salvarRegrasEntrega(_anterior: Resultado, dados: FormData): Promise<Resultado> {
  const usuario = await exigirModulo("entrega");
  const validacao = esquemaRegras.safeParse(Object.fromEntries(dados));
  if (!validacao.success) return erroValidacao(validacao.error);
  await atualizarConfiguracao(validacao.data);
  await registrarAtividade({ usuarioId: usuario.id, acao: "entrega.regras_salvas", entidade: "entrega", detalhes: validacao.data });
  return { ok: true, mensagem: "Salvo." };
}

const esquemaBairro = z.object({
  id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  nome: z.string().trim().min(1, "Informe o nome.").max(80),
  taxa: dinheiroOpcional("Taxa").transform((v) => v ?? 0),
  tempoEstimadoMin: z.string().transform((v, ctx) => {
    const n = lerNumero(v);
    if (n === null || n < 0 || n > 600 || !Number.isInteger(n)) {
      ctx.addIssue({ code: "custom", message: "Tempo: informe minutos inteiros." });
      return z.NEVER;
    }
    return n;
  }),
});

export async function salvarBairro(_anterior: Resultado, dados: FormData): Promise<Resultado> {
  const usuario = await exigirModulo("entrega");
  const validacao = esquemaBairro.safeParse(Object.fromEntries(dados));
  if (!validacao.success) return erroValidacao(validacao.error);
  const { id, ...valores } = validacao.data;
  if (id) await db.update(schema.bairros).set(valores).where(eq(schema.bairros.id, id));
  else await db.insert(schema.bairros).values(valores);
  await registrarAtividade({ usuarioId: usuario.id, acao: "bairro.salvo", entidade: "bairro", entidadeId: id ?? null, detalhes: { nome: valores.nome, taxa: valores.taxa } });
  revalidatePath("/painel/entrega");
  return { ok: true };
}

export async function alternarBairro(id: string, ativo: boolean): Promise<Resultado> {
  await exigirModulo("entrega");
  await db.update(schema.bairros).set({ ativo }).where(eq(schema.bairros.id, z.uuid().parse(id)));
  revalidatePath("/painel/entrega");
  return { ok: true };
}

export async function excluirBairro(id: string): Promise<Resultado> {
  const usuario = await exigirModulo("entrega");
  const [bairro] = await db.delete(schema.bairros).where(eq(schema.bairros.id, z.uuid().parse(id))).returning({ nome: schema.bairros.nome });
  if (bairro) await registrarAtividade({ usuarioId: usuario.id, acao: "bairro.excluido", entidade: "bairro", entidadeId: id, detalhes: { nome: bairro.nome } });
  revalidatePath("/painel/entrega");
  return { ok: true };
}
