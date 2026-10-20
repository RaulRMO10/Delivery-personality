import type { Metadata } from "next";
import { ListaInsumos } from "../lista-insumos";

export const metadata: Metadata = { title: "Embalagens" };

export default function PaginaEmbalagens() {
  return <ListaInsumos tipo="embalagem" />;
}
