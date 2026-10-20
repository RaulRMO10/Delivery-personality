import "server-only";
import type { GrupoComplemento, ProdutoVenda } from "@delivery/core";
import { and, asc, db, eq, inArray, schema } from "@delivery/db";

export interface ProdutoPublico {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  disponivel: boolean;
  destaque: boolean;
  fotoUrl: string | null;
  grupos: GrupoComplemento[];
}

export interface CategoriaPublica {
  id: string;
  nome: string;
  produtos: ProdutoPublico[];
}

function urlFoto(id: string, atualizadaEm: Date | null) {
  return atualizadaEm ? `/api/fotos/produto/${id}?v=${atualizadaEm.getTime()}` : null;
}

async function carregarGrupos(produtoIds: string[]) {
  if (produtoIds.length === 0) return new Map<string, GrupoComplemento[]>();
  const vinculos = await db
    .select()
    .from(schema.produtoGrupos)
    .where(inArray(schema.produtoGrupos.produtoId, produtoIds))
    .orderBy(asc(schema.produtoGrupos.ordem));
  const grupoIds = [...new Set(vinculos.map((v) => v.grupoId))];
  const [grupos, opcoes] = grupoIds.length
    ? await Promise.all([
        db.select().from(schema.gruposComplementos).where(inArray(schema.gruposComplementos.id, grupoIds)),
        db.select().from(schema.opcoesComplementos).where(inArray(schema.opcoesComplementos.grupoId, grupoIds)).orderBy(asc(schema.opcoesComplementos.ordem)),
      ])
    : [[], []];
  const porId = new Map(
    grupos.map((g) => [
      g.id,
      {
        id: g.id,
        nome: g.nome,
        minimo: g.minimo,
        maximo: g.maximo,
        opcoes: opcoes.filter((o) => o.grupoId === g.id).map((o) => ({ id: o.id, nome: o.nome, precoAdicional: o.precoAdicional, esgotado: o.esgotado })),
      } satisfies GrupoComplemento,
    ]),
  );
  const resultado = new Map<string, GrupoComplemento[]>();
  for (const v of vinculos) {
    const grupo = porId.get(v.grupoId);
    if (grupo) resultado.set(v.produtoId, [...(resultado.get(v.produtoId) ?? []), grupo]);
  }
  return resultado;
}

/** Cardápio visível ao cliente: categorias e produtos ativos, na ordem definida no painel. */
export async function carregarCardapioPublico(): Promise<CategoriaPublica[]> {
  const [categorias, produtos] = await Promise.all([
    db.select().from(schema.categorias).where(eq(schema.categorias.ativo, true)).orderBy(asc(schema.categorias.ordem), asc(schema.categorias.nome)),
    db.select().from(schema.produtos).where(eq(schema.produtos.ativo, true)).orderBy(asc(schema.produtos.ordem), asc(schema.produtos.nome)),
  ]);
  const grupos = await carregarGrupos(produtos.map((p) => p.id));
  return categorias
    .map((c) => ({
      id: c.id,
      nome: c.nome,
      produtos: produtos
        .filter((p) => p.categoriaId === c.id)
        .map((p) => ({
          id: p.id,
          nome: p.nome,
          descricao: p.descricao,
          preco: p.preco,
          disponivel: !p.esgotado,
          destaque: p.destaque,
          fotoUrl: urlFoto(p.id, p.fotoAtualizadaEm),
          grupos: grupos.get(p.id) ?? [],
        })),
    }))
    .filter((c) => c.produtos.length > 0);
}

/** Produtos com os dados atuais do banco, para recalcular o pedido no servidor. */
export async function produtosParaVenda(ids: string[]): Promise<Map<string, ProdutoVenda>> {
  const unicos = [...new Set(ids)];
  if (unicos.length === 0) return new Map();
  const linhas = await db
    .select({ produto: schema.produtos, categoriaAtiva: schema.categorias.ativo })
    .from(schema.produtos)
    .innerJoin(schema.categorias, eq(schema.produtos.categoriaId, schema.categorias.id))
    .where(and(inArray(schema.produtos.id, unicos)));
  const grupos = await carregarGrupos(linhas.map((l) => l.produto.id));
  return new Map(
    linhas.map(({ produto, categoriaAtiva }) => [
      produto.id,
      {
        id: produto.id,
        nome: produto.nome,
        preco: produto.preco,
        disponivel: produto.ativo && !produto.esgotado && categoriaAtiva,
        grupos: grupos.get(produto.id) ?? [],
      },
    ]),
  );
}
