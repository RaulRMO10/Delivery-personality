"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Recarrega os dados da página em intervalos enquanto `ativa` for verdadeiro e a aba estiver visível. */
export function AtualizacaoAutomatica({ ativa, segundos = 15 }: { ativa: boolean; segundos?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!ativa) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, segundos * 1000);
    return () => clearInterval(id);
  }, [ativa, segundos, router]);
  return null;
}
