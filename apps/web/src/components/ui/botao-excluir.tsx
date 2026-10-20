"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

type AcaoExcluir = (id: string) => Promise<{ ok: true; mensagem?: string } | { ok: false; mensagem: string } | null>;

/** Exclui após confirmação e exibe o motivo quando a exclusão é recusada. */
export function BotaoExcluir({ id, nome, acao }: { id: string; nome: string; acao: AcaoExcluir }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function excluir() {
    if (!confirm(`Excluir "${nome}"?`)) return;
    setErro(null);
    iniciar(async () => {
      const resultado = await acao(id);
      if (resultado && !resultado.ok) setErro(resultado.mensagem);
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      {erro && (
        <span role="alert" className="text-sm text-status-cancelado">
          {erro}
        </span>
      )}
      <button
        type="button"
        onClick={excluir}
        disabled={pendente}
        className="flex size-11 items-center justify-center rounded-xl text-texto-suave hover:bg-fundo hover:text-status-cancelado disabled:opacity-50"
        aria-label={`Excluir ${nome}`}
        title="Excluir"
      >
        <Trash2 className="size-5" />
      </button>
    </span>
  );
}
