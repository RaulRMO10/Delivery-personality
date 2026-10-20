import type { Metadata } from "next";
import { FormularioEntrar } from "./formulario-entrar";

export const metadata: Metadata = { title: "Entrar" };

export default function PaginaEntrar() {
  return <FormularioEntrar />;
}
