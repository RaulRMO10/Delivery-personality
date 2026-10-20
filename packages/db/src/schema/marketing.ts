import { sql } from "drizzle-orm";
import { boolean, check, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

/** Cupons de desconto. `valor`: percentual (1–100) ou centavos, conforme o tipo. */
export const cupons = pgTable(
  "cupons",
  {
    id: uuid().primaryKey().defaultRandom(),
    codigo: text().notNull(),
    tipo: text({ enum: ["percentual", "valor", "frete"] }).notNull(),
    valor: integer().notNull().default(0),
    pedidoMinimo: integer().notNull().default(0),
    validoDe: timestamp({ withTimezone: true }),
    validoAte: timestamp({ withTimezone: true }),
    limiteTotal: integer(),
    limitePorCliente: integer(),
    somentePrimeiraCompra: boolean().notNull().default(false),
    ativo: boolean().notNull().default(true),
    criadoEm: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex().on(t.codigo), check("cupons_valores_validos", sql`${t.valor} >= 0 AND ${t.pedidoMinimo} >= 0`)],
);
