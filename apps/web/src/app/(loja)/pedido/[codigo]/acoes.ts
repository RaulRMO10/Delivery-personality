"use server";

import { calcularPedido } from "@delivery/core";
import { asc, db, eq, schema } from "@delivery/db";
import { produtosParaVenda } from "@/lib/cardapio-publico";

export interface ItemRepetido {
  produtoId: string;
  nome: string;
  precoUnitario: number;
  quantidade: number;
  escolhas: { grupoId: string; opcaoId: string; quantidade: number }[];
  resumoOpcoes: string;
  observacao: string;
}

/** Itens do pedido com preços e disponibilidade atuais; os indisponíveis ficam de fora. */
export async function itensParaRepetir(codigo: string): Promise<{ itens: ItemRepetido[]; indisponiveis: number }> {
  if (!/^[A-Za-z0-9_-]{8,32}$/.test(codigo)) return { itens: [], indisponiveis: 0 };
  const [pedido] = await db.select({ id: schema.pedidos.id }).from(schema.pedidos).where(eq(schema.pedidos.codigo, codigo));
  if (!pedido) return { itens: [], indisponiveis: 0 };

  const originais = await db.select().from(schema.pedidoItens).where(eq(schema.pedidoItens.pedidoId, pedido.id)).orderBy(asc(schema.pedidoItens.ordem));
  const produtos = await produtosParaVenda(originais.flatMap((i) => (i.produtoId ? [i.produtoId] : [])));

  const itens: ItemRepetido[] = [];
  for (const original of originais) {
    if (!original.produtoId) continue;
    const item = { produtoId: original.produtoId, quantidade: original.quantidade, escolhas: original.escolhas, observacao: original.observacao ?? undefined };
    const calculo = calcularPedido([item], produtos, { tipo: "retirada", taxaBairro: 0, freteGratisAcima: null, pedidoMinimo: 0 });
    if (!calculo.ok) continue;
    const calculado = calculo.itens[0]!;
    itens.push({
      produtoId: calculado.produtoId,
      nome: calculado.nome,
      precoUnitario: calculado.precoUnitario,
      quantidade: calculado.quantidade,
      escolhas: calculado.escolhas,
      resumoOpcoes: calculado.opcoes.map((o) => (o.quantidade > 1 ? `${o.quantidade}× ${o.opcao}` : o.opcao)).join(", "),
      observacao: calculado.observacao ?? "",
    });
  }
  return { itens, indisponiveis: originais.length - itens.length };
}
