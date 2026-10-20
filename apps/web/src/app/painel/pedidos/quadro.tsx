"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, Bike, CalendarClock, Maximize, ShoppingBag } from "lucide-react";
import {
  FUSO_LOJA,
  MINUTOS_ATENCAO,
  MINUTOS_ATRASO,
  NOME_CANAL,
  NOME_PAGAMENTO,
  formatarDinheiro,
  type CanalPedido,
  type FormaPagamento,
  type Perfil,
  type StatusPedido,
} from "@delivery/core";
import { cn } from "@/lib/utils";
import type { PedidoCompleto } from "@/lib/pedidos";
import { DetalhePedido } from "./detalhe";
import { prepararSom, tocarAviso } from "./som";

interface Props {
  pedidos: PedidoCompleto[];
  perfil: Perfil;
}

const COLUNAS: { titulo: string; status: StatusPedido[]; cor: string }[] = [
  { titulo: "Novos", status: ["recebido"], cor: "bg-status-novo" },
  { titulo: "Em preparo", status: ["confirmado", "em_preparo"], cor: "bg-status-preparo" },
  { titulo: "Prontos", status: ["pronto"], cor: "bg-status-pronto" },
  { titulo: "Em entrega", status: ["saiu_para_entrega"], cor: "bg-status-saiu" },
];

const formatoHora = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_LOJA, hour: "2-digit", minute: "2-digit" });
const formatoDiaHora = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_LOJA, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const CHAVE_SOM = "painel:som";

export function QuadroPedidos({ pedidos, perfil }: Props) {
  const router = useRouter();
  const [aba, setAba] = useState<"ativos" | "concluidos" | "cancelados">("ativos");
  const [colunaCelular, setColunaCelular] = useState(0);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [somAtivo, setSomAtivo] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  const vistos = useRef<Set<string> | null>(null);
  const [novos, setNovos] = useState<Set<string>>(new Set());

  // Atualiza a lista a cada 10 s e o relógio a cada 30 s.
  useEffect(() => {
    const lista = setInterval(() => router.refresh(), 10_000);
    const relogio = setInterval(() => setAgora(Date.now()), 30_000);
    return () => {
      clearInterval(lista);
      clearInterval(relogio);
    };
  }, [router]);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- preferência salva no aparelho
      setSomAtivo(localStorage.getItem(CHAVE_SOM) === "1");
    } catch {
      // Sem armazenamento local.
    }
  }, []);

  // Detecta pedidos recebidos que ainda não estavam na tela.
  useEffect(() => {
    const recebidos = pedidos.filter((p) => p.status === "recebido").map((p) => p.id);
    if (vistos.current === null) {
      vistos.current = new Set(recebidos);
      return;
    }
    const ineditos = recebidos.filter((id) => !vistos.current!.has(id));
    ineditos.forEach((id) => vistos.current!.add(id));
    if (ineditos.length > 0) setNovos((atual) => new Set([...atual, ...ineditos]));
  }, [pedidos]);

  // Repete o aviso enquanto houver pedido novo não aberto.
  const pendentes = [...novos].filter((id) => pedidos.some((p) => p.id === id && p.status === "recebido"));
  useEffect(() => {
    if (!somAtivo || pendentes.length === 0) return;
    tocarAviso();
    const id = setInterval(tocarAviso, 4000);
    return () => clearInterval(id);
  }, [somAtivo, pendentes.length]);

  function alternarSom() {
    const novo = !somAtivo;
    if (novo) prepararSom();
    setSomAtivo(novo);
    try {
      localStorage.setItem(CHAVE_SOM, novo ? "1" : "0");
    } catch {
      // Sem armazenamento local.
    }
  }

  async function telaCheia() {
    prepararSom();
    try {
      await document.documentElement.requestFullscreen();
      await navigator.wakeLock?.request("screen");
    } catch {
      // Recurso indisponível no navegador.
    }
  }

  function abrir(id: string) {
    setSelecionadoId(id);
    setNovos((atual) => {
      const copia = new Set(atual);
      copia.delete(id);
      return copia;
    });
  }

  const aguardando = pedidos.filter((p) => p.status === "aguardando_pagamento");
  const concluidos = pedidos.filter((p) => p.status === "entregue").reverse();
  const cancelados = pedidos.filter((p) => p.status === "cancelado").reverse();
  const selecionado = pedidos.find((p) => p.id === selecionadoId) ?? null;

  const cartao = (p: PedidoCompleto) => <CartaoPedido key={p.id} pedido={p} agora={agora} novo={novos.has(p.id)} aoAbrir={() => abrir(p.id)} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <div className="flex gap-2">
          {perfil !== "entregador" && (
            <a href="/" target="_blank" rel="noopener" className="flex min-h-11 items-center rounded-xl bg-marca-600 px-4 text-sm font-semibold text-white hover:bg-marca-700">
              Novo pedido
            </a>
          )}
          <button
            type="button"
            onClick={alternarSom}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold",
              somAtivo ? "border-status-pronto/40 bg-status-pronto/10 text-status-pronto" : "border-borda bg-superficie text-texto-suave",
            )}
            aria-pressed={somAtivo}
          >
            {somAtivo ? <Bell className="size-5" /> : <BellOff className="size-5" />}
            {somAtivo ? "Som ativo" : "Ativar som"}
          </button>
          <button type="button" onClick={telaCheia} className="flex size-11 items-center justify-center rounded-xl border border-borda bg-superficie" aria-label="Tela cheia" title="Tela cheia">
            <Maximize className="size-5" />
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-borda">
        {(
          [
            ["ativos", "Em andamento"],
            ["concluidos", `Concluídos (${concluidos.length})`],
            ["cancelados", `Cancelados (${cancelados.length})`],
          ] as const
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            onClick={() => setAba(valor)}
            aria-pressed={aba === valor}
            className={cn("min-h-11 border-b-2 px-3 font-semibold", aba === valor ? "border-marca-600 text-marca-700" : "border-transparent text-texto-suave")}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {aba === "ativos" && (
        <>
          {aguardando.length > 0 && (
            <div className="rounded-2xl border border-borda bg-superficie p-3">
              <p className="mb-2 text-sm font-bold text-texto-suave">Aguardando pagamento online</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{aguardando.map(cartao)}</div>
            </div>
          )}
          <div className="flex gap-2 overflow-x-auto lg:hidden">
            {COLUNAS.map((coluna, i) => (
              <button
                key={coluna.titulo}
                type="button"
                onClick={() => setColunaCelular(i)}
                aria-pressed={colunaCelular === i}
                className={cn(
                  "min-h-10 shrink-0 rounded-full px-4 text-sm font-bold",
                  colunaCelular === i ? "bg-texto text-white" : "bg-superficie text-texto-suave",
                )}
              >
                {coluna.titulo} {pedidos.filter((p) => coluna.status.includes(p.status as StatusPedido)).length}
              </button>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-4">
            {COLUNAS.map((coluna, i) => {
              const itens = pedidos.filter((p) => coluna.status.includes(p.status as StatusPedido));
              return (
                <section key={coluna.titulo} className={cn("flex flex-col gap-2", colunaCelular !== i && "hidden lg:flex")}>
                  <h2 className="hidden items-center gap-2 font-bold lg:flex">
                    <span className={cn("size-2.5 rounded-full", coluna.cor)} aria-hidden />
                    {coluna.titulo} <span className="text-texto-suave">{itens.length}</span>
                  </h2>
                  {itens.length === 0 ? <p className="rounded-2xl border border-dashed border-borda p-6 text-center text-sm text-texto-suave">Nenhum pedido.</p> : itens.map(cartao)}
                </section>
              );
            })}
          </div>
        </>
      )}

      {aba !== "ativos" && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(aba === "concluidos" ? concluidos : cancelados).map(cartao)}
          {(aba === "concluidos" ? concluidos : cancelados).length === 0 && <p className="py-10 text-center text-texto-suave sm:col-span-2 lg:col-span-3">Nenhum pedido nas últimas 24 horas.</p>}
        </div>
      )}

      {selecionado && <DetalhePedido pedido={selecionado} perfil={perfil} aoFechar={() => setSelecionadoId(null)} />}
    </div>
  );
}

function CartaoPedido({ pedido, agora, novo, aoAbrir }: { pedido: PedidoCompleto; agora: number; novo: boolean; aoAbrir: () => void }) {
  const minutos = Math.max(0, Math.floor((agora - new Date(pedido.criadoEm).getTime()) / 60_000));
  const ativo = !["entregue", "cancelado"].includes(pedido.status);
  const agendado = pedido.agendadoPara ? new Date(pedido.agendadoPara) : null;
  const corTempo = !ativo || agendado ? "text-texto-suave" : minutos >= MINUTOS_ATRASO ? "text-status-cancelado" : minutos >= MINUTOS_ATENCAO ? "text-status-atrasado" : "text-texto-suave";
  const quantidade = pedido.itens.reduce((s, i) => s + i.quantidade, 0);

  return (
    <button
      type="button"
      onClick={aoAbrir}
      className={cn(
        "flex w-full flex-col gap-2 rounded-2xl border bg-superficie p-4 text-left transition-shadow hover:shadow-md",
        novo ? "animate-pulse border-status-novo ring-2 ring-status-novo/30" : "border-borda",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-lg font-bold">#{pedido.numero}</span>
        <span className="rounded-full bg-fundo px-2.5 py-0.5 text-xs font-bold text-texto-suave">{NOME_CANAL[pedido.canal as CanalPedido]}</span>
      </div>
      <p className="truncate font-semibold">{pedido.nomeCliente}</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-texto-suave">
        <span className="flex items-center gap-1">
          {pedido.tipo === "entrega" ? <Bike className="size-4" aria-hidden /> : <ShoppingBag className="size-4" aria-hidden />}
          {pedido.tipo === "entrega" ? (pedido.endereco?.bairro ?? "Entrega") : "Retirada"}
        </span>
        <span>
          {quantidade} {quantidade === 1 ? "item" : "itens"}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-bold">{formatarDinheiro(pedido.total)}</span>
        <span className="text-texto-suave">
          {NOME_PAGAMENTO[pedido.formaPagamento as FormaPagamento] ?? "Online"}
          {pedido.statusPagamento === "pago" ? " · pago" : ""}
        </span>
      </div>
      {agendado ? (
        <span className="flex items-center gap-1 text-sm font-bold text-status-saiu">
          <CalendarClock className="size-4" aria-hidden />
          {formatoDiaHora.format(agendado)}
        </span>
      ) : (
        <span className={cn("text-sm font-semibold", corTempo)}>
          {formatoHora.format(new Date(pedido.criadoEm))}
          {ativo && ` · há ${minutos} min`}
        </span>
      )}
    </button>
  );
}
