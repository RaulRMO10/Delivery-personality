import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { FUSO_LOJA, formatarDinheiro, formatarTelefone } from "@delivery/core";
import { exigirModulo } from "@/lib/sessao";
import { cn } from "@/lib/utils";
import { TituloPagina } from "@/components/titulo-pagina";
import { Cartao } from "@/components/ui/cartao";
import { Vazio } from "@/components/ui/vazio";
import { FILTROS, listarClientes, type Filtro } from "./dados";

export const metadata: Metadata = { title: "Clientes" };

const formatoData = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_LOJA, dateStyle: "short" });

export default async function PaginaClientes({ searchParams }: PageProps<"/painel/clientes">) {
  await exigirModulo("clientes");
  const parametros = await searchParams;
  const busca = typeof parametros.q === "string" ? parametros.q.slice(0, 60) : "";
  const filtro: Filtro = typeof parametros.filtro === "string" && parametros.filtro in FILTROS ? (parametros.filtro as Filtro) : "todos";
  const clientes = await listarClientes(busca, filtro);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <TituloPagina titulo="Clientes" />
      <form className="flex gap-2" role="search">
        <input
          name="q"
          defaultValue={busca}
          placeholder="Nome ou telefone"
          aria-label="Buscar cliente"
          className="min-h-12 flex-1 rounded-xl border border-borda bg-superficie px-4 outline-none focus:border-marca-500"
        />
        {filtro !== "todos" && <input type="hidden" name="filtro" value={filtro} />}
        <button type="submit" className="min-h-12 rounded-xl border border-borda bg-superficie px-4 font-semibold hover:bg-fundo">
          Buscar
        </button>
      </form>
      <nav className="flex gap-2 overflow-x-auto" aria-label="Filtros">
        {(Object.keys(FILTROS) as Filtro[]).map((f) => (
          <Link
            key={f}
            href={{ pathname: "/painel/clientes", query: { ...(busca ? { q: busca } : {}), ...(f !== "todos" ? { filtro: f } : {}) } }}
            aria-current={filtro === f ? "page" : undefined}
            className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-semibold", filtro === f ? "bg-texto text-white" : "bg-superficie text-texto-suave")}
          >
            {FILTROS[f]}
          </Link>
        ))}
      </nav>
      {clientes.length === 0 ? (
        <Vazio texto="Nenhum cliente encontrado." />
      ) : (
        <Cartao className="p-0">
          <ul className="divide-y divide-borda">
            {clientes.map((c) => (
              <li key={c.id}>
                <Link href={`/painel/clientes/${c.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-fundo">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{c.nome}</p>
                    <p className="text-sm text-texto-suave">
                      {formatarTelefone(c.telefone)} · {c.pedidos} {c.pedidos === 1 ? "pedido" : "pedidos"}
                      {c.ultimoPedido && ` · último ${formatoData.format(c.ultimoPedido)}`}
                    </p>
                  </div>
                  <p className="font-semibold whitespace-nowrap">{formatarDinheiro(c.totalGasto)}</p>
                  <ChevronRight className="size-5 text-texto-suave" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Cartao>
      )}
    </div>
  );
}
