"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { lerDinheiro, lerNumero, podeEditarCardapio, validarLimitesGrupo } from "@delivery/core";
import { and, asc, db, eq, inArray, schema, sql } from "@delivery/db";
import { registrarAtividade } from "@/lib/atividades";
import { exigirModulo } from "@/lib/sessao";
import { TAMANHO_MAXIMO_FOTO, tipoDaImagem } from "@/lib/foto";

export type Resultado = { ok: true; mensagem?: string } | { ok: false; mensagem: string } | null;
type Falha = { ok: false; mensagem: string };

const CAMINHO = "/painel/cardapio";

async function exigirEditor() {
  const usuario = await exigirModulo("cardapio");
  if (!podeEditarCardapio(usuario.perfil)) throw new Error("Sem permissão para editar o cardápio.");
  return usuario;
}

function erroValidacao(erro: z.ZodError): Falha {
  return { ok: false, mensagem: erro.issues[0]?.message ?? "Dados inválidos." };
}

function emUso(erro: unknown): boolean {
  const causa = (erro as { cause?: { code?: string } })?.cause ?? erro;
  return (causa as { code?: string })?.code === "23503";
}

const texto = (rotulo: string, max = 120) => z.string().trim().min(1, `Informe ${rotulo}.`).max(max);
const dinheiro = (rotulo: string) =>
  z.union([z.string(), z.number()]).transform((v, ctx) => {
    const n = typeof v === "number" ? v : lerDinheiro(v);
    if (n === null || n < 0 || !Number.isInteger(n)) {
      ctx.addIssue({ code: "custom", message: `${rotulo}: valor inválido.` });
      return z.NEVER;
    }
    return n;
  });
const numeroPositivo = (rotulo: string) =>
  z.string().transform((v, ctx) => {
    const n = lerNumero(v);
    if (n === null || n <= 0) {
      ctx.addIssue({ code: "custom", message: `${rotulo}: informe um número maior que zero.` });
      return z.NEVER;
    }
    return n;
  });

/** Troca a posição de um registro com o vizinho (acima ou abaixo) na mesma lista. */
async function trocarOrdem<T extends { id: string; ordem: number }>(itens: T[], id: string, direcao: "acima" | "abaixo", gravar: (id: string, ordem: number) => Promise<unknown>) {
  const indice = itens.findIndex((i) => i.id === id);
  const vizinho = itens[direcao === "acima" ? indice - 1 : indice + 1];
  if (indice < 0 || !vizinho) return;
  // Renumera a lista para evitar empates e então troca os dois.
  const ordenados = itens.map((item, posicao) => ({ ...item, ordem: posicao }));
  const a = ordenados[indice]!;
  const b = ordenados.find((i) => i.id === vizinho.id)!;
  [a.ordem, b.ordem] = [b.ordem, a.ordem];
  await Promise.all(ordenados.map((i) => gravar(i.id, i.ordem)));
}

/* ---------- Ações rápidas (cozinha também pode) ---------- */

export async function alternarEsgotado(produtoId: string, esgotado: boolean): Promise<Resultado> {
  const usuario = await exigirModulo("cardapio");
  const [produto] = await db
    .update(schema.produtos)
    .set({ esgotado })
    .where(eq(schema.produtos.id, z.uuid().parse(produtoId)))
    .returning({ nome: schema.produtos.nome });
  if (!produto) return { ok: false, mensagem: "Produto não encontrado." };
  await registrarAtividade({
    usuarioId: usuario.id,
    acao: esgotado ? "produto.esgotado" : "produto.disponivel",
    entidade: "produto",
    entidadeId: produtoId,
    detalhes: { nome: produto.nome },
  });
  revalidatePath(CAMINHO, "layout");
  return { ok: true };
}

export async function alternarOpcaoEsgotada(opcaoId: string, esgotado: boolean): Promise<Resultado> {
  const usuario = await exigirModulo("cardapio");
  const [opcao] = await db
    .update(schema.opcoesComplementos)
    .set({ esgotado })
    .where(eq(schema.opcoesComplementos.id, z.uuid().parse(opcaoId)))
    .returning({ nome: schema.opcoesComplementos.nome });
  if (!opcao) return { ok: false, mensagem: "Opção não encontrada." };
  await registrarAtividade({
    usuarioId: usuario.id,
    acao: esgotado ? "opcao.esgotada" : "opcao.disponivel",
    entidade: "opcao",
    entidadeId: opcaoId,
    detalhes: { nome: opcao.nome },
  });
  revalidatePath(CAMINHO, "layout");
  return { ok: true };
}

/* ---------- Produtos ---------- */

const esquemaProduto = z.object({
  id: z.uuid().optional(),
  categoriaId: z.uuid("Selecione a categoria."),
  nome: texto("o nome"),
  descricao: z
    .string()
    .trim()
    .max(500, "Descrição muito longa.")
    .transform((v) => v || null),
  preco: dinheiro("Preço"),
  ativo: z.boolean(),
  destaque: z.boolean(),
  precosCanal: z.record(z.uuid(), z.string()).transform((precos, ctx) => {
    const resultado: Record<string, number> = {};
    for (const [canalId, valor] of Object.entries(precos)) {
      if (valor.trim() === "") continue;
      const n = lerDinheiro(valor);
      if (n === null || n < 0) {
        ctx.addIssue({ code: "custom", message: "Preço por canal inválido." });
        return z.NEVER;
      }
      resultado[canalId] = n;
    }
    return resultado;
  }),
  receitaId: z
    .uuid()
    .nullable()
    .or(z.literal("").transform(() => null)),
  quantidadeReceita: z.string(),
  embalagens: z.array(z.object({ insumoId: z.uuid("Selecione a embalagem."), quantidade: numeroPositivo("Quantidade da embalagem") })).max(20),
  grupoIds: z.array(z.uuid()).max(20),
});

export type DadosProduto = z.input<typeof esquemaProduto>;

export async function salvarProduto(formulario: FormData): Promise<{ ok: true; id: string } | Falha> {
  const usuario = await exigirEditor();
  let json: unknown;
  try {
    json = JSON.parse(String(formulario.get("dados")));
  } catch {
    return { ok: false, mensagem: "Dados inválidos." };
  }
  const validacao = esquemaProduto.safeParse(json);
  if (!validacao.success) return erroValidacao(validacao.error);
  const { id, precosCanal, embalagens, grupoIds, quantidadeReceita: qtdTexto, ...campos } = validacao.data;

  let quantidadeReceita: number | null = null;
  if (campos.receitaId) {
    quantidadeReceita = lerNumero(qtdTexto);
    if (quantidadeReceita === null || quantidadeReceita <= 0) return { ok: false, mensagem: "Informe a quantidade da receita." };
  }
  if (new Set(embalagens.map((e) => e.insumoId)).size !== embalagens.length) {
    return { ok: false, mensagem: "Embalagem repetida." };
  }

  // Foto: opcional; validada pelo conteúdo e pelo tamanho.
  const arquivo = formulario.get("foto");
  let foto: { tipo: string; conteudo: Buffer } | null = null;
  if (arquivo instanceof File && arquivo.size > 0) {
    if (arquivo.size > TAMANHO_MAXIMO_FOTO) return { ok: false, mensagem: "Foto muito grande." };
    const conteudo = Buffer.from(await arquivo.arrayBuffer());
    const tipo = tipoDaImagem(conteudo);
    if (!tipo) return { ok: false, mensagem: "Formato de foto não suportado." };
    foto = { tipo, conteudo };
  }
  const removerFoto = formulario.get("removerFoto") === "1";

  const idProduto = id ?? crypto.randomUUID();
  try {
    await db.transaction(async (tx) => {
      const valores = {
        ...campos,
        quantidadeReceita,
        ...(foto ? { fotoAtualizadaEm: new Date() } : removerFoto ? { fotoAtualizadaEm: null } : {}),
      };
      if (id) {
        const atualizados = await tx.update(schema.produtos).set(valores).where(eq(schema.produtos.id, id)).returning({ id: schema.produtos.id });
        if (atualizados.length === 0) throw new Error("Produto não encontrado.");
        await Promise.all([
          tx.delete(schema.produtoPrecos).where(eq(schema.produtoPrecos.produtoId, id)),
          tx.delete(schema.produtoEmbalagens).where(eq(schema.produtoEmbalagens.produtoId, id)),
          tx.delete(schema.produtoGrupos).where(eq(schema.produtoGrupos.produtoId, id)),
        ]);
      } else {
        const [ultimo] = await tx
          .select({ ordem: sql<number>`coalesce(max(${schema.produtos.ordem}), -1)` })
          .from(schema.produtos)
          .where(eq(schema.produtos.categoriaId, campos.categoriaId));
        await tx.insert(schema.produtos).values({ id: idProduto, ...valores, ordem: (ultimo?.ordem ?? -1) + 1 });
      }

      const canaisPrincipais = await tx.select({ id: schema.canaisVenda.id }).from(schema.canaisVenda).where(eq(schema.canaisVenda.principal, true));
      const principal = new Set(canaisPrincipais.map((c) => c.id));
      const precos = Object.entries(precosCanal).filter(([canalId]) => !principal.has(canalId));
      if (precos.length > 0) await tx.insert(schema.produtoPrecos).values(precos.map(([canalId, preco]) => ({ produtoId: idProduto, canalId, preco })));
      if (embalagens.length > 0) await tx.insert(schema.produtoEmbalagens).values(embalagens.map((e) => ({ produtoId: idProduto, ...e })));
      if (grupoIds.length > 0) await tx.insert(schema.produtoGrupos).values(grupoIds.map((grupoId, ordem) => ({ produtoId: idProduto, grupoId, ordem })));

      if (foto) {
        await tx
          .insert(schema.produtoFotos)
          .values({ produtoId: idProduto, ...foto })
          .onConflictDoUpdate({ target: schema.produtoFotos.produtoId, set: foto });
      } else if (removerFoto) {
        await tx.delete(schema.produtoFotos).where(eq(schema.produtoFotos.produtoId, idProduto));
      }
    });
  } catch (erro) {
    if (emUso(erro)) return { ok: false, mensagem: "Categoria, receita, embalagem ou complemento não encontrado." };
    throw erro;
  }

  await registrarAtividade({
    usuarioId: usuario.id,
    acao: id ? "produto.atualizado" : "produto.criado",
    entidade: "produto",
    entidadeId: idProduto,
    detalhes: { nome: campos.nome, preco: campos.preco },
  });
  revalidatePath(CAMINHO, "layout");
  return { ok: true, id: idProduto };
}

export async function alternarAtivo(produtoId: string, ativo: boolean): Promise<Resultado> {
  const usuario = await exigirEditor();
  const [produto] = await db
    .update(schema.produtos)
    .set({ ativo })
    .where(eq(schema.produtos.id, z.uuid().parse(produtoId)))
    .returning({ nome: schema.produtos.nome });
  if (!produto) return { ok: false, mensagem: "Produto não encontrado." };
  await registrarAtividade({
    usuarioId: usuario.id,
    acao: ativo ? "produto.ativado" : "produto.ocultado",
    entidade: "produto",
    entidadeId: produtoId,
    detalhes: { nome: produto.nome },
  });
  revalidatePath(CAMINHO, "layout");
  return { ok: true };
}

export async function excluirProduto(produtoId: string): Promise<Resultado> {
  const usuario = await exigirEditor();
  const [produto] = await db
    .delete(schema.produtos)
    .where(eq(schema.produtos.id, z.uuid().parse(produtoId)))
    .returning({ nome: schema.produtos.nome });
  if (!produto) return { ok: false, mensagem: "Produto não encontrado." };
  await registrarAtividade({ usuarioId: usuario.id, acao: "produto.excluido", entidade: "produto", entidadeId: produtoId, detalhes: { nome: produto.nome } });
  revalidatePath(CAMINHO, "layout");
  return { ok: true };
}

export async function moverProduto(produtoId: string, direcao: "acima" | "abaixo"): Promise<Resultado> {
  await exigirEditor();
  const [produto] = await db.select({ categoriaId: schema.produtos.categoriaId }).from(schema.produtos).where(eq(schema.produtos.id, z.uuid().parse(produtoId)));
  if (!produto) return { ok: false, mensagem: "Produto não encontrado." };
  const irmaos = await db
    .select({ id: schema.produtos.id, ordem: schema.produtos.ordem })
    .from(schema.produtos)
    .where(eq(schema.produtos.categoriaId, produto.categoriaId))
    .orderBy(asc(schema.produtos.ordem), asc(schema.produtos.nome));
  await trocarOrdem(irmaos, produtoId, direcao, (id, ordem) => db.update(schema.produtos).set({ ordem }).where(eq(schema.produtos.id, id)));
  revalidatePath(CAMINHO, "layout");
  return { ok: true };
}

/* ---------- Categorias ---------- */

const esquemaCategoria = z.object({
  id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  nome: texto("o nome", 60),
});

export async function salvarCategoria(_anterior: Resultado, dados: FormData): Promise<Resultado> {
  const usuario = await exigirEditor();
  const validacao = esquemaCategoria.safeParse(Object.fromEntries(dados));
  if (!validacao.success) return erroValidacao(validacao.error);
  const { id, nome } = validacao.data;
  if (id) {
    await db.update(schema.categorias).set({ nome }).where(eq(schema.categorias.id, id));
  } else {
    const [ultima] = await db.select({ ordem: sql<number>`coalesce(max(${schema.categorias.ordem}), -1)` }).from(schema.categorias);
    await db.insert(schema.categorias).values({ nome, ordem: (ultima?.ordem ?? -1) + 1 });
  }
  await registrarAtividade({ usuarioId: usuario.id, acao: "categoria.salva", entidade: "categoria", entidadeId: id ?? null, detalhes: { nome } });
  revalidatePath(CAMINHO, "layout");
  return { ok: true };
}

export async function alternarCategoria(categoriaId: string, ativo: boolean): Promise<Resultado> {
  await exigirEditor();
  await db.update(schema.categorias).set({ ativo }).where(eq(schema.categorias.id, z.uuid().parse(categoriaId)));
  revalidatePath(CAMINHO, "layout");
  return { ok: true };
}

export async function moverCategoria(categoriaId: string, direcao: "acima" | "abaixo"): Promise<Resultado> {
  await exigirEditor();
  const todas = await db
    .select({ id: schema.categorias.id, ordem: schema.categorias.ordem })
    .from(schema.categorias)
    .orderBy(asc(schema.categorias.ordem), asc(schema.categorias.nome));
  await trocarOrdem(todas, z.uuid().parse(categoriaId), direcao, (id, ordem) =>
    db.update(schema.categorias).set({ ordem }).where(eq(schema.categorias.id, id)),
  );
  revalidatePath(CAMINHO, "layout");
  return { ok: true };
}

export async function excluirCategoria(categoriaId: string): Promise<Resultado> {
  const usuario = await exigirEditor();
  try {
    const [categoria] = await db
      .delete(schema.categorias)
      .where(eq(schema.categorias.id, z.uuid().parse(categoriaId)))
      .returning({ nome: schema.categorias.nome });
    if (!categoria) return { ok: false, mensagem: "Categoria não encontrada." };
    await registrarAtividade({ usuarioId: usuario.id, acao: "categoria.excluida", entidade: "categoria", entidadeId: categoriaId, detalhes: { nome: categoria.nome } });
  } catch (erro) {
    if (emUso(erro)) return { ok: false, mensagem: "Categoria com produtos. Mova ou exclua os produtos antes." };
    throw erro;
  }
  revalidatePath(CAMINHO, "layout");
  return { ok: true };
}

/* ---------- Complementos ---------- */

const esquemaGrupo = z
  .object({
    id: z.uuid().optional(),
    nome: texto("o nome do grupo", 60),
    minimo: z.number().int(),
    maximo: z.number().int(),
    opcoes: z
      .array(
        z.object({
          id: z.uuid().optional(),
          nome: texto("o nome da opção", 60),
          precoAdicional: dinheiro("Preço adicional"),
          esgotado: z.boolean(),
        }),
      )
      .min(1, "Adicione ao menos uma opção.")
      .max(50),
  })
  .superRefine((g, ctx) => {
    const erro = validarLimitesGrupo(g.minimo, g.maximo);
    if (erro) ctx.addIssue({ code: "custom", message: erro });
  });

export type DadosGrupo = z.input<typeof esquemaGrupo>;

export async function salvarGrupo(dados: DadosGrupo): Promise<Resultado> {
  const usuario = await exigirEditor();
  const validacao = esquemaGrupo.safeParse(dados);
  if (!validacao.success) return erroValidacao(validacao.error);
  const { id, opcoes, ...campos } = validacao.data;
  const idGrupo = id ?? crypto.randomUUID();

  await db.transaction(async (tx) => {
    if (id) {
      const atualizados = await tx.update(schema.gruposComplementos).set(campos).where(eq(schema.gruposComplementos.id, id)).returning({ id: schema.gruposComplementos.id });
      if (atualizados.length === 0) throw new Error("Grupo não encontrado.");
      // Remove opções retiradas; mantém o id das que continuam.
      const mantidas = opcoes.flatMap((o) => (o.id ? [o.id] : []));
      const existentes = await tx.select({ id: schema.opcoesComplementos.id }).from(schema.opcoesComplementos).where(eq(schema.opcoesComplementos.grupoId, id));
      const remover = existentes.map((o) => o.id).filter((oid) => !mantidas.includes(oid));
      if (remover.length > 0) await tx.delete(schema.opcoesComplementos).where(inArray(schema.opcoesComplementos.id, remover));
    } else {
      await tx.insert(schema.gruposComplementos).values({ id: idGrupo, ...campos });
    }
    for (const [ordem, opcao] of opcoes.entries()) {
      const valores = { nome: opcao.nome, precoAdicional: opcao.precoAdicional, esgotado: opcao.esgotado, ordem };
      if (opcao.id) {
        await tx
          .update(schema.opcoesComplementos)
          .set(valores)
          .where(and(eq(schema.opcoesComplementos.id, opcao.id), eq(schema.opcoesComplementos.grupoId, idGrupo)));
      } else {
        await tx.insert(schema.opcoesComplementos).values({ grupoId: idGrupo, ...valores });
      }
    }
  });

  await registrarAtividade({
    usuarioId: usuario.id,
    acao: id ? "grupo.atualizado" : "grupo.criado",
    entidade: "grupo",
    entidadeId: idGrupo,
    detalhes: { nome: campos.nome },
  });
  revalidatePath(CAMINHO, "layout");
  return { ok: true };
}

export async function excluirGrupo(grupoId: string): Promise<Resultado> {
  const usuario = await exigirEditor();
  try {
    const [grupo] = await db
      .delete(schema.gruposComplementos)
      .where(eq(schema.gruposComplementos.id, z.uuid().parse(grupoId)))
      .returning({ nome: schema.gruposComplementos.nome });
    if (!grupo) return { ok: false, mensagem: "Grupo não encontrado." };
    await registrarAtividade({ usuarioId: usuario.id, acao: "grupo.excluido", entidade: "grupo", entidadeId: grupoId, detalhes: { nome: grupo.nome } });
  } catch (erro) {
    if (emUso(erro)) return { ok: false, mensagem: "Grupo usado em produtos. Remova-o dos produtos antes." };
    throw erro;
  }
  revalidatePath(CAMINHO, "layout");
  return { ok: true };
}
