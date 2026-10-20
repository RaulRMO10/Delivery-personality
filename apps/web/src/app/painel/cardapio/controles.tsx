"use client";

import { useOptimistic, useTransition } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { alternarEsgotado, alternarOpcaoEsgotada, moverCategoria, moverProduto } from "./acoes";

/** Alterna disponível/esgotado com um toque, com resposta imediata na tela. */
export function BotaoEsgotado({ id, esgotado, tipo = "produto", nome }: { id: string; esgotado: boolean; tipo?: "produto" | "opcao"; nome: string }) {
  const [pendente, iniciar] = useTransition();
  const [valor, definirOtimista] = useOptimistic(esgotado);

  function alternar() {
    iniciar(async () => {
      definirOtimista(!valor);
      await (tipo === "produto" ? alternarEsgotado(id, !valor) : alternarOpcaoEsgotada(id, !valor));
    });
  }

  return (
    <button
      type="button"
      onClick={alternar}
      disabled={pendente}
      aria-pressed={valor}
      aria-label={`${nome}: ${valor ? "esgotado" : "disponível"}`}
      className={cn(
        "min-h-11 min-w-28 rounded-full px-4 text-sm font-bold transition-colors",
        valor ? "bg-status-cancelado/10 text-status-cancelado" : "bg-status-pronto/10 text-status-pronto",
      )}
    >
      {valor ? "Esgotado" : "Disponível"}
    </button>
  );
}

export function BotoesOrdem({ id, tipo, primeiro, ultimo, nome }: { id: string; tipo: "produto" | "categoria"; primeiro: boolean; ultimo: boolean; nome: string }) {
  const [pendente, iniciar] = useTransition();
  const mover = (direcao: "acima" | "abaixo") => iniciar(async () => void (await (tipo === "produto" ? moverProduto(id, direcao) : moverCategoria(id, direcao))));
  const estilo = "flex size-9 items-center justify-center rounded-lg text-texto-suave hover:bg-fundo hover:text-texto disabled:opacity-30";
  return (
    <div className="flex flex-col">
      <button type="button" className={estilo} disabled={primeiro || pendente} onClick={() => mover("acima")} aria-label={`Mover ${nome} para cima`}>
        <ArrowUp className="size-4" />
      </button>
      <button type="button" className={estilo} disabled={ultimo || pendente} onClick={() => mover("abaixo")} aria-label={`Mover ${nome} para baixo`}>
        <ArrowDown className="size-4" />
      </button>
    </div>
  );
}
