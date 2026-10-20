"use client";

import { useOptimistic, useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";
import { alternarCategoria } from "../acoes";

export function BotaoVisivel({ id, ativo, nome }: { id: string; ativo: boolean; nome: string }) {
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
          await alternarCategoria(id, !valor);
        })
      }
      aria-pressed={valor}
      aria-label={`${nome}: ${valor ? "visível" : "oculta"}`}
      title={valor ? "Visível" : "Oculta"}
      className="flex size-11 items-center justify-center rounded-xl text-texto-suave hover:bg-fundo hover:text-texto"
    >
      <Icone className="size-5" />
    </button>
  );
}
