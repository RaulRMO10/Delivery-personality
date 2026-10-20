import Link from "next/link";
import { LOJA, NOME_PERFIL, modulosDoPerfil } from "@delivery/core";
import { exigirUsuario } from "@/lib/sessao";
import { BarraInferior, MenuLateral } from "@/components/painel/navegacao";
import { MenuUsuario } from "@/components/painel/menu-usuario";

export default async function LayoutPainel({ children }: LayoutProps<"/painel">) {
  const usuario = await exigirUsuario();
  const modulos = modulosDoPerfil(usuario.perfil);
  const dadosUsuario = { nome: usuario.nome, nomePerfil: NOME_PERFIL[usuario.perfil] };

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-borda bg-superficie px-4">
        <Link href="/painel" className="text-lg font-bold text-marca-600">
          {LOJA.nome}
        </Link>
        <div className="hidden md:block">
          <MenuUsuario usuario={dadosUsuario} />
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <MenuLateral modulos={modulos} />
        <main className="flex-1 overflow-y-auto px-4 pt-6 pb-24 md:px-8 md:pb-8">{children}</main>
      </div>
      <BarraInferior modulos={modulos} usuario={dadosUsuario} />
    </div>
  );
}
