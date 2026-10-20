import { custoProduto, resultadoVenda, type Unidade } from "@delivery/core";

export interface DadosCusto {
  receitas: { id: string; nome: string; unidade: Unidade; custoPorUnidade: number | null }[];
  embalagens: { id: string; nome: string; unidade: Unidade; custoUnitario: number }[];
  /** Canal da loja própria primeiro. */
  canais: { id: string; nome: string; taxa: number; principal: boolean }[];
  custosFixosPercentual: number;
  margemDesejada: number;
}

export interface MargemCanal {
  canalId: string;
  canal: string;
  preco: number;
  margemPercentual: number;
  lucro: number;
}

export interface DadosMargem {
  preco: number;
  receitaId: string | null;
  quantidadeReceita: number | null;
  embalagens: { insumoId: string; quantidade: number }[];
  precosCanal: Record<string, number>;
}

/** Custo e margem do produto em cada canal ativo; `null` sem receita vinculada. */
export function calcularMargens(produto: DadosMargem, custos: DadosCusto): { custo: number; canais: MargemCanal[] } | null {
  const receita = produto.receitaId ? custos.receitas.find((r) => r.id === produto.receitaId) : undefined;
  if (!receita || !produto.quantidadeReceita) return null;
  const custoEmbalagens = produto.embalagens.reduce((soma, e) => {
    const embalagem = custos.embalagens.find((x) => x.id === e.insumoId);
    return soma + (embalagem ? embalagem.custoUnitario * e.quantidade : 0);
  }, 0);
  const custo = custoProduto(receita.custoPorUnidade, produto.quantidadeReceita, custoEmbalagens);
  if (custo === null) return null;
  return {
    custo,
    canais: custos.canais.map((canal) => {
      const preco = canal.principal ? produto.preco : (produto.precosCanal[canal.id] ?? produto.preco);
      const r = resultadoVenda(preco, {
        custoVariavel: custo,
        taxaCanalPercentual: canal.taxa,
        custosFixosPercentual: custos.custosFixosPercentual,
      });
      return { canalId: canal.id, canal: canal.nome, preco, margemPercentual: r.margemPercentual, lucro: r.lucro };
    }),
  };
}
