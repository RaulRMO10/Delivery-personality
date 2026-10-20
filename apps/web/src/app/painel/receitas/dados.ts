import "server-only";
import {
  ErroCalculo,
  calcularCustoReceita,
  percentualCustosFixos,
  type Insumo,
  type ItemReceita,
  type Receita,
  type TipoInsumo,
  type Unidade,
} from "@delivery/core";
import { asc, db, eq, schema } from "@delivery/db";

export interface InsumoLista extends Insumo {
  tipo: TipoInsumo;
  nome: string;
  fornecedor: string | null;
  precoAtualizadoEm: Date;
}

export interface ReceitaCompleta extends Receita {
  nome: string;
  tempoPreparoMin: number | null;
  modoPreparo: string | null;
}

export async function listarInsumos(tipo?: TipoInsumo): Promise<InsumoLista[]> {
  const linhas = await db
    .select()
    .from(schema.insumos)
    .where(tipo ? eq(schema.insumos.tipo, tipo) : undefined)
    .orderBy(asc(schema.insumos.nome));
  return linhas.map((i) => ({
    id: i.id,
    tipo: i.tipo,
    nome: i.nome,
    unidade: i.unidade,
    quantidadeEmbalagem: i.quantidadeEmbalagem,
    precoEmbalagem: i.precoEmbalagem,
    fornecedor: i.fornecedor,
    precoAtualizadoEm: i.precoAtualizadoEm,
  }));
}

export async function listarReceitas(): Promise<ReceitaCompleta[]> {
  const [receitas, itens] = await Promise.all([
    db.select().from(schema.receitas).orderBy(asc(schema.receitas.nome)),
    db.select().from(schema.receitaItens).orderBy(asc(schema.receitaItens.ordem)),
  ]);
  return receitas.map((r) => ({
    id: r.id,
    nome: r.nome,
    rendimento: r.rendimento,
    unidadeRendimento: r.unidadeRendimento as Unidade,
    perdaPercentual: r.perdaPercentual,
    tempoPreparoMin: r.tempoPreparoMin,
    modoPreparo: r.modoPreparo,
    itens: itens
      .filter((i) => i.receitaId === r.id)
      .map(
        (i): ItemReceita =>
          i.insumoId
            ? { tipo: "insumo", insumoId: i.insumoId, quantidade: i.quantidade }
            : { tipo: "receita", receitaId: i.subReceitaId!, quantidade: i.quantidade },
      ),
  }));
}

export function mapaPorId<T extends { id: string }>(itens: T[]): Map<string, T> {
  return new Map(itens.map((i) => [i.id, i]));
}

/** Custo de cada receita; `null` quando o cálculo não é possível (ex.: dados incompletos). */
export function custosDasReceitas(receitas: ReceitaCompleta[], insumos: InsumoLista[]) {
  const mapaReceitas = mapaPorId(receitas);
  const mapaInsumos = mapaPorId(insumos);
  return new Map(
    receitas.map((r) => {
      try {
        return [r.id, calcularCustoReceita(r.id, mapaReceitas, mapaInsumos)] as const;
      } catch (erro) {
        if (erro instanceof ErroCalculo) return [r.id, null] as const;
        throw erro;
      }
    }),
  );
}

export async function obterParametros() {
  const [parametros, custos, canais] = await Promise.all([
    db.select().from(schema.parametrosPrecificacao).where(eq(schema.parametrosPrecificacao.id, 1)),
    db.select().from(schema.custosFixos).orderBy(asc(schema.custosFixos.nome)),
    db.select().from(schema.canaisVenda).orderBy(asc(schema.canaisVenda.nome)),
  ]);
  const geral = parametros[0] ?? { faturamentoMensalEstimado: 0, margemDesejadaPercentual: 30 };
  const totalCustosFixos = custos.reduce((soma, c) => soma + c.valorMensal, 0);
  return {
    faturamentoMensalEstimado: geral.faturamentoMensalEstimado,
    margemDesejadaPercentual: geral.margemDesejadaPercentual,
    custos,
    totalCustosFixos,
    custosFixosPercentual: percentualCustosFixos(totalCustosFixos, geral.faturamentoMensalEstimado),
    canais,
  };
}
