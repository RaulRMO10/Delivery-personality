"use client";

import { useOptimistic, useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";

type Acao = (id: string, ativo: boolean) => Promise<unknown>;

export function BotaoAtivo({ id, ativo, nome, acao }: { id: string; ativo: boolean; nome: string; acao: Acao }) {
  const [pendente, iniciar] = useTransition();
  const [valor, definirOtimista] = useOptimistic(ativo);
  const Icone = valor ? Eye : EyeOff;
  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          definirOtimista(!valor);
          await acao(id, !valor);
        })
      }
      aria-pressed={valor}
      aria-label={`${nome}: ${valor ? "ativo" : "inativo"}`}
      title={valor ? "Ativo" : "Inativo"}
      className="flex size-11 items-center justify-center rounded-xl text-texto-suave hover:bg-fundo hover:text-texto"
    >
      <Icone className="size-5" />
    </button>
  );
}
