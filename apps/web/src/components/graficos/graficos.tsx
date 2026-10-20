"use client";

import { useState } from "react";
import { formatarDinheiro } from "@delivery/core";

export interface Ponto {
  rotulo: string;
  valor: number;
  detalhe?: string;
}

type Formato = "dinheiro" | "numero";

function formatar(valor: number, formato: Formato) {
  return formato === "dinheiro" ? formatarDinheiro(valor) : new Intl.NumberFormat("pt-BR").format(valor);
}

/** Rótulo compacto do eixo: 1,2 mil / R$ 3,4 mil. */
function compacto(valor: number, formato: Formato) {
  const numero = formato === "dinheiro" ? valor / 100 : valor;
  const texto = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(numero);
  return formato === "dinheiro" ? `R$ ${texto}` : texto;
}

/** Máximo "redondo" para o eixo (1, 2, 2,5 ou 5 × 10^n). */
function maximoRedondo(valor: number) {
  if (valor <= 0) return 1;
  const potencia = 10 ** Math.floor(Math.log10(valor));
  return ([1, 2, 2.5, 5, 10].find((m) => m * potencia >= valor) ?? 10) * potencia;
}

/**
 * Colunas verticais para séries no tempo (uma série, sem legenda).
 * Cada coluna é alvo de foco/hover com a dica do valor.
 */
export function Colunas({
  dados,
  formato,
  rotulosEixo,
  altura = 200,
}: {
  dados: Ponto[];
  formato: Formato;
  /** Texto exibido sob cada coluna (null = sem rótulo), para não poluir séries longas. */
  rotulosEixo?: (string | null)[];
  altura?: number;
}) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const maximo = maximoRedondo(Math.max(...dados.map((d) => d.valor), 0));
  const marcas = [maximo, maximo / 2, 0];

  return (
    <div className="relative flex gap-2" role="img" aria-label="Gráfico de colunas">
      <div className="flex flex-col justify-between text-right text-xs text-texto-suave" style={{ height: altura }}>
        {marcas.map((m) => (
          <span key={m} className="-translate-y-1/2 leading-none first:translate-y-0 last:translate-y-0">
            {compacto(m, formato)}
          </span>
        ))}
      </div>
      <div className="relative min-w-0 flex-1">
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-between" style={{ height: altura }} aria-hidden>
          {marcas.map((m) => (
            <div key={m} className="h-px bg-borda" />
          ))}
        </div>
        <div className="relative flex items-end gap-[2px]" style={{ height: altura }}>
          {dados.map((d, i) => (
            <div
              key={d.rotulo}
              tabIndex={0}
              onPointerEnter={() => setAtivo(i)}
              onPointerLeave={() => setAtivo(null)}
              onFocus={() => setAtivo(i)}
              onBlur={() => setAtivo(null)}
              aria-label={`${d.rotulo}: ${formatar(d.valor, formato)}`}
              className="group flex h-full min-w-0 flex-1 cursor-default items-end justify-center outline-none"
            >
              <div
                className="w-full max-w-6 rounded-t-[4px] bg-marca-600 transition-opacity group-hover:opacity-80 group-focus-visible:ring-2 group-focus-visible:ring-marca-200"
                style={{ height: `${(d.valor / maximo) * 100}%`, minHeight: d.valor > 0 ? 2 : 0 }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-[2px] text-[11px] text-texto-suave" aria-hidden>
          {dados.map((d, i) => (
            <span key={d.rotulo} className="min-w-0 flex-1 overflow-visible text-center whitespace-nowrap">
              {rotulosEixo ? rotulosEixo[i] : d.rotulo}
            </span>
          ))}
        </div>
        {ativo !== null && dados[ativo] && (
          <div
            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-borda bg-superficie px-3 py-2 text-sm whitespace-nowrap shadow-md"
            style={{ left: `${((ativo + 0.5) / dados.length) * 100}%` }}
          >
            <p className="font-bold">{formatar(dados[ativo].valor, formato)}</p>
            <p className="text-texto-suave">
              {dados[ativo].rotulo}
              {dados[ativo].detalhe ? ` · ${dados[ativo].detalhe}` : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Barras horizontais para categorias, com o valor na ponta de cada barra. */
export function Barras({ dados, formato }: { dados: Ponto[]; formato: Formato }) {
  const maximo = Math.max(...dados.map((d) => d.valor), 1);
  if (dados.length === 0) return <p className="text-sm text-texto-suave">Sem dados no período.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {dados.map((d) => (
        <li key={d.rotulo} className="grid grid-cols-[minmax(5rem,9rem)_1fr] items-center gap-3" title={d.detalhe}>
          <span className="truncate text-sm">{d.rotulo}</span>
          <span className="flex items-center gap-2">
            <span className="h-5 max-w-full rounded-r-[4px] bg-marca-600" style={{ width: `${Math.max((d.valor / maximo) * 85, 1)}%` }} aria-hidden />
            <span className="text-sm font-semibold whitespace-nowrap">{formatar(d.valor, formato)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
