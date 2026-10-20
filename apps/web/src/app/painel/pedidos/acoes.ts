"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { STATUS_PEDIDO } from "@delivery/core";
import { and, db, eq, schema } from "@delivery/db";
import { registrarAtividade } from "@/lib/atividades";
import { mudarStatusPedido } from "@/lib/pedidos";
import { exigirModulo } from "@/lib/sessao";

export type Resultado = { ok: true } | { ok: false; mensagem: string };

export async function alterarStatus(pedidoId: string, para: string, motivo?: string): Promise<Resultado> {
  const usuario = await exigirModulo("pedidos");
  const id = z.uuid().safeParse(pedidoId);
  const destino = z.enum(STATUS_PEDIDO).safeParse(para);
  if (!id.success || !destino.success) return { ok: false, mensagem: "Dados inválidos." };

  const resultado = await mudarStatusPedido({ pedidoId: id.data, para: destino.data, usuario, motivo: motivo ?? null });
  if (!resultado.ok) return resultado;
  if (destino.data === "cancelado") {
    await registrarAtividade({
      usuarioId: usuario.id,
      acao: "pedido.cancelado",
      entidade: "pedido",
      entidadeId: id.data,
      detalhes: { nome: `#${resultado.pedido.numero}`, motivo },
    });
  }
  revalidatePath("/painel/pedidos");
  return { ok: true };
}

export async function marcarPago(pedidoId: string): Promise<Resultado> {
  // Todos os perfis com acesso a pedidos registram pagamento, inclusive o entregador na entrega.
  const usuario = await exigirModulo("pedidos");
  const id = z.uuid().parse(pedidoId);
  const [pedido] = await db
    .update(schema.pedidos)
    .set({ statusPagamento: "pago" })
    .where(and(eq(schema.pedidos.id, id), eq(schema.pedidos.statusPagamento, "pendente")))
    .returning({ numero: schema.pedidos.numero, status: schema.pedidos.status });
  if (!pedido) return { ok: false, mensagem: "Pagamento já registrado." };
  await registrarAtividade({ usuarioId: usuario.id, acao: "pedido.pago", entidade: "pedido", entidadeId: id, detalhes: { nome: `#${pedido.numero}` } });
  // Pix online confirmado manualmente: o pedido entra na fila.
  if (pedido.status === "aguardando_pagamento") await mudarStatusPedido({ pedidoId: id, para: "recebido", usuario: null, externo: true });
  revalidatePath("/painel/pedidos");
  return { ok: true };
}
