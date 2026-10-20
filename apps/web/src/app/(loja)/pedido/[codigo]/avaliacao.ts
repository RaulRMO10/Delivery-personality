"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, eq, schema } from "@delivery/db";
import { dentroDoLimite, ipDaRequisicao } from "@/lib/limite";

const esquema = z.object({
  codigo: z.string().regex(/^[A-Za-z0-9_-]{8,32}$/),
  nota: z.number().int().min(1).max(5),
  comentario: z.string().trim().max(500).optional(),
});

/** Avaliação do pedido pelo cliente (só após a entrega, uma vez). */
export async function avaliarPedido(dados: z.input<typeof esquema>): Promise<{ ok: boolean; mensagem?: string }> {
  if (!(await dentroDoLimite(`avaliacao:${await ipDaRequisicao()}`, 10, 3600))) return { ok: false, mensagem: "Tente novamente mais tarde." };
  const validacao = esquema.safeParse(dados);
  if (!validacao.success) return { ok: false, mensagem: "Escolha uma nota de 1 a 5." };
  const [pedido] = await db.select({ id: schema.pedidos.id, status: schema.pedidos.status }).from(schema.pedidos).where(eq(schema.pedidos.codigo, validacao.data.codigo));
  if (!pedido || pedido.status !== "entregue") return { ok: false, mensagem: "Avaliação disponível após a entrega." };
  await db
    .insert(schema.avaliacoes)
    .values({ pedidoId: pedido.id, nota: validacao.data.nota, comentario: validacao.data.comentario || null })
    .onConflictDoNothing();
  revalidatePath(`/pedido/${validacao.data.codigo}`);
  return { ok: true };
}
