"use client";

import { useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { fecharLoja, pausarLoja, reabrirLoja } from "@/app/painel/loja/acoes";

export type SituacaoLoja = "aberta" | "pausada" | "fechada" | "fora_do_horario";

interface Props {
  descricao: string;
  situacao: SituacaoLoja;
  podeOperar: boolean;
}

const CORES: Record<SituacaoLoja, string> = {
  aberta: "bg-status-pronto/10 text-status-pronto",
  pausada: "bg-status-preparo/10 text-status-preparo",
  fechada: "bg-status-cancelado/10 text-status-cancelado",
  fora_do_horario: "bg-fundo text-texto-suave",
};

export function StatusLoja({ descricao, situacao, podeOperar }: Props) {
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciar] = useTransition();

  const executar = (acao: () => Promise<unknown>) =>
    iniciar(async () => {
      await acao();
      setAberto(false);
    });

  const selo = (
    <span className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-bold", CORES[situacao])}>
      <span className="size-2 rounded-full bg-current" aria-hidden />
      {descricao}
      {podeOperar && <ChevronDown className="size-4" aria-hidden />}
    </span>
  );

  if (!podeOperar) return selo;

  const item = "flex min-h-11 w-full items-center rounded-lg px-3 text-left font-semibold hover:bg-fundo disabled:opacity-50";

  return (
    <div className="relative">
      <button type="button" onClick={() => setAberto(!aberto)} aria-expanded={aberto} aria-haspopup="menu" disabled={pendente}>
        {selo}
      </button>
      {aberto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} aria-hidden />
          <div role="menu" className="absolute left-0 z-50 mt-2 w-56 rounded-xl border border-borda bg-superficie p-1.5 shadow-lg">
            {situacao === "pausada" || situacao === "fechada" ? (
              <button role="menuitem" type="button" className={item} disabled={pendente} onClick={() => executar(reabrirLoja)}>
                Reabrir agora
              </button>
            ) : null}
            {[15, 30, 60, 120].map((minutos) => (
              <button key={minutos} role="menuitem" type="button" className={item} disabled={pendente} onClick={() => executar(() => pausarLoja(minutos))}>
                Pausar {minutos < 60 ? `${minutos} min` : `${minutos / 60} h`}
              </button>
            ))}
            {situacao !== "fechada" && (
              <button role="menuitem" type="button" className={cn(item, "text-status-cancelado")} disabled={pendente} onClick={() => executar(fecharLoja)}>
                Fechar até reabrir
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
