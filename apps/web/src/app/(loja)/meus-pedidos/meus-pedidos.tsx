"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { FUSO_LOJA } from "@delivery/core";
import { lerPedidosDoAparelho } from "@/components/loja/carrinho";

const formato = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: FUSO_LOJA });

/** Pedidos feitos neste aparelho. Os dados ficam só no navegador do cliente. */
export function MeusPedidos() {
  const [pedidos, setPedidos] = useState<ReturnType<typeof lerPedidosDoAparelho> | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura do armazenamento local
  useEffect(() => setPedidos(lerPedidosDoAparelho()), []);

  if (pedidos === null) return null;
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <h1 className="text-2xl font-bold">Meus pedidos</h1>
      {pedidos.length === 0 ? (
        <p className="py-10 text-center text-texto-suave">Nenhum pedido feito neste aparelho.</p>
      ) : (
        <ul className="divide-y divide-borda rounded-2xl border border-borda bg-superficie">
          {pedidos.map((p) => (
            <li key={p.codigo}>
              <Link href={`/pedido/${p.codigo}`} className="flex items-center gap-3 p-4 hover:bg-fundo">
                <span className="flex-1 font-semibold">Pedido #{p.numero}</span>
                <span className="text-sm text-texto-suave">{formato.format(new Date(p.criadoEm))}</span>
                <ChevronRight className="size-5 text-texto-suave" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
