import { connection } from "next/server";
import { carregarCardapioPublico } from "@/lib/cardapio-publico";
import { Vitrine } from "@/components/loja/vitrine";

export default async function PaginaLoja() {
  await connection();
  const categorias = await carregarCardapioPublico();

  if (categorias.length === 0) {
    return <p className="px-4 py-16 text-center text-texto-suave">Cardápio em preparação.</p>;
  }
  return <Vitrine categorias={categorias} />;
}
