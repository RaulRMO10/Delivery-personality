import type { Metadata } from "next";
import { exige2fa } from "@delivery/core";
import { exigirUsuario } from "@/lib/sessao";
import { TituloPagina } from "@/components/titulo-pagina";
import { Aviso } from "@/components/ui/aviso";
import { DoisFatores } from "./dois-fatores";
import { TrocarSenha } from "./trocar-senha";

export const metadata: Metadata = { title: "Segurança" };

export default async function PaginaSeguranca() {
  const usuario = await exigirUsuario();
  const obrigatorio = exige2fa(usuario.perfil);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <TituloPagina titulo="Segurança" />
      {obrigatorio && !usuario.doisFatoresAtivo && (
        <Aviso tipo="erro">Ative a verificação em duas etapas para acessar o painel.</Aviso>
      )}
      <DoisFatores ativo={usuario.doisFatoresAtivo} obrigatorio={obrigatorio} />
      <TrocarSenha />
    </div>
  );
}
