"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { itensParaRepetir } from "@/app/(loja)/pedido/[codigo]/acoes";
import { useCarrinho } from "./carrinho";

export function PedirDeNovo({ codigo }: { codigo: string }) {
  const router = useRouter();
  const { adicionar } = useCarrinho();
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);

  function repetir() {
    iniciar(async () => {
      const { itens, indisponiveis } = await itensParaRepetir(codigo);
      if (itens.length === 0) {
        setAviso("Os itens deste pedido não estão disponíveis no momento.");
        return;
      }
      itens.forEach((item) => adicionar(item));
      router.push(indisponiveis > 0 ? "/checkout?aviso=indisponiveis" : "/checkout");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={repetir}
        disabled={pendente}
        className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-marca-600 font-semibold text-white hover:bg-marca-700 disabled:opacity-50"
      >
        <RotateCcw className="size-5" aria-hidden />
        Pedir de novo
      </button>
      {aviso && <p className="text-center text-sm text-texto-suave">{aviso}</p>}
    </div>
  );
}
