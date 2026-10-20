import "server-only";
import { custoUnitarioInsumo, type GrupoComplemento } from "@delivery/core";
import { asc, db, schema } from "@delivery/db";
import { custosDasReceitas, listarInsumos, listarReceitas, obterParametros } from "../receitas/dados";
import type { DadosCusto } from "./margens";

export { calcularMargens, type DadosCusto, type MargemCanal } from "./margens";

export interface Categoria {
  id: string;
  nome: string;
  ordem: number;
  ativo: boolean;
}

export interface Produto {
  id: string;
  categoriaId: string;
  nome: string;
  descricao: string | null;
  preco: number;
  ativo: boolean;
  esgotado: boolean;
  destaque: boolean;
  ordem: number;
  receitaId: string | null;
  quantidadeReceita: number | null;
  fotoUrl: string | null;
  precosCanal: Record<string, number>;
  embalagens: { insumoId: string; quantidade: number }[];
  grupoIds: string[];
}

export function urlFoto(produtoId: string, atualizadaEm: Date | null): string | null {
  return atualizadaEm ? `/api/fotos/produto/${produtoId}?v=${atualizadaEm.getTime()}` : null;
}

export async function listarCategorias(): Promise<Categoria[]> {
  return db
    .select({ id: schema.categorias.id, nome: schema.categorias.nome, ordem: schema.categorias.ordem, ativo: schema.categorias.ativo })
    .from(schema.categorias)
    .orderBy(asc(schema.categorias.ordem), asc(schema.categorias.nome));
}

export async function listarProdutos(): Promise<Produto[]> {
  const [produtos, precos, embalagens, grupos] = await Promise.all([
    db.select().from(schema.produtos).orderBy(asc(schema.produtos.ordem), asc(schema.produtos.nome)),
    db.select().from(schema.produtoPrecos),
    db.select().from(schema.produtoEmbalagens),
    db.select().from(schema.produtoGrupos).orderBy(asc(schema.produtoGrupos.ordem)),
  ]);
  return produtos.map((p) => ({
    id: p.id,
    categoriaId: p.categoriaId,
    nome: p.nome,
    descricao: p.descricao,
    preco: p.preco,
    ativo: p.ativo,
    esgotado: p.esgotado,
    destaque: p.destaque,
    ordem: p.ordem,
    receitaId: p.receitaId,
    quantidadeReceita: p.quantidadeReceita,
    fotoUrl: urlFoto(p.id, p.fotoAtualizadaEm),
    precosCanal: Object.fromEntries(precos.filter((x) => x.produtoId === p.id).map((x) => [x.canalId, x.preco])),
    embalagens: embalagens.filter((x) => x.produtoId === p.id).map((x) => ({ insumoId: x.insumoId, quantidade: x.quantidade })),
    grupoIds: grupos.filter((x) => x.produtoId === p.id).map((x) => x.grupoId),
  }));
}

export async function listarGrupos(): Promise<GrupoComplemento[]> {
  const [grupos, opcoes] = await Promise.all([
    db.select().from(schema.gruposComplementos).orderBy(asc(schema.gruposComplementos.nome)),
    db.select().from(schema.opcoesComplementos).orderBy(asc(schema.opcoesComplementos.ordem)),
  ]);
  return grupos.map((g) => ({
    id: g.id,
    nome: g.nome,
    minimo: g.minimo,
    maximo: g.maximo,
    opcoes: opcoes
      .filter((o) => o.grupoId === g.id)
      .map((o) => ({ id: o.id, nome: o.nome, precoAdicional: o.precoAdicional, esgotado: o.esgotado })),
  }));
}

/** Dados de custo usados para mostrar a margem dos produtos. */
export async function carregarCustos(): Promise<DadosCusto> {
  const [receitas, insumos, parametros] = await Promise.all([listarReceitas(), listarInsumos(), obterParametros()]);
  const custos = custosDasReceitas(receitas, insumos);
  return {
    receitas: receitas.map((r) => ({
      id: r.id,
      nome: r.nome,
      unidade: r.unidadeRendimento,
      custoPorUnidade: custos.get(r.id)?.porUnidade ?? null,
    })),
    embalagens: insumos
      .filter((i) => i.tipo === "embalagem")
      .map((i) => ({ id: i.id, nome: i.nome, unidade: i.unidade, custoUnitario: custoUnitarioInsumo(i) })),
    // Canal da loja própria sempre primeiro.
    canais: parametros.canais
      .filter((c) => c.ativo)
      .sort((a, b) => Number(b.principal) - Number(a.principal))
      .map((c) => ({ id: c.id, nome: c.nome, taxa: c.taxaPercentual, principal: c.principal })),
    custosFixosPercentual: parametros.custosFixosPercentual,
    margemDesejada: parametros.margemDesejadaPercentual,
  };
}
