import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Check, MessageCircle } from "lucide-react";
import { FUSO_LOJA, NOME_PAGAMENTO, NOME_STATUS, formatarDinheiro, pedidoEncerrado, type FormaPagamento, type StatusPedido } from "@delivery/core";
import { asc, db, eq, schema } from "@delivery/db";
import { obterConfiguracao } from "@/lib/loja";
import { cn } from "@/lib/utils";
import { AtualizacaoAutomatica } from "@/components/loja/atualizacao-automatica";

export const metadata: Metadata = { title: "Seu pedido", robots: { index: false } };

const formatoHora = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_LOJA, hour: "2-digit", minute: "2-digit" });
const formatoDataHora = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_LOJA, weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function etapas(tipo: "entrega" | "retirada"): { status: StatusPedido; rotulo: string }[] {
  return [
    { status: "recebido", rotulo: "Recebido" },
    { status: "confirmado", rotulo: "Confirmado" },
    { status: "em_preparo", rotulo: "Em preparo" },
    ...(tipo === "entrega"
      ? [
          { status: "saiu_para_entrega" as const, rotulo: "Saiu para entrega" },
          { status: "entregue" as const, rotulo: "Entregue" },
        ]
      : [
          { status: "pronto" as const, rotulo: "Pronto para retirada" },
          { status: "entregue" as const, rotulo: "Retirado" },
        ]),
  ];
}

const ORDEM: StatusPedido[] = ["aguardando_pagamento", "recebido", "confirmado", "em_preparo", "pronto", "saiu_para_entrega", "entregue"];

export default async function PaginaPedido({ params }: PageProps<"/pedido/[codigo]">) {
  await connection();
  const { codigo } = await params;
  if (!/^[A-Za-z0-9_-]{8,32}$/.test(codigo)) notFound();
  const [pedido] = await db.select().from(schema.pedidos).where(eq(schema.pedidos.codigo, codigo));
  if (!pedido) notFound();
  const [itens, historico, config] = await Promise.all([
    db.select().from(schema.pedidoItens).where(eq(schema.pedidoItens.pedidoId, pedido.id)).orderBy(asc(schema.pedidoItens.ordem)),
    db.select().from(schema.pedidoHistorico).where(eq(schema.pedidoHistorico.pedidoId, pedido.id)).orderBy(asc(schema.pedidoHistorico.criadoEm)),
    obterConfiguracao(),
  ]);

  const status = pedido.status as StatusPedido;
  const posicao = ORDEM.indexOf(status);
  const quando = (s: StatusPedido) => historico.find((h) => h.status === s)?.criadoEm;
  const whatsapp = config.telefone
    ? `https://wa.me/55${config.telefone}?text=${encodeURIComponent(`Olá! Sobre o pedido #${pedido.numero}.`)}`
    : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <AtualizacaoAutomatica ativa={!pedidoEncerrado(status)} />
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold">Pedido #{pedido.numero}</h1>
        <span className="text-sm text-texto-suave">{formatoDataHora.format(pedido.criadoEm)}</span>
      </div>

      <section className="rounded-2xl border border-borda bg-superficie p-5">
        {status === "cancelado" ? (
          <div>
            <p className="text-lg font-bold text-status-cancelado">Pedido cancelado</p>
            {pedido.motivoCancelamento && <p className="mt-1 text-texto-suave">{pedido.motivoCancelamento}</p>}
          </div>
        ) : status === "aguardando_pagamento" ? (
          <p className="text-lg font-bold">{NOME_STATUS[status]}</p>
        ) : (
          <>
            <p className="mb-4 text-texto-suave">
              {pedido.agendadoPara
                ? `Agendado para ${formatoDataHora.format(pedido.agendadoPara)}`
                : pedido.previsaoEm && status !== "entregue"
                  ? `Previsão: ${formatoHora.format(pedido.previsaoEm)}`
                  : null}
            </p>
            <ol className="flex flex-col gap-4">
              {etapas(pedido.tipo).map((etapa) => {
                const feito = ORDEM.indexOf(etapa.status) <= posicao;
                const momento = quando(etapa.status);
                return (
                  <li key={etapa.status} className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full border-2",
                        feito ? "border-status-pronto bg-status-pronto text-white" : "border-borda text-transparent",
                      )}
                    >
                      <Check className="size-4" aria-hidden />
                    </span>
                    <span className={cn("flex-1", feito ? "font-semibold" : "text-texto-suave")}>{etapa.rotulo}</span>
                    {feito && momento && <span className="text-sm text-texto-suave">{formatoHora.format(momento)}</span>}
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-borda bg-superficie">
        <ul className="divide-y divide-borda">
          {itens.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 p-4">
              <div>
                <p className="font-semibold">
                  {item.quantidade}× {item.nome}
                </p>
                {item.opcoes.length > 0 && (
                  <p className="text-sm text-texto-suave">{item.opcoes.map((o) => (o.quantidade > 1 ? `${o.quantidade}× ${o.opcao}` : o.opcao)).join(", ")}</p>
                )}
                {item.observacao && <p className="text-sm text-texto-suave italic">{item.observacao}</p>}
              </div>
              <span className="whitespace-nowrap">{formatarDinheiro(item.precoUnitario * item.quantidade)}</span>
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-1 border-t border-borda p-4">
          <div className="flex justify-between">
            <dt className="text-texto-suave">Subtotal</dt>
            <dd>{formatarDinheiro(pedido.subtotal)}</dd>
          </div>
          {pedido.desconto > 0 && (
            <div className="flex justify-between">
              <dt className="text-texto-suave">Desconto</dt>
              <dd>− {formatarDinheiro(pedido.desconto)}</dd>
            </div>
          )}
          {pedido.tipo === "entrega" && (
            <div className="flex justify-between">
              <dt className="text-texto-suave">Entrega</dt>
              <dd>{pedido.taxaEntrega === 0 ? "Grátis" : formatarDinheiro(pedido.taxaEntrega)}</dd>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold">
            <dt>Total</dt>
            <dd>{formatarDinheiro(pedido.total)}</dd>
          </div>
        </dl>
      </section>

      <section className="flex flex-col gap-1 rounded-2xl border border-borda bg-superficie p-4 text-sm">
        <p>
          <span className="text-texto-suave">Pagamento: </span>
          {NOME_PAGAMENTO[pedido.formaPagamento as FormaPagamento] ?? "Online"}
          {pedido.trocoPara ? ` · troco para ${formatarDinheiro(pedido.trocoPara)}` : ""}
        </p>
        <p>
          <span className="text-texto-suave">{pedido.tipo === "entrega" ? "Entrega: " : "Retirada: "}</span>
          {pedido.endereco
            ? `${pedido.endereco.rua}, ${pedido.endereco.numero}${pedido.endereco.complemento ? ` – ${pedido.endereco.complemento}` : ""} · ${pedido.endereco.bairro}`
            : (config.endereco ?? "no local")}
        </p>
      </section>

      {whatsapp && (
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-borda bg-superficie font-semibold hover:bg-fundo"
        >
          <MessageCircle className="size-5" aria-hidden />
          Falar com a loja
        </a>
      )}
    </main>
  );
}
