"use client";

import { useState, useTransition } from "react";
import { MessageCircle, Printer } from "lucide-react";
import {
  FUSO_LOJA,
  NOME_CANAL,
  NOME_PAGAMENTO,
  NOME_STATUS,
  ROTULO_AVANCO,
  formatarDinheiro,
  formatarTelefone,
  perfilPodeMudarStatus,
  proximoPasso,
  type CanalPedido,
  type FormaPagamento,
  type Perfil,
  type StatusPedido,
} from "@delivery/core";
import type { PedidoCompleto } from "@/lib/pedidos";
import { Botao } from "@/components/ui/botao";
import { Dialogo } from "@/components/ui/dialogo";
import { Aviso } from "@/components/ui/aviso";
import { Selo } from "@/components/ui/selo";
import { alterarStatus, marcarPago } from "./acoes";

const formatoHora = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_LOJA, hour: "2-digit", minute: "2-digit" });
const formatoDataHora = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_LOJA, weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const MOTIVOS = ["Cliente desistiu", "Produto indisponível", "Endereço fora da área", "Pedido duplicado", "Loja sem condições de atender"];

export function DetalhePedido({ pedido, perfil, aoFechar }: { pedido: PedidoCompleto; perfil: Perfil; aoFechar: () => void }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState("");

  const status = pedido.status as StatusPedido;
  const proximo = proximoPasso(status, pedido.tipo);
  const podeAvancar = proximo !== null && perfilPodeMudarStatus(perfil, status, proximo, pedido.tipo);
  const podeCancelar = perfilPodeMudarStatus(perfil, status, "cancelado", pedido.tipo);
  const pagamentoPendente = pedido.statusPagamento === "pendente" && pedido.formaPagamento !== "online";

  const executar = (acao: () => Promise<{ ok: true } | { ok: false; mensagem: string }>, fechar = false) =>
    iniciar(async () => {
      setErro(null);
      const resultado = await acao();
      if (!resultado.ok) setErro(resultado.mensagem);
      else if (fechar) aoFechar();
    });

  return (
    <Dialogo titulo={`Pedido #${pedido.numero}`} aoFechar={aoFechar}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-1.5">
          <Selo className="bg-texto text-white">{NOME_STATUS[status]}</Selo>
          <Selo>{NOME_CANAL[pedido.canal as CanalPedido]}</Selo>
          <Selo>{pedido.tipo === "entrega" ? "Entrega" : "Retirada"}</Selo>
          {pedido.codigoExterno && <Selo>{pedido.codigoExterno}</Selo>}
        </div>

        {pedido.agendadoPara && (
          <Aviso>Agendado para {formatoDataHora.format(new Date(pedido.agendadoPara))}</Aviso>
        )}

        <div className="text-sm">
          <p className="font-semibold">{pedido.nomeCliente}</p>
          {pedido.telefoneCliente && (
            <a
              href={`https://wa.me/55${pedido.telefoneCliente}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-marca-600 hover:underline"
            >
              <MessageCircle className="size-4" aria-hidden />
              {formatarTelefone(pedido.telefoneCliente)}
            </a>
          )}
          {pedido.endereco && (
            <p className="mt-1 text-texto-suave">
              {pedido.endereco.rua}, {pedido.endereco.numero}
              {pedido.endereco.complemento ? ` – ${pedido.endereco.complemento}` : ""} · {pedido.endereco.bairro}
              {pedido.endereco.referencia ? ` · Ref.: ${pedido.endereco.referencia}` : ""}
            </p>
          )}
        </div>

        <ul className="divide-y divide-borda rounded-xl border border-borda">
          {pedido.itens.map((item) => (
            <li key={item.id} className="p-3">
              <div className="flex justify-between gap-2">
                <span className="font-bold">
                  {item.quantidade}× {item.nome}
                </span>
                <span>{formatarDinheiro(item.precoUnitario * item.quantidade)}</span>
              </div>
              {item.opcoes.length > 0 && (
                <ul className="mt-1 text-sm text-texto-suave">
                  {item.opcoes.map((o, i) => (
                    <li key={i}>
                      {o.quantidade > 1 ? `${o.quantidade}× ` : ""}
                      {o.opcao}
                    </li>
                  ))}
                </ul>
              )}
              {item.observacao && <p className="mt-1 text-sm font-semibold text-status-atrasado">Obs.: {item.observacao}</p>}
            </li>
          ))}
        </ul>

        {pedido.observacao && <Aviso>Observação: {pedido.observacao}</Aviso>}

        <dl className="grid grid-cols-2 gap-1 text-sm">
          <dt className="text-texto-suave">Subtotal</dt>
          <dd className="text-right">{formatarDinheiro(pedido.subtotal)}</dd>
          {pedido.desconto > 0 && (
            <>
              <dt className="text-texto-suave">Desconto</dt>
              <dd className="text-right">− {formatarDinheiro(pedido.desconto)}</dd>
            </>
          )}
          <dt className="text-texto-suave">Entrega</dt>
          <dd className="text-right">{formatarDinheiro(pedido.taxaEntrega)}</dd>
          <dt className="font-bold">Total</dt>
          <dd className="text-right font-bold">{formatarDinheiro(pedido.total)}</dd>
          <dt className="text-texto-suave">Pagamento</dt>
          <dd className="text-right">
            {NOME_PAGAMENTO[pedido.formaPagamento as FormaPagamento] ?? "Online"} · {pedido.statusPagamento === "pago" ? "pago" : "pendente"}
          </dd>
          {pedido.trocoPara && (
            <>
              <dt className="text-texto-suave">Troco para</dt>
              <dd className="text-right">
                {formatarDinheiro(pedido.trocoPara)} (levar {formatarDinheiro(pedido.trocoPara - pedido.total)})
              </dd>
            </>
          )}
        </dl>

        {pedido.motivoCancelamento && <Aviso tipo="erro">Cancelado: {pedido.motivoCancelamento}</Aviso>}

        <details className="text-sm">
          <summary className="cursor-pointer font-semibold text-texto-suave">Histórico</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {pedido.historico.map((h, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span>
                  {NOME_STATUS[h.status as StatusPedido] ?? h.status}
                  {h.usuario ? ` · ${h.usuario}` : ""}
                </span>
                <span className="text-texto-suave">{formatoHora.format(new Date(h.criadoEm))}</span>
              </li>
            ))}
          </ul>
        </details>

        {erro && <Aviso tipo="erro">{erro}</Aviso>}

        {cancelando ? (
          <div className="flex flex-col gap-2 rounded-xl border border-status-cancelado/30 p-3">
            <p className="text-sm font-semibold">Motivo do cancelamento</p>
            <div className="flex flex-wrap gap-1.5">
              {MOTIVOS.map((m) => (
                <button key={m} type="button" onClick={() => setMotivo(m)} className="rounded-full border border-borda px-3 py-1.5 text-sm hover:bg-fundo">
                  {m}
                </button>
              ))}
            </div>
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={300}
              placeholder="Motivo"
              aria-label="Motivo do cancelamento"
              className="min-h-11 rounded-xl border border-borda px-3 outline-none focus:border-marca-500"
            />
            <div className="flex gap-2">
              <Botao variante="perigo" disabled={pendente || !motivo.trim()} onClick={() => executar(() => alterarStatus(pedido.id, "cancelado", motivo), true)}>
                Confirmar cancelamento
              </Botao>
              <Botao variante="fantasma" onClick={() => setCancelando(false)}>
                Voltar
              </Botao>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {podeAvancar && proximo && (
              <Botao disabled={pendente} onClick={() => executar(() => alterarStatus(pedido.id, proximo))} className="min-h-14 text-lg">
                {ROTULO_AVANCO[proximo] ?? NOME_STATUS[proximo]}
              </Botao>
            )}
            <div className="flex flex-wrap gap-2">
              {pagamentoPendente && status !== "cancelado" && (
                <Botao variante="secundario" disabled={pendente} onClick={() => executar(() => marcarPago(pedido.id))}>
                  Marcar como pago
                </Botao>
              )}
              <a
                href={`/comanda/${pedido.id}`}
                target="_blank"
                rel="noopener"
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-borda px-4 font-semibold hover:bg-fundo"
              >
                <Printer className="size-5" aria-hidden />
                Imprimir
              </a>
              {podeCancelar && (
                <Botao variante="fantasma" className="text-status-cancelado" onClick={() => setCancelando(true)}>
                  Cancelar pedido
                </Botao>
              )}
            </div>
          </div>
        )}
      </div>
    </Dialogo>
  );
}
