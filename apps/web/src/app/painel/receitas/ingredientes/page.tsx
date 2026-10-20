import type { Metadata } from "next";
import { ListaInsumos } from "../lista-insumos";

export const metadata: Metadata = { title: "Ingredientes" };

export default function PaginaIngredientes() {
  return <ListaInsumos tipo="ingrediente" />;
}
