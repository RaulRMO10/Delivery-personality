"use client";

import { useEffect, useId, type ReactNode } from "react";
import { X } from "lucide-react";

export function Dialogo({ titulo, aoFechar, children }: { titulo: string; aoFechar: () => void; children: ReactNode }) {
  const idTitulo = useId();

  useEffect(() => {
    const fecharComEsc = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", fecharComEsc);
    return () => window.removeEventListener("keydown", fecharComEsc);
  }, [aoFechar]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true" aria-labelledby={idTitulo}>
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-superficie p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 id={idTitulo} className="text-lg font-bold">
            {titulo}
          </h2>
          <button type="button" onClick={aoFechar} className="flex size-11 items-center justify-center rounded-xl hover:bg-fundo" aria-label="Fechar">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
