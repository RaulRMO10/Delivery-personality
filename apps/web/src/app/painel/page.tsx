import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { podeAcessar, telaInicial } from "@delivery/core";
import { exigirModulo, exigirUsuario } from "@/lib/sessao";
import { TituloPagina } from "@/components/titulo-pagina";
import { EmDesenvolvimento } from "@/components/painel/em-desenvolvimento";

export const metadata: Metadata = { title: "Início" };

export default async function PaginaInicio() {
  const usuario = await exigirUsuario();
  if (!podeAcessar(usuario.perfil, "inicio")) redirect(telaInicial(usuario.perfil));
  await exigirModulo("inicio");

  return (
    <>
      <TituloPagina titulo={`Olá, ${usuario.nome.split(" ")[0]}`} />
      <EmDesenvolvimento />
    </>
  );
}
