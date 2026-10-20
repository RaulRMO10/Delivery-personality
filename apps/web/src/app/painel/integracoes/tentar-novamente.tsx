"use client";

import { useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { tentarNovamente } from "./acoes";

export function TentarNovamente({ id }: { id: string }) {
  const [pendente, iniciar] = useTransition();
  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() => iniciar(() => tentarNovamente(id))}
      className="flex min-h-11 items-center gap-2 rounded-xl border border-borda px-3 text-sm font-semibold hover:bg-fundo disabled:opacity-50"
    >
      <RotateCcw className="size-4" aria-hidden />
      Tentar de novo
    </button>
  );
}
