import "server-only";
import {
  aplicarCupom,
  descontoFidelidade,
  descreverCupom,
  descreverRecompensa,
  melhorDesconto,
  normalizarCodigoCupom,
  progressoFidelidade,
  type Desconto,
  type ProgressoFidelidade,
  type RegraFidelidade,
} from "@delivery/core";
import { db, eq, schema, sql } from "@delivery/db";

export interface DescontoCalculado {
  desconto: Desconto | null;
  cupomId: string | null;
  codigoCupom: string | null;
  recompensaFidelidade: boolean;
  mensagem: string | null;
  erroCupom: string | null;
  fidelidade: ProgressoFidelidade | null;
}

/** Pedidos entregues do cliente depois da última recompensa usada. */
export async function progressoDoCliente(regra: RegraFidelidade, clienteId: string | null): Promise<ProgressoFidelidade | null> {
  if (!clienteId || !regra.ativa) return null;
  const [linha] = await db.execute<{ total: string }>(sql`
    SELECT count(*) AS total FROM pedidos
    WHERE cliente_id = ${clienteId} AND status = 'entregue'
      AND criado_em > coalesce((
        SELECT max(criado_em) FROM pedidos
        WHERE cliente_id = ${clienteId} AND recompensa_fidelidade AND status <> 'cancelado'
      ), '-infinity'::timestamptz)
  `);
  return progressoFidelidade(regra, Number(linha?.total ?? 0));
}

/**
 * Desconto aplicável ao pedido: cupom informado e/ou recompensa de fidelidade.
 * Não acumulam; vale o de maior economia.
 */
export async function calcularDescontos(opcoes: {
  telefone: string | null;
  codigoCupom: string | null;
  subtotal: number;
  taxaEntrega: number;
  regra: RegraFidelidade;
}): Promise<DescontoCalculado> {
  const cliente = opcoes.telefone
    ? (await db.select({ id: schema.clientes.id }).from(schema.clientes).where(eq(schema.clientes.telefone, opcoes.telefone)))[0]
    : undefined;
  const clienteId = cliente?.id ?? null;

  let descontoCupom: Desconto | null = null;
  let cupomId: string | null = null;
  let codigo: string | null = null;
  let erroCupom: string | null = null;
  let descricaoCupom = "";

  if (opcoes.codigoCupom?.trim()) {
    codigo = normalizarCodigoCupom(opcoes.codigoCupom);
    const [cupom] = await db.select().from(schema.cupons).where(eq(schema.cupons.codigo, codigo));
    if (!cupom) {
      erroCupom = "Cupom inválido.";
    } else {
      const [uso] = await db.execute<{ totais: string; cliente: string; pedidos: string }>(sql`
        SELECT
          count(*) FILTER (WHERE cupom_id = ${cupom.id}) AS totais,
          count(*) FILTER (WHERE cupom_id = ${cupom.id} AND cliente_id = ${clienteId}) AS cliente,
          count(*) FILTER (WHERE cliente_id = ${clienteId}) AS pedidos
        FROM pedidos WHERE status <> 'cancelado'
      `);
      const resultado = aplicarCupom(cupom, {
        agora: new Date(),
        subtotal: opcoes.subtotal,
        usosTotais: Number(uso?.totais ?? 0),
        usosDoCliente: Number(uso?.cliente ?? 0),
        pedidosDoCliente: Number(uso?.pedidos ?? 0),
      });
      if (resultado.ok) {
        descontoCupom = resultado.desconto;
        cupomId = cupom.id;
        descricaoCupom = descreverCupom(cupom);
      } else {
        erroCupom = resultado.erro;
      }
    }
  }

  const fidelidade = await progressoDoCliente(opcoes.regra, clienteId);
  const descontoRecompensa = fidelidade?.disponivel ? descontoFidelidade(opcoes.regra, opcoes.subtotal) : null;

  const escolha = melhorDesconto(descontoCupom, descontoRecompensa, opcoes.taxaEntrega);
  if (escolha === "a") {
    return { desconto: descontoCupom, cupomId, codigoCupom: codigo, recompensaFidelidade: false, mensagem: `Cupom ${codigo}: ${descricaoCupom}`, erroCupom, fidelidade };
  }
  if (escolha === "b") {
    return {
      desconto: descontoRecompensa,
      cupomId: null,
      codigoCupom: null,
      recompensaFidelidade: true,
      mensagem: `Recompensa de fidelidade: ${descreverRecompensa(opcoes.regra)}`,
      erroCupom: descontoCupom ? "A recompensa de fidelidade é maior e foi aplicada no lugar do cupom." : erroCupom,
      fidelidade,
    };
  }
  return { desconto: null, cupomId: null, codigoCupom: null, recompensaFidelidade: false, mensagem: null, erroCupom, fidelidade };
}
