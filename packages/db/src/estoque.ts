import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { ErroCalculo, consumoDeInsumos, type ItemReceita, type Receita, type Unidade } from "@delivery/core";
import { db } from "./index";
import * as schema from "./schema";

/**
 * Baixa do estoque os insumos consumidos por um pedido entregue (receitas e embalagens
 * dos produtos), só para insumos com controle de estoque. Executa uma única vez por pedido.
 */
export async function baixarEstoqueDoPedido(pedidoId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [marcado] = await tx
      .update(schema.pedidos)
      .set({ estoqueBaixado: true })
      .where(and(eq(schema.pedidos.id, pedidoId), eq(schema.pedidos.estoqueBaixado, false)))
      .returning({ id: schema.pedidos.id });
    if (!marcado) return;

    const itens = await tx.select().from(schema.pedidoItens).where(eq(schema.pedidoItens.pedidoId, pedidoId));
    const produtoIds = [...new Set(itens.flatMap((i) => (i.produtoId ? [i.produtoId] : [])))];
    if (produtoIds.length === 0) return;

    const [produtos, embalagens, receitas, itensReceita, controlados] = await Promise.all([
      tx.select().from(schema.produtos).where(inArray(schema.produtos.id, produtoIds)),
      tx.select().from(schema.produtoEmbalagens).where(inArray(schema.produtoEmbalagens.produtoId, produtoIds)),
      tx.select().from(schema.receitas),
      tx.select().from(schema.receitaItens).orderBy(asc(schema.receitaItens.ordem)),
      tx.select({ id: schema.insumos.id }).from(schema.insumos).where(eq(schema.insumos.controlarEstoque, true)),
    ]);
    if (controlados.length === 0) return;

    const mapaReceitas = new Map<string, Receita>(
      receitas.map((r) => [
        r.id,
        {
          id: r.id,
          rendimento: r.rendimento,
          unidadeRendimento: r.unidadeRendimento as Unidade,
          perdaPercentual: r.perdaPercentual,
          itens: itensReceita
            .filter((i) => i.receitaId === r.id)
            .map(
              (i): ItemReceita =>
                i.insumoId ? { tipo: "insumo", insumoId: i.insumoId, quantidade: i.quantidade } : { tipo: "receita", receitaId: i.subReceitaId!, quantidade: i.quantidade },
            ),
        },
      ]),
    );

    const consumo = new Map<string, number>();
    const somar = (insumoId: string, quantidade: number) => consumo.set(insumoId, (consumo.get(insumoId) ?? 0) + quantidade);
    for (const item of itens) {
      const produto = produtos.find((p) => p.id === item.produtoId);
      if (!produto) continue;
      if (produto.receitaId && produto.quantidadeReceita) {
        try {
          for (const [insumoId, qtd] of consumoDeInsumos(produto.receitaId, produto.quantidadeReceita * item.quantidade, mapaReceitas)) somar(insumoId, qtd);
        } catch (erro) {
          if (!(erro instanceof ErroCalculo)) throw erro;
        }
      }
      for (const e of embalagens.filter((x) => x.produtoId === produto.id)) somar(e.insumoId, e.quantidade * item.quantidade);
    }

    const ids = new Set(controlados.map((c) => c.id));
    for (const [insumoId, quantidade] of consumo) {
      if (!ids.has(insumoId) || quantidade <= 0) continue;
      const arredondada = Math.round(quantidade * 1000) / 1000;
      await tx.insert(schema.movimentosEstoque).values({ insumoId, tipo: "venda", quantidade: -arredondada, pedidoId });
      await tx
        .update(schema.insumos)
        .set({ estoqueAtual: sql`${schema.insumos.estoqueAtual} - ${arredondada}` })
        .where(eq(schema.insumos.id, insumoId));
    }
  });
}
