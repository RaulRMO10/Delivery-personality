import type { Metadata } from "next";
import { FormularioVerificacao } from "./formulario-verificacao";

export const metadata: Metadata = { title: "Verificação" };

export default function PaginaVerificacao() {
  return <FormularioVerificacao />;
}
