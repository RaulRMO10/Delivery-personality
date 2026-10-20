"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  ErroCalculo,
  TIPOS_INSUMO,
  UNIDADES,
  UNIDADES_ENTRADA,
  calcularCustoReceita,
  lerDinheiro,
  lerNumero,
  paraUnidadeBase,
  type UnidadeEntrada,
} from "@delivery/core";
import { db, eq, schema } from "@delivery/db";
import { registrarAtividade } from "@/lib/atividades";
import { exigirModulo } from "@/lib/sessao";
import { listarInsumos, listarReceitas, mapaPorId } from "./dados";

export type Resultado = { ok: true; mensagem?: string } | { ok: false; mensagem: string } | null;

const CAMINHO = "/painel/receitas";

/* ---------- Validação de campos digitados ---------- */

const texto = (rotulo: string, max = 120) =>
  z.string().trim().min(1, `Informe ${rotulo}.`).max(max, `${rotulo[0]!.toUpperCase()}${rotulo.slice(1)} muito longo.`);

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

const numeroPositivo = (rotulo: string) =>
  z.string().transform((v, ctx) => {
    const n = lerNumero(v);
    if (n === null || n <= 0) {
      ctx.addIssue({ code: "custom", message: `${rotulo}: informe um número maior que zero.` });
      return z.NEVER;
    }
    return n;
  });

const percentual = (rotulo: string) =>
  z.string().transform((v, ctx) => {
    const n = v.trim() === "" ? 0 : lerNumero(v);
    if (n === null || n < 0 || n >= 100) {
      ctx.addIssue({ code: "custom", message: `${rotulo}: informe um valor entre 0 e 99.` });
      return z.NEVER;
    }
    return n;
  });

const dinheiro = (rotulo: string) =>
  z.string().transform((v, ctx) => {
    const n = lerDinheiro(v);
    if (n === null || n < 0) {
      ctx.addIssue({ code: "custom", message: `${rotulo}: valor inválido.` });
      return z.NEVER;
    }
    return n;
  });

function erroValidacao(erro: z.ZodError): { ok: false; mensagem: string } {
  return { ok: false, mensagem: erro.issues[0]?.message ?? "Dados inválidos." };
}

/** Exclusão bloqueada por chave estrangeira (registro em uso). */
function emUso(erro: unknown): boolean {
  const causa = (erro as { cause?: { code?: string } })?.cause ?? erro;
  return (causa as { code?: string })?.code === "23503";
}

/* ---------- Ingredientes e embalagens ---------- */

const esquemaInsumo = z.object({
  id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  tipo: z.enum(TIPOS_INSUMO),
  nome: texto("o nome"),
  quantidade: numeroPositivo("Quantidade"),
  unidadeEntrada: z.enum(Object.keys(UNIDADES_ENTRADA) as [UnidadeEntrada, ...UnidadeEntrada[]]),
  preco: dinheiro("Preço"),
  fornecedor: textoOpcional(120),
});

export async function salvarInsumo(_anterior: Resultado, dados: FormData): Promise<Resultado> {
  const usuario = await exigirModulo("receitas");
  const validacao = esquemaInsumo.safeParse(Object.fromEntries(dados));
  if (!validacao.success) return erroValidacao(validacao.error);
  const { id, tipo, nome, quantidade, unidadeEntrada, preco, fornecedor } = validacao.data;
  const base = paraUnidadeBase(quantidade, unidadeEntrada);
  const valores = { tipo, nome, unidade: base.unidade, quantidadeEmbalagem: base.quantidade, precoEmbalagem: preco, fornecedor };

  if (id) {
    const [atual] = await db.select().from(schema.insumos).where(eq(schema.insumos.id, id));
    if (!atual) return { ok: false, mensagem: "Item não encontrado." };
    if (atual.unidade !== base.unidade) {
      const [uso] = await db.select({ id: schema.receitaItens.id }).from(schema.receitaItens).where(eq(schema.receitaItens.insumoId, id)).limit(1);
      if (uso) return { ok: false, mensagem: "Item usado em receitas: a unidade não pode ser alterada." };
    }
    const precoMudou = atual.precoEmbalagem !== preco || atual.quantidadeEmbalagem !== base.quantidade;
    await db
      .update(schema.insumos)
      .set({ ...valores, ...(precoMudou ? { precoAtualizadoEm: new Date() } : {}) })
      .where(eq(schema.insumos.id, id));
    await registrarAtividade({
      usuarioId: usuario.id,
      acao: "insumo.atualizado",
      entidade: "insumo",
      entidadeId: id,
      detalhes: precoMudou
        ? { nome, de: { preco: atual.precoEmbalagem, quantidade: atual.quantidadeEmbalagem }, para: { preco, quantidade: base.quantidade } }
        : { nome },
    });
  } else {
    const [novo] = await db.insert(schema.insumos).values(valores).returning({ id: schema.insumos.id });
    await registrarAtividade({ usuarioId: usuario.id, acao: "insumo.criado", entidade: "insumo", entidadeId: novo!.id, detalhes: { nome } });
  }

  revalidatePath(CAMINHO, "layout");
  return { ok: true };
}

export async function excluirInsumo(id: string): Promise<Resultado> {
  const usuario = await exigirModulo("receitas");
  try {
    const [removido] = await db.delete(schema.insumos).where(eq(schema.insumos.id, z.uuid().parse(id))).returning({ nome: schema.insumos.nome });
    if (!removido) return { ok: false, mensagem: "Item não encontrado." };
    await registrarAtividade({ usuarioId: usuario.id, acao: "insumo.excluido", entidade: "insumo", entidadeId: id, detalhes: { nome: removido.nome } });
  } catch (erro) {
    if (emUso(erro)) return { ok: false, mensagem: "Item usado em receitas. Remova-o das receitas antes de excluir." };
    throw erro;
  }
  revalidatePath(CAMINHO, "layout");
  return { ok: true };
}

/* ---------- Receitas ---------- */

const esquemaReceita = z.object({
  id: z.uuid().optional(),
  nome: texto("o nome"),
  rendimento: numeroPositivo("Rendimento"),
  unidadeRendimento: z.enum(UNIDADES),
  perdaPercentual: percentual("Perda"),
  tempoPreparoMin: z.string().transform((v, ctx) => {
    if (v.trim() === "") return null;
    const n = lerNumero(v);
    if (n === null || n < 0 || !Number.isInteger(n)) {
      ctx.addIssue({ code: "custom", message: "Tempo de preparo: informe minutos inteiros." });
      return z.NEVER;
    }
    return n;
  }),
  modoPreparo: textoOpcional(5000),
  itens: z
    .array(
      z.object({
        tipo: z.enum(["insumo", "receita"]),
        refId: z.uuid("Selecione o item."),
        quantidade: numeroPositivo("Quantidade do item"),
      }),
    )
    .min(1, "Adicione ao menos um item.")
    .max(100),
});

export type DadosReceita = z.input<typeof esquemaReceita>;

export async function salvarReceita(
  dados: DadosReceita,
): Promise<{ ok: true; id: string } | { ok: false; mensagem: string }> {
  const usuario = await exigirModulo("receitas");
  const validacao = esquemaReceita.safeParse(dados);
  if (!validacao.success) return erroValidacao(validacao.error);
  const { id, itens, ...campos } = validacao.data;

  // Valida o cálculo completo (itens existentes, sem referência circular) antes de gravar.
  const [receitas, insumos] = await Promise.all([listarReceitas(), listarInsumos()]);
  const idReceita = id ?? crypto.randomUUID();
  const mapaReceitas = mapaPorId(receitas);
  mapaReceitas.set(idReceita, {
    id: idReceita,
    rendimento: campos.rendimento,
    unidadeRendimento: campos.unidadeRendimento,
    perdaPercentual: campos.perdaPercentual,
    nome: campos.nome,
    tempoPreparoMin: campos.tempoPreparoMin,
    modoPreparo: campos.modoPreparo,
    itens: itens.map((i) =>
      i.tipo === "insumo"
        ? { tipo: "insumo", insumoId: i.refId, quantidade: i.quantidade }
        : { tipo: "receita", receitaId: i.refId, quantidade: i.quantidade },
    ),
  });
  try {
    calcularCustoReceita(idReceita, mapaReceitas, mapaPorId(insumos));
  } catch (erro) {
    if (erro instanceof ErroCalculo) return { ok: false, mensagem: erro.message };
    throw erro;
  }

  await db.transaction(async (tx) => {
    if (id) {
      const atualizadas = await tx.update(schema.receitas).set(campos).where(eq(schema.receitas.id, id)).returning({ id: schema.receitas.id });
      if (atualizadas.length === 0) throw new Error("Receita não encontrada.");
      await tx.delete(schema.receitaItens).where(eq(schema.receitaItens.receitaId, id));
    } else {
      await tx.insert(schema.receitas).values({ id: idReceita, ...campos });
    }
    await tx.insert(schema.receitaItens).values(
      itens.map((item, ordem) => ({
        receitaId: idReceita,
        insumoId: item.tipo === "insumo" ? item.refId : null,
        subReceitaId: item.tipo === "receita" ? item.refId : null,
        quantidade: item.quantidade,
        ordem,
      })),
    );
  });

  await registrarAtividade({
    usuarioId: usuario.id,
    acao: id ? "receita.atualizada" : "receita.criada",
    entidade: "receita",
    entidadeId: idReceita,
    detalhes: { nome: campos.nome },
  });
  revalidatePath(CAMINHO, "layout");
  return { ok: true, id: idReceita };
}

export async function excluirReceita(id: string): Promise<Resultado> {
  const usuario = await exigirModulo("receitas");
  try {
    const [removida] = await db.delete(schema.receitas).where(eq(schema.receitas.id, z.uuid().parse(id))).returning({ nome: schema.receitas.nome });
    if (!removida) return { ok: false, mensagem: "Receita não encontrada." };
    await registrarAtividade({ usuarioId: usuario.id, acao: "receita.excluida", entidade: "receita", entidadeId: id, detalhes: { nome: removida.nome } });
  } catch (erro) {
    if (emUso(erro)) return { ok: false, mensagem: "Receita usada em outra receita. Remova-a antes de excluir." };
    throw erro;
  }
  revalidatePath(CAMINHO, "layout");
  return { ok: true };
}

/* ---------- Custos fixos e parâmetros ---------- */

const esquemaCusto = z.object({
  id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  nome: texto("o nome"),
  valor: dinheiro("Valor"),
});

export async function salvarCustoFixo(_anterior: Resultado, dados: FormData): Promise<Resultado> {
  const usuario = await exigirModulo("receitas");
  const validacao = esquemaCusto.safeParse(Object.fromEntries(dados));
  if (!validacao.success) return erroValidacao(validacao.error);
  const { id, nome, valor } = validacao.data;
  if (id) {
    await db.update(schema.custosFixos).set({ nome, valorMensal: valor }).where(eq(schema.custosFixos.id, id));
  } else {
    await db.insert(schema.custosFixos).values({ nome, valorMensal: valor });
  }
  await registrarAtividade({ usuarioId: usuario.id, acao: "custo_fixo.salvo", entidade: "custo_fixo", entidadeId: id ?? null, detalhes: { nome, valor } });
  revalidatePath(CAMINHO, "layout");
  return { ok: true };
}

export async function excluirCustoFixo(id: string): Promise<Resultado> {
  const usuario = await exigirModulo("receitas");
  const [removido] = await db.delete(schema.custosFixos).where(eq(schema.custosFixos.id, z.uuid().parse(id))).returning({ nome: schema.custosFixos.nome });
  if (removido) {
    await registrarAtividade({ usuarioId: usuario.id, acao: "custo_fixo.excluido", entidade: "custo_fixo", entidadeId: id, detalhes: { nome: removido.nome } });
  }
  revalidatePath(CAMINHO, "layout");
  return { ok: true };
}

const esquemaParametros = z.object({
  faturamento: dinheiro("Faturamento"),
  margem: percentual("Margem"),
});

export async function salvarParametros(_anterior: Resultado, dados: FormData): Promise<Resultado> {
  const usuario = await exigirModulo("receitas");
  const validacao = esquemaParametros.safeParse(Object.fromEntries(dados));
  if (!validacao.success) return erroValidacao(validacao.error);
  const valores = { faturamentoMensalEstimado: validacao.data.faturamento, margemDesejadaPercentual: validacao.data.margem };
  await db
    .insert(schema.parametrosPrecificacao)
    .values({ id: 1, ...valores })
    .onConflictDoUpdate({ target: schema.parametrosPrecificacao.id, set: valores });
  await registrarAtividade({ usuarioId: usuario.id, acao: "parametros.salvos", entidade: "parametros", detalhes: valores });
  revalidatePath(CAMINHO, "layout");
  return { ok: true, mensagem: "Salvo." };
}

/* ---------- Canais de venda ---------- */

const esquemaCanal = z.object({
  id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  nome: texto("o nome", 60),
  taxa: percentual("Taxa"),
});

export async function salvarCanal(_anterior: Resultado, dados: FormData): Promise<Resultado> {
  const usuario = await exigirModulo("receitas");
  const validacao = esquemaCanal.safeParse(Object.fromEntries(dados));
  if (!validacao.success) return erroValidacao(validacao.error);
  const { id, nome, taxa } = validacao.data;
  if (id) {
    await db.update(schema.canaisVenda).set({ nome, taxaPercentual: taxa }).where(eq(schema.canaisVenda.id, id));
  } else {
    await db.insert(schema.canaisVenda).values({ nome, taxaPercentual: taxa });
  }
  await registrarAtividade({ usuarioId: usuario.id, acao: "canal.salvo", entidade: "canal", entidadeId: id ?? null, detalhes: { nome, taxa } });
  revalidatePath(CAMINHO, "layout");
  return { ok: true };
}

export async function excluirCanal(id: string): Promise<Resultado> {
  const usuario = await exigirModulo("receitas");
  const [canal] = await db.select({ principal: schema.canaisVenda.principal }).from(schema.canaisVenda).where(eq(schema.canaisVenda.id, z.uuid().parse(id)));
  if (canal?.principal) return { ok: false, mensagem: "O canal da loja própria não pode ser excluído." };
  const [removido] = await db.delete(schema.canaisVenda).where(eq(schema.canaisVenda.id, id)).returning({ nome: schema.canaisVenda.nome });
  if (removido) {
    await registrarAtividade({ usuarioId: usuario.id, acao: "canal.excluido", entidade: "canal", entidadeId: id, detalhes: { nome: removido.nome } });
  }
  revalidatePath(CAMINHO, "layout");
  return { ok: true };
}
