"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export interface DadosUsuario {
  nome: string;
  nomePerfil: string;
}

export function MenuUsuario({ usuario }: { usuario: DadosUsuario }) {
  const router = useRouter();

  async function sair() {
    await authClient.signOut();
    router.replace("/entrar");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1">
      <div className="mr-2 text-right leading-tight">
        <p className="font-semibold">{usuario.nome}</p>
        <p className="text-xs text-texto-suave">{usuario.nomePerfil}</p>
      </div>
      <Link
        href="/painel/seguranca"
        className="flex size-11 items-center justify-center rounded-xl text-texto-suave hover:bg-fundo hover:text-texto"
        aria-label="Segurança"
        title="Segurança"
      >
        <ShieldCheck className="size-5" />
      </Link>
      <button
        type="button"
        onClick={sair}
        className="flex size-11 items-center justify-center rounded-xl text-texto-suave hover:bg-fundo hover:text-texto"
        aria-label="Sair"
        title="Sair"
      >
        <LogOut className="size-5" />
      </button>
    </div>
  );
}
