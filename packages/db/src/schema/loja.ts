import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** Configuração da loja (linha única, id = 1). Valores em centavos e minutos. */
export const configuracaoLoja = pgTable(
  "configuracao_loja",
  {
    id: integer().primaryKey().default(1),
    nome: text(),
    telefone: text(),
    endereco: text(),
    documento: text(),
    aviso: text(),
    tempoPreparoMin: integer().notNull().default(30),
    pedidoMinimo: integer().notNull().default(0),
    aceitaRetirada: boolean().notNull().default(true),
    freteGratisAcima: integer(),
    formasPagamento: text().array().notNull().default(sql`ARRAY['pix','dinheiro','cartao']::text[]`),
    chavePix: text(),
    nomeRecebedorPix: text(),
    cidadePix: text(),
    fechadaManual: boolean().notNull().default(false),
    pausadaAte: timestamp({ withTimezone: true }),
    atualizadoEm: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    check("configuracao_linha_unica", sql`${t.id} = 1`),
    check("configuracao_valores_validos", sql`${t.tempoPreparoMin} >= 0 AND ${t.pedidoMinimo} >= 0 AND (${t.freteGratisAcima} IS NULL OR ${t.freteGratisAcima} >= 0)`),
  ],
);

/** Intervalos de funcionamento. Minutos desde 00:00; `fecha <= abre` termina no dia seguinte. */
export const horariosFuncionamento = pgTable(
  "horarios_funcionamento",
  {
    id: uuid().primaryKey().defaultRandom(),
    diaSemana: integer().notNull(),
    abre: integer().notNull(),
    fecha: integer().notNull(),
  },
  (t) => [
    index().on(t.diaSemana),
    check("horarios_valores_validos", sql`${t.diaSemana} BETWEEN 0 AND 6 AND ${t.abre} BETWEEN 0 AND 1439 AND ${t.fecha} BETWEEN 0 AND 1439 AND ${t.abre} <> ${t.fecha}`),
  ],
);

/** Datas em que a loja não abre (feriados, folgas). */
export const datasFechadas = pgTable("datas_fechadas", {
  data: date({ mode: "string" }).primaryKey(),
  motivo: text(),
});

export const bairros = pgTable(
  "bairros",
  {
    id: uuid().primaryKey().defaultRandom(),
    nome: text().notNull(),
    taxa: integer().notNull(),
    tempoEstimadoMin: integer().notNull().default(30),
    ativo: boolean().notNull().default(true),
    criadoEm: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.nome), check("bairros_valores_validos", sql`${t.taxa} >= 0 AND ${t.tempoEstimadoMin} >= 0`)],
);
