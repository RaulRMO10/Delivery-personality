import type { Metadata } from "next";
import { exigirModulo } from "@/lib/sessao";
import { listarInsumos, listarReceitas } from "../dados";
import { EditorReceita } from "../editor-receita";

export const metadata: Metadata = { title: "Nova receita" };

export default async function PaginaNovaReceita() {
  await exigirModulo("receitas");
  const [receitas, insumos] = await Promise.all([listarReceitas(), listarInsumos()]);
  return <EditorReceita receitas={receitas} insumos={insumos} />;
}
