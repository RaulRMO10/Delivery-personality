import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { canaisVenda, insumos, receitas } from "./receitas";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

const datas = {
  criadoEm: timestamp({ withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const categorias = pgTable("categorias", {
  id: uuid().primaryKey().defaultRandom(),
  nome: text().notNull(),
  ordem: integer().notNull().default(0),
  ativo: boolean().notNull().default(true),
  ...datas,
});

/** Produto à venda. `preco` é o preço da loja própria, em centavos. */
export const produtos = pgTable(
  "produtos",
  {
    id: uuid().primaryKey().defaultRandom(),
    categoriaId: uuid()
      .notNull()
      .references(() => categorias.id, { onDelete: "restrict" }),
    nome: text().notNull(),
    descricao: text(),
    preco: integer().notNull(),
    ativo: boolean().notNull().default(true),
    esgotado: boolean().notNull().default(false),
    destaque: boolean().notNull().default(false),
    ordem: integer().notNull().default(0),
    receitaId: uuid().references(() => receitas.id, { onDelete: "set null" }),
    quantidadeReceita: numeric({ precision: 12, scale: 3, mode: "number" }),
    fotoAtualizadaEm: timestamp({ withTimezone: true }),
    ...datas,
  },
  (t) => [
    index().on(t.categoriaId, t.ordem),
    check("produtos_preco_nao_negativo", sql`${t.preco} >= 0`),
    check("produtos_quantidade_receita_positiva", sql`${t.quantidadeReceita} IS NULL OR ${t.quantidadeReceita} > 0`),
  ],
);

/** Foto do produto, já redimensionada no navegador (WebP, até ~1 MB). */
export const produtoFotos = pgTable("produto_fotos", {
  produtoId: uuid()
    .primaryKey()
    .references(() => produtos.id, { onDelete: "cascade" }),
  tipo: text().notNull(),
  conteudo: bytea().notNull(),
});

/** Preço do produto em outro canal (ex.: iFood). Sem registro, vale o preço da loja. */
export const produtoPrecos = pgTable(
  "produto_precos",
  {
    produtoId: uuid()
      .notNull()
      .references(() => produtos.id, { onDelete: "cascade" }),
    canalId: uuid()
      .notNull()
      .references(() => canaisVenda.id, { onDelete: "cascade" }),
    preco: integer().notNull(),
  },
  (t) => [primaryKey({ columns: [t.produtoId, t.canalId] }), check("produto_precos_nao_negativo", sql`${t.preco} >= 0`)],
);

/** Embalagens usadas por unidade vendida do produto. */
export const produtoEmbalagens = pgTable(
  "produto_embalagens",
  {
    produtoId: uuid()
      .notNull()
      .references(() => produtos.id, { onDelete: "cascade" }),
    insumoId: uuid()
      .notNull()
      .references(() => insumos.id, { onDelete: "restrict" }),
    quantidade: numeric({ precision: 12, scale: 3, mode: "number" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.produtoId, t.insumoId] }), check("produto_embalagens_quantidade_positiva", sql`${t.quantidade} > 0`)],
);

/** Grupo de complementos reutilizável (ex.: "Sabores de brigadeiro"). */
export const gruposComplementos = pgTable(
  "grupos_complementos",
  {
    id: uuid().primaryKey().defaultRandom(),
    nome: text().notNull(),
    minimo: integer().notNull().default(0),
    maximo: integer().notNull().default(1),
    ...datas,
  },
  (t) => [check("grupos_limites_validos", sql`${t.minimo} >= 0 AND ${t.maximo} >= 1 AND ${t.minimo} <= ${t.maximo}`)],
);

export const opcoesComplementos = pgTable(
  "opcoes_complementos",
  {
    id: uuid().primaryKey().defaultRandom(),
    grupoId: uuid()
      .notNull()
      .references(() => gruposComplementos.id, { onDelete: "cascade" }),
    nome: text().notNull(),
    precoAdicional: integer().notNull().default(0),
    esgotado: boolean().notNull().default(false),
    ordem: integer().notNull().default(0),
  },
  (t) => [index().on(t.grupoId, t.ordem), check("opcoes_preco_nao_negativo", sql`${t.precoAdicional} >= 0`)],
);

export const produtoGrupos = pgTable(
  "produto_grupos",
  {
    produtoId: uuid()
      .notNull()
      .references(() => produtos.id, { onDelete: "cascade" }),
    grupoId: uuid()
      .notNull()
      .references(() => gruposComplementos.id, { onDelete: "restrict" }),
    ordem: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.produtoId, t.grupoId] }), uniqueIndex().on(t.produtoId, t.ordem)],
);
