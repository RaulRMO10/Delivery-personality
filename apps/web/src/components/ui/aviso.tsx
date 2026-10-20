import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const tipos = {
  erro: "border-status-cancelado/30 bg-status-cancelado/5 text-status-cancelado",
  sucesso: "border-status-pronto/30 bg-status-pronto/5 text-status-pronto",
  info: "border-borda bg-fundo text-texto-suave",
} as const;

export function Aviso({ tipo = "info", children }: { tipo?: keyof typeof tipos; children: ReactNode }) {
  return (
    <p role={tipo === "erro" ? "alert" : "status"} className={cn("rounded-xl border px-4 py-3 text-sm", tipos[tipo])}>
      {children}
    </p>
  );
}
