import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { exigirModulo } from "@/lib/sessao";
import { listarInsumos, listarReceitas } from "../dados";
import { EditorReceita } from "../editor-receita";

export const metadata: Metadata = { title: "Receita" };

export default async function PaginaReceita({ params }: PageProps<"/painel/receitas/[id]">) {
  await exigirModulo("receitas");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [receitas, insumos] = await Promise.all([listarReceitas(), listarInsumos()]);
  const receita = receitas.find((r) => r.id === id);
  if (!receita) notFound();
  return <EditorReceita receitas={receitas} insumos={insumos} receita={receita} />;
}
