import "server-only";
import { and, db, eq, lt, schema } from "@delivery/db";
import { consultarPagamento, criarCobrancaPix, MINUTOS_VALIDADE_PIX } from "./mercadopago";
import { mudarStatusPedido } from "./pedidos";

/** Gera a cobrança Pix online do pedido e guarda o QR Code. */
export async function gerarCobranca(pedido: { id: string; numero: number; total: number }) {
  const cobranca = await criarCobrancaPix(pedido);
  await db.insert(schema.pagamentosOnline).values({ pedidoId: pedido.id, provedor: "mercadopago", ...cobranca });
  await db.update(schema.pedidos).set({ pagamentoExternoId: cobranca.externoId }).where(eq(schema.pedidos.id, pedido.id));
  return cobranca;
}

/**
 * Consulta o pagamento no provedor e, se aprovado com o valor certo, marca o pedido como pago
 * e o coloca na fila. Pode ser chamada várias vezes (webhook e consulta da página).
 */
export async function sincronizarPagamento(externoId: string): Promise<"pago" | "pendente" | "ignorado"> {
  const [registro] = await db
    .select()
    .from(schema.pagamentosOnline)
    .where(and(eq(schema.pagamentosOnline.provedor, "mercadopago"), eq(schema.pagamentosOnline.externoId, externoId)));
  if (!registro) return "ignorado";

  const pagamento = await consultarPagamento(externoId);
  await db.update(schema.pagamentosOnline).set({ status: pagamento.status }).where(eq(schema.pagamentosOnline.id, registro.id));
  if (pagamento.status !== "approved" || pagamento.external_reference !== registro.pedidoId) return "pendente";

  const [pedido] = await db.select().from(schema.pedidos).where(eq(schema.pedidos.id, registro.pedidoId));
  if (!pedido) return "ignorado";
  if (Math.round((pagamento.transaction_amount ?? 0) * 100) !== pedido.total) {
    console.error(`Valor pago diverge do pedido #${pedido.numero}`);
    return "pendente";
  }
  if (pedido.statusPagamento !== "pago") {
    await db.update(schema.pedidos).set({ statusPagamento: "pago" }).where(eq(schema.pedidos.id, pedido.id));
  }
  if (pedido.status === "aguardando_pagamento") {
    await mudarStatusPedido({ pedidoId: pedido.id, para: "recebido", usuario: null, externo: true });
  }
  return "pago";
}

/** Cancela pedidos com Pix online não pago dentro da validade. */
export async function expirarPagamentosPendentes() {
  const limite = new Date(Date.now() - (MINUTOS_VALIDADE_PIX + 5) * 60_000);
  const vencidos = await db
    .select({ id: schema.pedidos.id })
    .from(schema.pedidos)
    .where(and(eq(schema.pedidos.status, "aguardando_pagamento"), lt(schema.pedidos.criadoEm, limite)));
  for (const { id } of vencidos) {
    await mudarStatusPedido({ pedidoId: id, para: "cancelado", usuario: null, externo: true, motivo: "Pagamento não confirmado no prazo." });
  }
}
