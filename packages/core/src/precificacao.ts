/**
 * Formação de preço: preço = custo ÷ (1 − taxa do canal − custos fixos − margem).
 * Percentuais em pontos (ex.: 27 = 27%); valores em centavos.
 */

export interface ParametrosPreco {
  custoVariavel: number;
  taxaCanalPercentual: number;
  custosFixosPercentual: number;
  margemPercentual: number;
}

export type PrecoSugerido = { viavel: true; preco: number } | { viavel: false; motivo: string };

export function percentualCustosFixos(totalMensal: number, faturamentoMensal: number): number {
  if (faturamentoMensal <= 0) return 0;
  return (totalMensal / faturamentoMensal) * 100;
}

export function precoSugerido(p: ParametrosPreco): PrecoSugerido {
  const descontos = p.taxaCanalPercentual + p.custosFixosPercentual + p.margemPercentual;
  if (descontos >= 100) {
    return { viavel: false, motivo: "Taxa, custos fixos e margem somam 100% ou mais." };
  }
  return { viavel: true, preco: p.custoVariavel / (1 - descontos / 100) };
}

export interface ResultadoVenda {
  taxa: number;
  custosFixos: number;
  lucro: number;
  margemPercentual: number;
}

/** Resultado de vender a um preço definido. */
export function resultadoVenda(preco: number, p: Omit<ParametrosPreco, "margemPercentual">): ResultadoVenda {
  const taxa = (preco * p.taxaCanalPercentual) / 100;
  const custosFixos = (preco * p.custosFixosPercentual) / 100;
  const lucro = preco - taxa - custosFixos - p.custoVariavel;
  return { taxa, custosFixos, lucro, margemPercentual: preco > 0 ? (lucro / preco) * 100 : 0 };
}

/** Arredonda para cima ao múltiplo de `passo` centavos (ex.: 50 = R$ 0,50). */
export function arredondarPreco(centavos: number, passo = 50): number {
  return Math.ceil(centavos / passo) * passo;
}
