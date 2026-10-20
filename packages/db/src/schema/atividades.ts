import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

/** Registro de quem fez o quê no painel. Somente inserção. */
export const atividades = pgTable(
  "atividades",
  {
    id: uuid().primaryKey().defaultRandom(),
    usuarioId: text().references(() => user.id, { onDelete: "set null" }),
    acao: text().notNull(),
    entidade: text().notNull(),
    entidadeId: text(),
    detalhes: jsonb().$type<Record<string, unknown>>(),
    ip: text(),
    criadoEm: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.criadoEm), index().on(t.usuarioId)],
);
