"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { NOME_GRUPO, type GrupoModulo, type Modulo } from "@delivery/core";
import { cn } from "@/lib/utils";
import { ICONE_MODULO } from "./icones";
import { MenuUsuario, type DadosUsuario } from "./menu-usuario";

function estaAtivo(caminhoAtual: string, caminho: string) {
  return caminho === "/painel" ? caminhoAtual === "/painel" : caminhoAtual.startsWith(caminho);
}

function agrupar(modulos: Modulo[]) {
  const grupos = new Map<GrupoModulo, Modulo[]>();
  for (const modulo of modulos) grupos.set(modulo.grupo, [...(grupos.get(modulo.grupo) ?? []), modulo]);
  return [...grupos.entries()];
}

function ListaModulos({ modulos, aoNavegar }: { modulos: Modulo[]; aoNavegar?: () => void }) {
  const caminhoAtual = usePathname();
  return (
    <nav className="flex flex-col gap-5">
      {agrupar(modulos).map(([grupo, itens]) => (
        <div key={grupo}>
          <p className="mb-1 px-3 text-xs font-bold uppercase tracking-wide text-texto-suave">{NOME_GRUPO[grupo]}</p>
          <ul className="flex flex-col gap-0.5">
            {itens.map((modulo) => {
              const Icone = ICONE_MODULO[modulo.id];
              const ativo = estaAtivo(caminhoAtual, modulo.caminho);
              return (
                <li key={modulo.id}>
                  <Link
                    href={modulo.caminho}
                    onClick={aoNavegar}
                    aria-current={ativo ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-xl px-3 font-semibold transition-colors",
                      ativo ? "bg-marca-50 text-marca-700" : "text-texto hover:bg-fundo",
                    )}
                  >
                    <Icone className="size-5 shrink-0" aria-hidden />
                    {modulo.nome}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Menu lateral (tablet e computador). */
export function MenuLateral({ modulos }: { modulos: Modulo[] }) {
  return (
    <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-borda bg-superficie p-4 md:block">
      <ListaModulos modulos={modulos} />
    </aside>
  );
}

const PRINCIPAIS_CELULAR = ["pedidos", "agenda", "cardapio", "inicio"] as const;

/** Barra inferior com atalhos e o botão "Mais" (celular). */
export function BarraInferior({ modulos, usuario }: { modulos: Modulo[]; usuario: DadosUsuario }) {
  const caminhoAtual = usePathname();
  const [aberto, setAberto] = useState(false);
  const atalhos = PRINCIPAIS_CELULAR.flatMap((id) => modulos.filter((m) => m.id === id));

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid auto-cols-fr grid-flow-col border-t border-borda bg-superficie pb-[env(safe-area-inset-bottom)] md:hidden">
        {atalhos.map((modulo) => {
          const Icone = ICONE_MODULO[modulo.id];
          const ativo = estaAtivo(caminhoAtual, modulo.caminho);
          return (
            <Link
              key={modulo.id}
              href={modulo.caminho}
              aria-current={ativo ? "page" : undefined}
              className={cn(
                "flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold",
                ativo ? "text-marca-600" : "text-texto-suave",
              )}
            >
              <Icone className="size-6" aria-hidden />
              {modulo.nome}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold text-texto-suave"
        >
          <Menu className="size-6" aria-hidden />
          Mais
        </button>
      </nav>

      {aberto && (
        <div className="fixed inset-0 z-40 flex flex-col bg-superficie md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="flex items-center justify-between border-b border-borda px-4 py-3">
            <MenuUsuario usuario={usuario} />
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="flex size-12 items-center justify-center rounded-xl hover:bg-fundo"
              aria-label="Fechar menu"
            >
              <X className="size-6" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <ListaModulos modulos={modulos} aoNavegar={() => setAberto(false)} />
          </div>
        </div>
      )}
    </>
  );
}
