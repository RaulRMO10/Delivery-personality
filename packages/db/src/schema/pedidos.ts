import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { bairros } from "./loja";
import { produtos } from "./cardapio";

export const clientes = pgTable(
  "clientes",
  {
    id: uuid().primaryKey().defaultRandom(),
    nome: text().notNull(),
    /** Somente dígitos, sem o 55. */
    telefone: text().notNull(),
    email: text(),
    dataNascimento: date({ mode: "string" }),
    aceitaMarketing: boolean().notNull().default(false),
    observacoes: text(),
    criadoEm: timestamp({ withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex().on(t.telefone)],
);

export interface EnderecoEntrega {
  bairro: string;
  rua: string;
  numero: string;
  complemento: string | null;
  referencia: string | null;
}

export const pedidos = pgTable(
  "pedidos",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Número exibido ao cliente e na cozinha. */
    numero: serial().notNull(),
    /** Código público e imprevisível para acompanhar o pedido. */
    codigo: text().notNull(),
    canal: text({ enum: ["site", "whatsapp", "telefone", "ifood", "99food"] }).notNull(),
    idExterno: text(),
    codigoExterno: text(),
    clienteId: uuid().references(() => clientes.id, { onDelete: "set null" }),
    nomeCliente: text().notNull(),
    telefoneCliente: text(),
    tipo: text({ enum: ["entrega", "retirada"] }).notNull(),
    bairroId: uuid().references(() => bairros.id, { onDelete: "set null" }),
    endereco: jsonb().$type<EnderecoEntrega>(),
    status: text({
      enum: ["aguardando_pagamento", "recebido", "confirmado", "em_preparo", "pronto", "saiu_para_entrega", "entregue", "cancelado"],
    }).notNull(),
    agendadoPara: timestamp({ withTimezone: true }),
    previsaoEm: timestamp({ withTimezone: true }),
    subtotal: integer().notNull(),
    taxaEntrega: integer().notNull().default(0),
    desconto: integer().notNull().default(0),
    total: integer().notNull(),
    formaPagamento: text({ enum: ["pix", "pix_online", "dinheiro", "cartao", "online"] }).notNull(),
    trocoPara: integer(),
    statusPagamento: text({ enum: ["pendente", "pago", "estornado"] }).notNull().default("pendente"),
    pagamentoExternoId: text(),
    observacao: text(),
    motivoCancelamento: text(),
    ip: text(),
    criadoEm: timestamp({ withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex().on(t.codigo),
    uniqueIndex("pedidos_externo_unico").on(t.canal, t.idExterno).where(sql`${t.idExterno} IS NOT NULL`),
    index().on(t.status, t.criadoEm),
    index().on(t.criadoEm),
    index().on(t.agendadoPara),
    index().on(t.clienteId),
    check("pedidos_valores_validos", sql`${t.subtotal} >= 0 AND ${t.taxaEntrega} >= 0 AND ${t.desconto} >= 0 AND ${t.total} >= 0`),
  ],
);

/** Itens com nome e preço do momento da compra. */
export const pedidoItens = pgTable(
  "pedido_itens",
  {
    id: uuid().primaryKey().defaultRandom(),
    pedidoId: uuid()
      .notNull()
      .references(() => pedidos.id, { onDelete: "cascade" }),
    produtoId: uuid().references(() => produtos.id, { onDelete: "set null" }),
    nome: text().notNull(),
    precoUnitario: integer().notNull(),
    quantidade: integer().notNull(),
    observacao: text(),
    opcoes: jsonb().$type<{ grupo: string; opcao: string; quantidade: number; precoAdicional: number }[]>().notNull().default([]),
    ordem: integer().notNull().default(0),
  },
  (t) => [index().on(t.pedidoId), index().on(t.produtoId), check("pedido_itens_quantidade_positiva", sql`${t.quantidade} > 0`)],
);

export const pedidoHistorico = pgTable(
  "pedido_historico",
  {
    id: uuid().primaryKey().defaultRandom(),
    pedidoId: uuid()
      .notNull()
      .references(() => pedidos.id, { onDelete: "cascade" }),
    status: text().notNull(),
    usuarioId: text().references(() => user.id, { onDelete: "set null" }),
    observacao: text(),
    criadoEm: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.pedidoId)],
);

/** Cobrança Pix online gerada no provedor de pagamento. */
export const pagamentosOnline = pgTable(
  "pagamentos_online",
  {
    id: uuid().primaryKey().defaultRandom(),
    pedidoId: uuid()
      .notNull()
      .references(() => pedidos.id, { onDelete: "cascade" }),
    provedor: text().notNull(),
    externoId: text().notNull(),
    status: text().notNull(),
    qrCode: text(),
    qrCodeBase64: text(),
    expiraEm: timestamp({ withTimezone: true }),
    criadoEm: timestamp({ withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index().on(t.pedidoId), uniqueIndex().on(t.provedor, t.externoId)],
);

/** Contador simples para limitar abusos em ações públicas (ex.: criar pedido). */
export const limitesUso = pgTable("limites_uso", {
  chave: text().primaryKey(),
  contagem: integer().notNull(),
  janelaInicio: timestamp({ withTimezone: true }).notNull(),
});
