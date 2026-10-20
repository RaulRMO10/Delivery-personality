"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { avaliarPedido } from "@/app/(loja)/pedido/[codigo]/avaliacao";

export function Estrelas({ nota, tamanho = "size-5" }: { nota: number; tamanho?: string }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${nota} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn(tamanho, n <= nota ? "fill-status-preparo text-status-preparo" : "text-borda")} aria-hidden />
      ))}
    </span>
  );
}

export function AvaliarPedido({ codigo }: { codigo: string }) {
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-borda bg-superficie p-5">
      <h2 className="text-lg font-bold">Avalie seu pedido</h2>
      <div className="flex gap-1" role="radiogroup" aria-label="Nota">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={nota === n}
            aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`}
            onClick={() => setNota(n)}
            className="flex size-12 items-center justify-center rounded-xl hover:bg-fundo"
          >
            <Star className={cn("size-8", n <= nota ? "fill-status-preparo text-status-preparo" : "text-borda")} />
          </button>
        ))}
      </div>
      <textarea
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder="Comentário (opcional)"
        aria-label="Comentário"
        className="rounded-xl border border-borda px-4 py-3 outline-none focus:border-marca-500"
      />
      {erro && <p className="text-sm text-status-cancelado">{erro}</p>}
      <button
        type="button"
        disabled={nota === 0 || pendente}
        onClick={() =>
          iniciar(async () => {
            const resultado = await avaliarPedido({ codigo, nota, comentario });
            if (!resultado.ok) setErro(resultado.mensagem ?? "Não foi possível enviar.");
          })
        }
        className="min-h-12 rounded-xl bg-marca-600 font-semibold text-white hover:bg-marca-700 disabled:opacity-50"
      >
        Enviar avaliação
      </button>
    </section>
  );
}
