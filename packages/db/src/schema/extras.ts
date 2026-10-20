import { sql } from "drizzle-orm";
import { boolean, check, index, integer, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { pedidos } from "./pedidos";
import { insumos } from "./receitas";

/** Avaliação do cliente após a entrega (uma por pedido). */
export const avaliacoes = pgTable(
  "avaliacoes",
  {
    id: uuid().primaryKey().defaultRandom(),
    pedidoId: uuid()
      .notNull()
      .references(() => pedidos.id, { onDelete: "cascade" }),
    nota: integer().notNull(),
    comentario: text(),
    resposta: text(),
    respondidoEm: timestamp({ withTimezone: true }),
    criadoEm: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex().on(t.pedidoId), index().on(t.criadoEm), check("avaliacoes_nota_valida", sql`${t.nota} BETWEEN 1 AND 5`)],
);

/** Movimentações de estoque de insumos (quantidade com sinal, na unidade base). */
export const movimentosEstoque = pgTable(
  "movimentos_estoque",
  {
    id: uuid().primaryKey().defaultRandom(),
    insumoId: uuid()
      .notNull()
      .references(() => insumos.id, { onDelete: "cascade" }),
    tipo: text({ enum: ["entrada", "ajuste", "venda", "perda"] }).notNull(),
    quantidade: numeric({ precision: 14, scale: 3, mode: "number" }).notNull(),
    pedidoId: uuid().references(() => pedidos.id, { onDelete: "set null" }),
    usuarioId: text().references(() => user.id, { onDelete: "set null" }),
    observacao: text(),
    criadoEm: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.insumoId, t.criadoEm)],
);

/** Anotações do negócio (dicas, fornecedores, procedimentos). */
export const anotacoes = pgTable("anotacoes", {
  id: uuid().primaryKey().defaultRandom(),
  titulo: text().notNull(),
  conteudo: text().notNull().default(""),
  fixada: boolean().notNull().default(false),
  autorId: text().references(() => user.id, { onDelete: "set null" }),
  criadoEm: timestamp({ withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
