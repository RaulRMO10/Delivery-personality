"use client";

import { useState } from "react";
import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { formatarDinheiro } from "@delivery/core";
import { cn } from "@/lib/utils";
import type { CategoriaPublica, ProdutoPublico } from "@/lib/cardapio-publico";
import { useCarrinho } from "./carrinho";
import { JanelaProduto } from "./janela-produto";

export function Vitrine({ categorias }: { categorias: CategoriaPublica[] }) {
  const [selecionado, setSelecionado] = useState<ProdutoPublico | null>(null);
  const destaques = categorias.flatMap((c) => c.produtos).filter((p) => p.destaque && p.disponivel);

  return (
    <>
      <nav className="sticky top-0 z-20 border-b border-borda bg-superficie/95 backdrop-blur" aria-label="Categorias">
        <ul className="mx-auto flex max-w-3xl gap-2 overflow-x-auto px-4 py-3">
          {categorias.map((c) => (
            <li key={c.id}>
              <a href={`#c-${c.id}`} className="block rounded-full bg-fundo px-4 py-2 text-sm font-semibold whitespace-nowrap hover:bg-marca-50 hover:text-marca-700">
                {c.nome}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-6">
        {destaques.length > 0 && (
          <section aria-labelledby="destaques">
            <h2 id="destaques" className="mb-3 text-lg font-bold">
              Destaques
            </h2>
            <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {destaques.map((p) => (
                <li key={p.id} className="w-40 shrink-0">
                  <button type="button" onClick={() => setSelecionado(p)} className="w-full text-left">
                    <Foto url={p.fotoUrl} className="mb-2 aspect-square w-40" />
                    <p className="line-clamp-2 font-semibold">{p.nome}</p>
                    <p className="text-sm text-texto-suave">{formatarDinheiro(p.preco)}</p>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {categorias.map((c) => (
          <section key={c.id} id={`c-${c.id}`} className="scroll-mt-20" aria-labelledby={`t-${c.id}`}>
            <h2 id={`t-${c.id}`} className="mb-3 text-lg font-bold">
              {c.nome}
            </h2>
            <ul className="divide-y divide-borda rounded-2xl border border-borda bg-superficie">
              {c.produtos.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => p.disponivel && setSelecionado(p)}
                    disabled={!p.disponivel}
                    className={cn("flex w-full items-center gap-4 p-4 text-left", p.disponivel ? "hover:bg-fundo" : "cursor-not-allowed opacity-60")}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{p.nome}</p>
                      {p.descricao && <p className="mt-0.5 line-clamp-2 text-sm text-texto-suave">{p.descricao}</p>}
                      <p className="mt-1 font-semibold">{p.disponivel ? formatarDinheiro(p.preco) : "Esgotado"}</p>
                    </div>
                    <Foto url={p.fotoUrl} className="size-24 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>

      {selecionado && <JanelaProduto produto={selecionado} aoFechar={() => setSelecionado(null)} />}
      <BarraCarrinho />
    </>
  );
}

function Foto({ url, className }: { url: string | null; className?: string }) {
  if (!url) {
    return (
      <span className={cn("flex items-center justify-center rounded-xl bg-fundo text-texto-suave", className)}>
        <ImageIcon className="size-6" aria-hidden />
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- foto servida pela própria API, já otimizada
  return <img src={url} alt="" loading="lazy" className={cn("rounded-xl object-cover", className)} />;
}

export function BarraCarrinho() {
  const { quantidadeTotal, subtotal, carregado } = useCarrinho();
  if (!carregado || quantidadeTotal === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-borda bg-superficie p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <Link
        href="/checkout"
        className="mx-auto flex min-h-14 max-w-3xl items-center justify-between rounded-xl bg-marca-600 px-5 font-bold text-white hover:bg-marca-700"
      >
        <span>Ver carrinho</span>
        <span>
          {quantidadeTotal} {quantidadeTotal === 1 ? "item" : "itens"} · {formatarDinheiro(subtotal)}
        </span>
      </Link>
    </div>
  );
}
