/**
 * Cálculo de custos de insumos e receitas.
 * Quantidades sempre na unidade base (g, ml ou un); valores em centavos (podem ter frações).
 */

export const UNIDADES = ["g", "ml", "un"] as const;
export type Unidade = (typeof UNIDADES)[number];

export const NOME_UNIDADE: Record<Unidade, string> = { g: "g", ml: "ml", un: "un" };

/** Unidades de entrada aceitas e seu fator para a unidade base. */
export const UNIDADES_ENTRADA = {
  g: { base: "g", fator: 1 },
  kg: { base: "g", fator: 1000 },
  ml: { base: "ml", fator: 1 },
  l: { base: "ml", fator: 1000 },
  un: { base: "un", fator: 1 },
} as const satisfies Record<string, { base: Unidade; fator: number }>;

export type UnidadeEntrada = keyof typeof UNIDADES_ENTRADA;

export const TIPOS_INSUMO = ["ingrediente", "embalagem"] as const;
export type TipoInsumo = (typeof TIPOS_INSUMO)[number];

export interface Insumo {
  id: string;
  unidade: Unidade;
  quantidadeEmbalagem: number;
  precoEmbalagem: number;
}

export type ItemReceita =
  | { tipo: "insumo"; insumoId: string; quantidade: number }
  | { tipo: "receita"; receitaId: string; quantidade: number };

export interface Receita {
  id: string;
  rendimento: number;
  unidadeRendimento: Unidade;
  perdaPercentual: number;
  itens: ItemReceita[];
}

export class ErroCalculo extends Error {}

export function custoUnitarioInsumo(insumo: Pick<Insumo, "quantidadeEmbalagem" | "precoEmbalagem">): number {
  if (insumo.quantidadeEmbalagem <= 0) throw new ErroCalculo("Quantidade da embalagem deve ser maior que zero.");
  return insumo.precoEmbalagem / insumo.quantidadeEmbalagem;
}

export function rendimentoEfetivo(receita: Pick<Receita, "rendimento" | "perdaPercentual">): number {
  if (receita.rendimento <= 0) throw new ErroCalculo("Rendimento deve ser maior que zero.");
  if (receita.perdaPercentual < 0 || receita.perdaPercentual >= 100) throw new ErroCalculo("Perda deve estar entre 0 e 99%.");
  return receita.rendimento * (1 - receita.perdaPercentual / 100);
}

export interface CustoReceita {
  total: number;
  porUnidade: number;
}

/**
 * Calcula o custo total e por unidade de rendimento de uma receita,
 * resolvendo sub-receitas e recusando referências circulares.
 */
export function calcularCustoReceita(
  receitaId: string,
  receitas: ReadonlyMap<string, Receita>,
  insumos: ReadonlyMap<string, Insumo>,
): CustoReceita {
  const memo = new Map<string, CustoReceita>();

  function calcular(id: string, caminho: readonly string[]): CustoReceita {
    const salvo = memo.get(id);
    if (salvo) return salvo;
    if (caminho.includes(id)) throw new ErroCalculo("Receita usa a si mesma (referência circular).");
    const receita = receitas.get(id);
    if (!receita) throw new ErroCalculo("Receita não encontrada.");

    let total = 0;
    for (const item of receita.itens) {
      if (item.quantidade < 0) throw new ErroCalculo("Quantidade não pode ser negativa.");
      if (item.tipo === "insumo") {
        const insumo = insumos.get(item.insumoId);
        if (!insumo) throw new ErroCalculo("Ingrediente não encontrado.");
        total += custoUnitarioInsumo(insumo) * item.quantidade;
      } else {
        total += calcular(item.receitaId, [...caminho, id]).porUnidade * item.quantidade;
      }
    }
    const resultado = { total, porUnidade: total / rendimentoEfetivo(receita) };
    memo.set(id, resultado);
    return resultado;
  }

  return calcular(receitaId, []);
}

/** Indica se adicionar `subReceitaId` dentro de `receitaId` criaria uma referência circular. */
export function criaCiclo(receitaId: string, subReceitaId: string, receitas: ReadonlyMap<string, Receita>): boolean {
  const pendentes = [subReceitaId];
  const visitadas = new Set<string>();
  while (pendentes.length > 0) {
    const atual = pendentes.pop()!;
    if (atual === receitaId) return true;
    if (visitadas.has(atual)) continue;
    visitadas.add(atual);
    for (const item of receitas.get(atual)?.itens ?? []) {
      if (item.tipo === "receita") pendentes.push(item.receitaId);
    }
  }
  return false;
}

/**
 * Quantidade de cada insumo consumida para produzir `quantidade` unidades de rendimento
 * da receita (considera sub-receitas e perda). Usado na baixa de estoque.
 */
export function consumoDeInsumos(receitaId: string, quantidade: number, receitas: ReadonlyMap<string, Receita>): Map<string, number> {
  const consumo = new Map<string, number>();
  function explodir(id: string, qtd: number, caminho: readonly string[]) {
    if (caminho.includes(id)) throw new ErroCalculo("Receita usa a si mesma (referência circular).");
    const receita = receitas.get(id);
    if (!receita) throw new ErroCalculo("Receita não encontrada.");
    const fator = qtd / rendimentoEfetivo(receita);
    for (const item of receita.itens) {
      const necessario = item.quantidade * fator;
      if (item.tipo === "insumo") consumo.set(item.insumoId, (consumo.get(item.insumoId) ?? 0) + necessario);
      else explodir(item.receitaId, necessario, [...caminho, id]);
    }
  }
  explodir(receitaId, quantidade, []);
  return consumo;
}

/** Custo em uma unidade de leitura fácil: por kg, por litro ou por unidade. */
export function custoReferencia(insumo: Pick<Insumo, "unidade" | "quantidadeEmbalagem" | "precoEmbalagem">): {
  valor: number;
  unidade: "kg" | "l" | "un";
} {
  const unitario = custoUnitarioInsumo(insumo);
  if (insumo.unidade === "g") return { valor: unitario * 1000, unidade: "kg" };
  if (insumo.unidade === "ml") return { valor: unitario * 1000, unidade: "l" };
  return { valor: unitario, unidade: "un" };
}

/** Converte uma quantidade informada (ex.: 1,5 kg) para a unidade base (1500 g). */
export function paraUnidadeBase(quantidade: number, unidade: UnidadeEntrada): { quantidade: number; unidade: Unidade } {
  const { base, fator } = UNIDADES_ENTRADA[unidade];
  return { quantidade: quantidade * fator, unidade: base };
}
