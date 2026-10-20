"use client";

import { useTransition } from "react";
import { excluirDadosCliente } from "../acoes";

export function ExcluirDados({ id, nome }: { id: string; nome: string }) {
  const [pendente, iniciar] = useTransition();
  return (
    <div className="border-t border-borda pt-4">
      <button
        type="button"
        disabled={pendente}
        onClick={() => {
          if (confirm(`Excluir os dados de ${nome}? Os pedidos serão mantidos sem identificação. Esta ação não pode ser desfeita.`)) {
            iniciar(() => excluirDadosCliente(id));
          }
        }}
        className="text-sm font-semibold text-status-cancelado hover:underline disabled:opacity-50"
      >
        Excluir dados do cliente (LGPD)
      </button>
    </div>
  );
}
