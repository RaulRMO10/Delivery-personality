"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface Aba {
  nome: string;
  caminho: string;
}

/** A aba ativa é a de caminho mais longo que contém a página atual. */
function abaAtiva(abas: Aba[], atual: string): string | undefined {
  return abas
    .filter((a) => atual === a.caminho || atual.startsWith(`${a.caminho}/`))
    .sort((a, b) => b.caminho.length - a.caminho.length)[0]?.caminho;
}

export function Abas({ abas }: { abas: Aba[] }) {
  const ativa = abaAtiva(abas, usePathname());
  return (
    <nav className="-mx-4 mb-6 overflow-x-auto border-b border-borda px-4 md:mx-0 md:px-0" aria-label="Seções">
      <ul className="flex min-w-max gap-1">
        {abas.map((aba) => {
          const selecionada = aba.caminho === ativa;
          return (
            <li key={aba.caminho}>
              <Link
                href={aba.caminho}
                aria-current={selecionada ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center border-b-2 px-3 font-semibold transition-colors",
                  selecionada ? "border-marca-600 text-marca-700" : "border-transparent text-texto-suave hover:text-texto",
                )}
              >
                {aba.nome}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
