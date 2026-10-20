import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { pedidos } from "./pedidos";

/** Situação de cada integração (último contato e último erro). */
export const integracoes = pgTable("integracoes", {
  canal: text().primaryKey(),
  ultimoPolling: timestamp({ withTimezone: true }),
  ultimoErro: text(),
  ultimoErroEm: timestamp({ withTimezone: true }),
  atualizadoEm: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/** Eventos recebidos dos canais. Gravados antes da confirmação; o id evita processar duas vezes. */
export const eventosExternos = pgTable(
  "eventos_externos",
  {
    id: uuid().primaryKey().defaultRandom(),
    canal: text().notNull(),
    eventoId: text().notNull(),
    codigo: text().notNull(),
    pedidoExternoId: text(),
    payload: jsonb().notNull(),
    recebidoEm: timestamp({ withTimezone: true }).notNull().defaultNow(),
    processadoEm: timestamp({ withTimezone: true }),
    erro: text(),
  },
  (t) => [uniqueIndex().on(t.canal, t.eventoId), index().on(t.recebidoEm)],
);

/** Ações a enviar aos canais (fila com novas tentativas). */
export const comandosIntegracao = pgTable(
  "comandos_integracao",
  {
    id: uuid().primaryKey().defaultRandom(),
    canal: text().notNull(),
    pedidoId: uuid()
      .notNull()
      .references(() => pedidos.id, { onDelete: "cascade" }),
    acao: text().notNull(),
    payload: jsonb().$type<Record<string, unknown>>(),
    status: text({ enum: ["pendente", "enviado", "erro"] }).notNull().default("pendente"),
    tentativas: integer().notNull().default(0),
    proximaTentativa: timestamp({ withTimezone: true }).notNull().defaultNow(),
    erro: text(),
    criadoEm: timestamp({ withTimezone: true }).notNull().defaultNow(),
    enviadoEm: timestamp({ withTimezone: true }),
  },
  (t) => [index().on(t.status, t.proximaTentativa), index().on(t.pedidoId)],
);
