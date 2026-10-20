"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ABAS = [
  { nome: "Receitas", caminho: "/painel/receitas" },
  { nome: "Ingredientes", caminho: "/painel/receitas/ingredientes" },
  { nome: "Embalagens", caminho: "/painel/receitas/embalagens" },
  { nome: "Custos fixos", caminho: "/painel/receitas/custos" },
  { nome: "Canais", caminho: "/painel/receitas/canais" },
  { nome: "Precificação", caminho: "/painel/receitas/precificacao" },
];

function ativa(atual: string, caminho: string) {
  if (caminho === "/painel/receitas") {
    return atual === caminho || atual === "/painel/receitas/nova" || /^\/painel\/receitas\/[0-9a-f-]{36}$/.test(atual);
  }
  return atual.startsWith(caminho);
}

export function AbasReceitas() {
  const atual = usePathname();
  return (
    <nav className="-mx-4 mb-6 overflow-x-auto border-b border-borda px-4 md:mx-0 md:px-0" aria-label="Seções">
      <ul className="flex min-w-max gap-1">
        {ABAS.map((aba) => {
          const selecionada = ativa(atual, aba.caminho);
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
