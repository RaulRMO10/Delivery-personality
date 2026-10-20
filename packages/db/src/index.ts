import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export { schema };

function criarConexao() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida.");
  // prepare: false mantém compatibilidade com o pooler do Supabase (modo transação).
  return postgres(url, { prepare: false, max: 10 });
}

const global = globalThis as unknown as { conexaoDb?: ReturnType<typeof postgres> };
const conexao = global.conexaoDb ?? criarConexao();
if (process.env.NODE_ENV !== "production") global.conexaoDb = conexao;

export const db = drizzle(conexao, { schema, casing: "snake_case" });
export type Db = typeof db;

// Operadores reexportados para que o app use a mesma instância do drizzle-orm.
export { and, asc, between, count, desc, eq, gt, gte, ilike, inArray, isNotNull, isNull, lt, lte, ne, or, sql, sum } from "drizzle-orm";
