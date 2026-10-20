import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { podeEditarCardapio } from "@delivery/core";
import { exigirModulo } from "@/lib/sessao";
import { carregarCustos, listarCategorias, listarGrupos, listarProdutos } from "../dados";
import { EditorProduto } from "../editor-produto";

export const metadata: Metadata = { title: "Produto" };

export default async function PaginaProduto({ params }: PageProps<"/painel/cardapio/[id]">) {
  const usuario = await exigirModulo("cardapio");
  if (!podeEditarCardapio(usuario.perfil)) redirect("/painel/cardapio");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [categorias, grupos, custos, produtos] = await Promise.all([listarCategorias(), listarGrupos(), carregarCustos(), listarProdutos()]);
  const produto = produtos.find((p) => p.id === id);
  if (!produto) notFound();
  return <EditorProduto categorias={categorias} grupos={grupos} custos={custos} produto={produto} />;
}
