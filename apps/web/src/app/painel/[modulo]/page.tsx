import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MODULOS, type Modulo } from "@delivery/core";
import { exigirModulo } from "@/lib/sessao";
import { TituloPagina } from "@/components/titulo-pagina";
import { EmDesenvolvimento } from "@/components/painel/em-desenvolvimento";

/** Página provisória dos módulos ainda não construídos. */
function buscar(id: string): Modulo | undefined {
  return MODULOS.find((m) => m.id === id && m.id !== "inicio");
}

export async function generateMetadata({ params }: PageProps<"/painel/[modulo]">): Promise<Metadata> {
  const modulo = buscar((await params).modulo);
  return { title: modulo?.nome };
}

export default async function PaginaModulo({ params }: PageProps<"/painel/[modulo]">) {
  const modulo = buscar((await params).modulo);
  if (!modulo) notFound();
  await exigirModulo(modulo.id);

  return (
    <>
      <TituloPagina titulo={modulo.nome} />
      <EmDesenvolvimento />
    </>
  );
}
