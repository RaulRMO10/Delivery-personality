import { randomBytes } from "node:crypto";
import { pedidoEncerrado, podeMudarStatus, type StatusPedido } from "@delivery/core";
import { and, db, eq, schema } from "@delivery/db";
import { baixarEstoqueDoPedido } from "@delivery/db/estoque";
import { converterPedido, type PedidoIfood } from "@delivery/ifood";

/** Grava o pedido do iFood (uma única vez por id externo). Retorna o id interno. */
export async function importarPedido(original: PedidoIfood): Promise<string> {
  const c = converterPedido(original);
  const [existente] = await db
    .select({ id: schema.pedidos.id })
    .from(schema.pedidos)
    .where(and(eq(schema.pedidos.canal, "ifood"), eq(schema.pedidos.idExterno, c.idExterno)));
  if (existente) return existente.id;

  return db.transaction(async (tx) => {
    const [novo] = await tx
      .insert(schema.pedidos)
      .values({
        codigo: randomBytes(9).toString("base64url"),
        canal: "ifood",
        idExterno: c.idExterno,
        codigoExterno: c.codigoExterno,
        entregaPeloParceiro: c.entregaPeloIfood,
        nomeCliente: c.nomeCliente,
        tipo: c.tipo,
        endereco: c.endereco,
        status: "recebido",
        agendadoPara: c.agendadoPara,
        criadoEm: c.criadoEm,
        subtotal: c.subtotal,
        taxaEntrega: c.taxaEntrega,
        desconto: c.desconto,
        total: c.total,
        formaPagamento: c.formaPagamento,
        statusPagamento: c.statusPagamento,
        trocoPara: c.trocoPara,
        observacao: [c.observacao, c.observacaoContato].filter(Boolean).join(" · ") || null,
      })
      .onConflictDoNothing()
      .returning({ id: schema.pedidos.id });
    if (!novo) {
      // Outra execução gravou ao mesmo tempo.
      const [atual] = await tx
        .select({ id: schema.pedidos.id })
        .from(schema.pedidos)
        .where(and(eq(schema.pedidos.canal, "ifood"), eq(schema.pedidos.idExterno, c.idExterno)));
      return atual!.id;
    }
    if (c.itens.length > 0) {
      await tx.insert(schema.pedidoItens).values(c.itens.map((item, ordem) => ({ pedidoId: novo.id, ...item, ordem })));
    }
    await tx.insert(schema.pedidoHistorico).values({ pedidoId: novo.id, status: "recebido", observacao: "Recebido do iFood" });
    return novo.id;
  });
}

/** Aplica uma mudança de etapa vinda do iFood, se a transição fizer sentido no estado atual. */
export async function aplicarStatusExterno(pedidoId: string, para: StatusPedido, observacao: string): Promise<boolean> {
  const [atual] = await db.select().from(schema.pedidos).where(eq(schema.pedidos.id, pedidoId));
  if (!atual) return false;
  const de = atual.status as StatusPedido;
  if (de === para || pedidoEncerrado(de)) return false;
  // Cancelamento e conclusão valem de qualquer etapa; as demais seguem a ordem normal.
  if (para !== "cancelado" && para !== "entregue" && !podeMudarStatus(de, para, atual.tipo)) return false;

  const aplicado = await db.transaction(async (tx) => {
    const [atualizado] = await tx
      .update(schema.pedidos)
      .set({ status: para, ...(para === "cancelado" ? { motivoCancelamento: observacao } : {}) })
      .where(and(eq(schema.pedidos.id, pedidoId), eq(schema.pedidos.status, de)))
      .returning({ id: schema.pedidos.id });
    if (!atualizado) return false;
    await tx.insert(schema.pedidoHistorico).values({ pedidoId, status: para, observacao });
    return true;
  });
  if (aplicado && para === "entregue") await baixarEstoqueDoPedido(pedidoId).catch((erro) => console.error("Falha na baixa de estoque", erro));
  return aplicado;
}
