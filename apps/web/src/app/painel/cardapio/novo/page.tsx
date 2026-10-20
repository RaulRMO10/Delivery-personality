import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { podeEditarCardapio } from "@delivery/core";
import { exigirModulo } from "@/lib/sessao";
import { Vazio } from "@/components/ui/vazio";
import { carregarCustos, listarCategorias, listarGrupos } from "../dados";
import { EditorProduto } from "../editor-produto";

export const metadata: Metadata = { title: "Novo produto" };

export default async function PaginaNovoProduto() {
  const usuario = await exigirModulo("cardapio");
  if (!podeEditarCardapio(usuario.perfil)) redirect("/painel/cardapio");
  const [categorias, grupos, custos] = await Promise.all([listarCategorias(), listarGrupos(), carregarCustos()]);
  if (categorias.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3">
        <Vazio texto="Crie uma categoria antes." />
        <Link href="/painel/cardapio/categorias" className="font-semibold text-marca-600 hover:underline">
          Criar categoria
        </Link>
      </div>
    );
  }
  return <EditorProduto categorias={categorias} grupos={grupos} custos={custos} />;
}
