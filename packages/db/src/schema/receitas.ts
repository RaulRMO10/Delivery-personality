import { sql } from "drizzle-orm";
import { boolean, check, index, integer, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

const datas = {
  criadoEm: timestamp({ withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** Ingredientes e embalagens. Quantidade na unidade base (g, ml, un); preço em centavos. */
export const insumos = pgTable(
  "insumos",
  {
    id: uuid().primaryKey().defaultRandom(),
    tipo: text({ enum: ["ingrediente", "embalagem"] }).notNull(),
    nome: text().notNull(),
    unidade: text({ enum: ["g", "ml", "un"] }).notNull(),
    quantidadeEmbalagem: numeric({ precision: 12, scale: 3, mode: "number" }).notNull(),
    precoEmbalagem: integer().notNull(),
    fornecedor: text(),
    precoAtualizadoEm: timestamp({ withTimezone: true }).notNull().defaultNow(),
    ativo: boolean().notNull().default(true),
    ...datas,
  },
  (t) => [
    index().on(t.tipo, t.nome),
    check("insumos_quantidade_positiva", sql`${t.quantidadeEmbalagem} > 0`),
    check("insumos_preco_nao_negativo", sql`${t.precoEmbalagem} >= 0`),
  ],
);

export const receitas = pgTable(
  "receitas",
  {
    id: uuid().primaryKey().defaultRandom(),
    nome: text().notNull(),
    rendimento: numeric({ precision: 12, scale: 3, mode: "number" }).notNull(),
    unidadeRendimento: text({ enum: ["g", "ml", "un"] }).notNull(),
    perdaPercentual: numeric({ precision: 5, scale: 2, mode: "number" }).notNull().default(0),
    tempoPreparoMin: integer(),
    modoPreparo: text(),
    ativo: boolean().notNull().default(true),
    ...datas,
  },
  (t) => [
    index().on(t.nome),
    check("receitas_rendimento_positivo", sql`${t.rendimento} > 0`),
    check("receitas_perda_valida", sql`${t.perdaPercentual} >= 0 AND ${t.perdaPercentual} < 100`),
  ],
);

/** Item de receita: um insumo ou uma sub-receita, na unidade base correspondente. */
export const receitaItens = pgTable(
  "receita_itens",
  {
    id: uuid().primaryKey().defaultRandom(),
    receitaId: uuid()
      .notNull()
      .references(() => receitas.id, { onDelete: "cascade" }),
    insumoId: uuid().references(() => insumos.id, { onDelete: "restrict" }),
    subReceitaId: uuid().references(() => receitas.id, { onDelete: "restrict" }),
    quantidade: numeric({ precision: 12, scale: 3, mode: "number" }).notNull(),
    ordem: integer().notNull().default(0),
  },
  (t) => [
    index().on(t.receitaId),
    check("receita_itens_um_tipo", sql`(${t.insumoId} IS NULL) <> (${t.subReceitaId} IS NULL)`),
    check("receita_itens_quantidade_positiva", sql`${t.quantidade} > 0`),
    check("receita_itens_sem_autorreferencia", sql`${t.subReceitaId} IS DISTINCT FROM ${t.receitaId}`),
  ],
);

/** Custos fixos mensais (gás, luz, internet, pró-labore...). Valor em centavos. */
export const custosFixos = pgTable(
  "custos_fixos",
  {
    id: uuid().primaryKey().defaultRandom(),
    nome: text().notNull(),
    valorMensal: integer().notNull(),
    ...datas,
  },
  (t) => [check("custos_fixos_valor_nao_negativo", sql`${t.valorMensal} >= 0`)],
);

/** Canais de venda e suas taxas sobre o valor vendido. */
export const canaisVenda = pgTable(
  "canais_venda",
  {
    id: uuid().primaryKey().defaultRandom(),
    nome: text().notNull(),
    taxaPercentual: numeric({ precision: 5, scale: 2, mode: "number" }).notNull().default(0),
    ativo: boolean().notNull().default(true),
    /** Canal da loja própria: usa o preço principal do produto. Apenas um. */
    principal: boolean().notNull().default(false),
    ...datas,
  },
  (t) => [
    check("canais_taxa_valida", sql`${t.taxaPercentual} >= 0 AND ${t.taxaPercentual} < 100`),
    uniqueIndex("canais_venda_um_principal").on(t.principal).where(sql`${t.principal}`),
  ],
);

/** Parâmetros gerais de precificação (linha única, id = 1). */
export const parametrosPrecificacao = pgTable(
  "parametros_precificacao",
  {
    id: integer().primaryKey().default(1),
    faturamentoMensalEstimado: integer().notNull().default(0),
    margemDesejadaPercentual: numeric({ precision: 5, scale: 2, mode: "number" }).notNull().default(30),
    atualizadoEm: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [check("parametros_linha_unica", sql`${t.id} = 1`)],
);
