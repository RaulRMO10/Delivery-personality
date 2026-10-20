import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { z } from "zod";
import { FUSO_LOJA, NOME_CANAL, NOME_STATUS, formatarDinheiro, formatarTelefone, type CanalPedido, type StatusPedido } from "@delivery/core";
import { db, eq, schema } from "@delivery/db";
import { exigirModulo } from "@/lib/sessao";
import { ultimosPedidosDoCliente } from "@/lib/pedidos";
import { TituloPagina } from "@/components/titulo-pagina";
import { Cartao } from "@/components/ui/cartao";
import { Selo } from "@/components/ui/selo";
import { FormularioCliente } from "./formulario";
import { ExcluirDados } from "./excluir-dados";

export const metadata: Metadata = { title: "Cliente" };

const formatoData = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_LOJA, dateStyle: "short", timeStyle: "short" });

export default async function PaginaCliente({ params }: PageProps<"/painel/clientes/[id]">) {
  await exigirModulo("clientes");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [cliente] = await db.select().from(schema.clientes).where(eq(schema.clientes.id, id));
  if (!cliente) notFound();
  const pedidos = await ultimosPedidosDoCliente(id, 50);
  const entregues = pedidos.filter((p) => p.status === "entregue");
  const total = entregues.reduce((s, p) => s + p.total, 0);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <TituloPagina
        titulo={cliente.nome}
        acoes={
          <a
            href={`https://wa.me/55${cliente.telefone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-borda bg-superficie px-4 font-semibold hover:bg-fundo"
          >
            <MessageCircle className="size-5" aria-hidden />
            {formatarTelefone(cliente.telefone)}
          </a>
        }
      />
      <div className="grid grid-cols-3 gap-3">
        <Cartao>
          <p className="text-sm text-texto-suave">Pedidos</p>
          <p className="text-2xl font-bold">{entregues.length}</p>
        </Cartao>
        <Cartao>
          <p className="text-sm text-texto-suave">Total gasto</p>
          <p className="text-2xl font-bold">{formatarDinheiro(total)}</p>
        </Cartao>
        <Cartao>
          <p className="text-sm text-texto-suave">Ticket médio</p>
          <p className="text-2xl font-bold">{entregues.length ? formatarDinheiro(Math.round(total / entregues.length)) : "—"}</p>
        </Cartao>
      </div>

      <FormularioCliente
        cliente={{
          id: cliente.id,
          nome: cliente.nome,
          email: cliente.email ?? "",
          dataNascimento: cliente.dataNascimento ?? "",
          aceitaMarketing: cliente.aceitaMarketing,
          observacoes: cliente.observacoes ?? "",
        }}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Pedidos</h2>
        {pedidos.length === 0 ? (
          <p className="text-sm text-texto-suave">Nenhum pedido.</p>
        ) : (
          <Cartao className="p-0">
            <ul className="divide-y divide-borda">
              {pedidos.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <Link href={`/pedido/${p.codigo}`} target="_blank" className="font-bold hover:underline">
                    #{p.numero}
                  </Link>
                  <span className="flex-1 text-sm text-texto-suave">
                    {formatoData.format(p.criadoEm)} · {NOME_CANAL[p.canal as CanalPedido]}
                  </span>
                  <Selo>{NOME_STATUS[p.status as StatusPedido]}</Selo>
                  <span className="font-semibold">{formatarDinheiro(p.total)}</span>
                </li>
              ))}
            </ul>
          </Cartao>
        )}
      </section>

      <ExcluirDados id={cliente.id} nome={cliente.nome} />
    </div>
  );
}
