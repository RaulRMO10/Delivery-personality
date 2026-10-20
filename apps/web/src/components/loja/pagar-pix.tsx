"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** QR Code e código Pix "copia e cola" com botão de copiar. */
export function PagarPix({ qrCode, codigo, titulo, observacao }: { qrCode: string; codigo: string; titulo: string; observacao?: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Sem acesso à área de transferência: o código continua visível para seleção.
    }
  }

  return (
    <section className="flex flex-col items-center gap-3 rounded-2xl border border-borda bg-superficie p-5 text-center">
      <h2 className="text-lg font-bold">{titulo}</h2>
      {/* eslint-disable-next-line @next/next/no-img-element -- QR gerado no servidor (data URL) */}
      <img src={qrCode} alt="QR Code Pix" width={220} height={220} className="rounded-xl" />
      <p className="w-full max-w-sm truncate rounded-lg bg-fundo px-3 py-2 font-mono text-xs select-all">{codigo}</p>
      <button
        type="button"
        onClick={copiar}
        className="flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-marca-600 font-bold text-white hover:bg-marca-700"
      >
        {copiado ? <Check className="size-5" aria-hidden /> : <Copy className="size-5" aria-hidden />}
        {copiado ? "Copiado" : "Copiar código Pix"}
      </button>
      {observacao && <p className="text-sm text-texto-suave">{observacao}</p>}
    </section>
  );
}
