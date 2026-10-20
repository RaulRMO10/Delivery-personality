import type { Metadata } from "next";
import Link from "next/link";
import { NOME_PERFIL, descreverStatus, modulosDoPerfil, podeOperarLoja } from "@delivery/core";
import { exigirUsuario } from "@/lib/sessao";
import { calcularStatus, obterConfiguracao } from "@/lib/loja";
import { BarraInferior, MenuLateral } from "@/components/painel/navegacao";
import { MenuUsuario } from "@/components/painel/menu-usuario";
import { StatusLoja, type SituacaoLoja } from "@/components/painel/status-loja";

export async function generateMetadata(): Promise<Metadata> {
  const { nome } = await obterConfiguracao();
  return { title: { default: `Painel · ${nome}`, template: `%s · ${nome}` }, robots: { index: false } };
}

export default async function LayoutPainel({ children }: LayoutProps<"/painel">) {
  const usuario = await exigirUsuario();
  const config = await obterConfiguracao();
  const agora = new Date();
  const status = calcularStatus(config, agora);
  const situacao: SituacaoLoja = status.aberta
    ? "aberta"
    : status.motivo === "pausada"
      ? "pausada"
      : status.motivo === "fechada"
        ? "fechada"
        : "fora_do_horario";
  const modulos = modulosDoPerfil(usuario.perfil);
  const dadosUsuario = { nome: usuario.nome, nomePerfil: NOME_PERFIL[usuario.perfil] };

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-borda bg-superficie px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/painel" className="truncate text-lg font-bold text-marca-600">
            {config.nome}
          </Link>
          <StatusLoja descricao={descreverStatus(status, agora)} situacao={situacao} podeOperar={podeOperarLoja(usuario.perfil)} />
        </div>
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
