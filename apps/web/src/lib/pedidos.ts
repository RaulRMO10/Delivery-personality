import "server-only";
import { pedidoEncerrado, perfilPodeMudarStatus, type Perfil, type StatusPedido } from "@delivery/core";
import { and, asc, db, desc, eq, inArray, schema, sql } from "@delivery/db";

export type Pedido = typeof schema.pedidos.$inferSelect;
export type ItemPedido = typeof schema.pedidoItens.$inferSelect;

export interface PedidoCompleto extends Pedido {
  itens: ItemPedido[];
  historico: { status: string; criadoEm: Date; usuario: string | null; observacao: string | null }[];
}

async function anexarDetalhes(pedidos: Pedido[]): Promise<PedidoCompleto[]> {
  if (pedidos.length === 0) return [];
  const ids = pedidos.map((p) => p.id);
  const [itens, historico] = await Promise.all([
    db.select().from(schema.pedidoItens).where(inArray(schema.pedidoItens.pedidoId, ids)).orderBy(asc(schema.pedidoItens.ordem)),
    db
      .select({
        pedidoId: schema.pedidoHistorico.pedidoId,
        status: schema.pedidoHistorico.status,
        criadoEm: schema.pedidoHistorico.criadoEm,
        observacao: schema.pedidoHistorico.observacao,
        usuario: schema.user.name,
      })
      .from(schema.pedidoHistorico)
      .leftJoin(schema.user, eq(schema.pedidoHistorico.usuarioId, schema.user.id))
      .where(inArray(schema.pedidoHistorico.pedidoId, ids))
      .orderBy(asc(schema.pedidoHistorico.criadoEm)),
  ]);
  return pedidos.map((p) => ({
    ...p,
    itens: itens.filter((i) => i.pedidoId === p.id),
    historico: historico.filter((h) => h.pedidoId === p.id),
  }));
}

/** Pedidos em andamento e os encerrados nas últimas 24 horas. */
export async function listarPedidosDoPainel(): Promise<PedidoCompleto[]> {
  const pedidos = await db
    .select()
    .from(schema.pedidos)
    .where(
      sql`${schema.pedidos.status} NOT IN ('entregue', 'cancelado') OR ${schema.pedidos.atualizadoEm} > now() - interval '24 hours'`,
    )
    .orderBy(asc(schema.pedidos.criadoEm))
    .limit(300);
  return anexarDetalhes(pedidos);
}

export async function carregarPedido(id: string): Promise<PedidoCompleto | null> {
  const [pedido] = await db.select().from(schema.pedidos).where(eq(schema.pedidos.id, id));
  if (!pedido) return null;
  const [completo] = await anexarDetalhes([pedido]);
  return completo ?? null;
}

export async function ultimosPedidosDoCliente(clienteId: string, limite = 20) {
  return db.select().from(schema.pedidos).where(eq(schema.pedidos.clienteId, clienteId)).orderBy(desc(schema.pedidos.criadoEm)).limit(limite);
}

type Observador = (pedido: Pedido, de: StatusPedido, para: StatusPedido) => Promise<void>;
const observadores: Observador[] = [];

/** Registra uma reação a mudanças de etapa (ex.: avisar o iFood). */
export function aoMudarStatus(observador: Observador) {
  observadores.push(observador);
}

export type ResultadoMudanca = { ok: true; pedido: Pedido } | { ok: false; mensagem: string };

/**
 * Muda a etapa do pedido validando a transição e o perfil.
 * A atualização só acontece se a etapa no banco ainda for a esperada (evita cliques duplicados).
 */
export async function mudarStatusPedido(opcoes: {
  pedidoId: string;
  para: StatusPedido;
  usuario: { id: string; perfil: Perfil } | null;
  motivo?: string | null;
  /** Origem externa (ex.: iFood): dispensa a checagem de perfil e não reenvia ao canal. */
  externo?: boolean;
}): Promise<ResultadoMudanca> {
  const [atual] = await db.select().from(schema.pedidos).where(eq(schema.pedidos.id, opcoes.pedidoId));
  if (!atual) return { ok: false, mensagem: "Pedido não encontrado." };
  const de = atual.status as StatusPedido;
  if (pedidoEncerrado(de)) return { ok: false, mensagem: "Pedido já encerrado." };
  if (!opcoes.externo) {
    if (!opcoes.usuario || !perfilPodeMudarStatus(opcoes.usuario.perfil, de, opcoes.para, atual.tipo)) {
      return { ok: false, mensagem: "Mudança de etapa não permitida." };
    }
  }
  if (opcoes.para === "cancelado" && !opcoes.motivo?.trim()) return { ok: false, mensagem: "Informe o motivo do cancelamento." };

  const pedido = await db.transaction(async (tx) => {
    const [atualizado] = await tx
      .update(schema.pedidos)
      .set({
        status: opcoes.para,
        ...(opcoes.para === "cancelado" ? { motivoCancelamento: opcoes.motivo!.trim().slice(0, 300) } : {}),
      })
      .where(and(eq(schema.pedidos.id, opcoes.pedidoId), eq(schema.pedidos.status, de)))
      .returning();
    if (!atualizado) return null;
    await tx.insert(schema.pedidoHistorico).values({
      pedidoId: opcoes.pedidoId,
      status: opcoes.para,
      usuarioId: opcoes.usuario?.id ?? null,
      observacao: opcoes.para === "cancelado" ? opcoes.motivo!.trim().slice(0, 300) : null,
    });
    return atualizado;
  });
  if (!pedido) return { ok: false, mensagem: "O pedido foi alterado por outra pessoa. Atualize a tela." };

  if (!opcoes.externo) {
    for (const observador of observadores) {
      try {
        await observador(pedido, de, opcoes.para);
      } catch (erro) {
        console.error("Falha ao notificar mudança de etapa", erro);
      }
    }
  }
  return { ok: true, pedido };
}
