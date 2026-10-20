"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  arredondarPreco,
  formatarDinheiro,
  formatarPercentual,
  lerDinheiro,
  lerNumero,
  precoSugerido,
  resultadoVenda,
  type Unidade,
} from "@delivery/core";
import { cn } from "@/lib/utils";
import { Botao } from "@/components/ui/botao";
import { Campo, Selecao } from "@/components/ui/campo";
import { Cartao } from "@/components/ui/cartao";
import { Aviso } from "@/components/ui/aviso";

interface Props {
  receitas: { id: string; nome: string; unidade: Unidade; custoPorUnidade: number }[];
  embalagens: { id: string; nome: string; unidade: Unidade; custoUnitario: number }[];
  canais: { id: string; nome: string; taxa: number }[];
  custosFixosPercentual: number;
  faturamentoInformado: boolean;
  margemPadrao: number;
}

interface LinhaEmbalagem {
  chave: string;
  id: string;
  quantidade: string;
}

export function Calculadora({ receitas, embalagens, canais, custosFixosPercentual, faturamentoInformado, margemPadrao }: Props) {
  const [receitaId, setReceitaId] = useState(receitas[0]!.id);
  const [quantidade, setQuantidade] = useState("1");
  const [margem, setMargem] = useState(String(margemPadrao).replace(".", ","));
  const [arredondar, setArredondar] = useState(true);
  const [linhas, setLinhas] = useState<LinhaEmbalagem[]>([]);
  const [precos, setPrecos] = useState<Record<string, string>>({});

  const receita = receitas.find((r) => r.id === receitaId)!;
  const qtd = lerNumero(quantidade) ?? 0;
  const custoReceita = receita.custoPorUnidade * Math.max(qtd, 0);
  const custoEmbalagens = linhas.reduce((soma, l) => {
    const embalagem = embalagens.find((e) => e.id === l.id);
    const n = lerNumero(l.quantidade) ?? 0;
    return soma + (embalagem ? embalagem.custoUnitario * Math.max(n, 0) : 0);
  }, 0);
  const custoVariavel = custoReceita + custoEmbalagens;
  const margemNumero = lerNumero(margem) ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <Cartao className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
        <Selecao rotulo="Receita" value={receitaId} onChange={(e) => setReceitaId(e.target.value)}>
          {receitas.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nome}
            </option>
          ))}
        </Selecao>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="quantidade" className="text-sm font-semibold">
            Quantidade vendida
          </label>
          <div className="flex min-h-12 items-center rounded-xl border border-borda bg-superficie focus-within:border-marca-500">
            <input id="quantidade" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} inputMode="decimal" className="w-full min-w-0 bg-transparent px-4 outline-none" />
            <span className="pr-4 text-sm text-texto-suave">{receita.unidade}</span>
          </div>
        </div>
        <Campo rotulo="Margem (%)" value={margem} onChange={(e) => setMargem(e.target.value)} inputMode="decimal" />
      </Cartao>

      <Cartao className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Embalagens</h2>
        {linhas.map((linha, i) => {
          const embalagem = embalagens.find((e) => e.id === linha.id);
          return (
            <div key={linha.chave} className="grid grid-cols-[1fr_7rem_auto] gap-2">
              <select
                aria-label={`Embalagem ${i + 1}`}
                value={linha.id}
                onChange={(e) => setLinhas((ls) => ls.map((l) => (l.chave === linha.chave ? { ...l, id: e.target.value } : l)))}
                className="min-h-12 rounded-xl border border-borda bg-superficie px-3"
              >
                <option value="">Selecione</option>
                {embalagens.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>
              <div className="flex min-h-12 items-center rounded-xl border border-borda bg-superficie">
                <input
                  aria-label={`Quantidade da embalagem ${i + 1}`}
                  value={linha.quantidade}
                  onChange={(e) => setLinhas((ls) => ls.map((l) => (l.chave === linha.chave ? { ...l, quantidade: e.target.value } : l)))}
                  inputMode="decimal"
                  className="w-full min-w-0 bg-transparent px-3 outline-none"
                />
                <span className="pr-3 text-sm text-texto-suave">{embalagem?.unidade ?? ""}</span>
              </div>
              <button
                type="button"
                onClick={() => setLinhas((ls) => ls.filter((l) => l.chave !== linha.chave))}
                className="flex size-12 items-center justify-center rounded-xl text-texto-suave hover:bg-fundo hover:text-status-cancelado"
                aria-label={`Remover embalagem ${i + 1}`}
              >
                <Trash2 className="size-5" />
              </button>
            </div>
          );
        })}
        {embalagens.length === 0 ? (
          <p className="text-sm text-texto-suave">Nenhuma embalagem cadastrada.</p>
        ) : (
          <Botao
            variante="secundario"
            className="self-start"
            onClick={() => setLinhas((ls) => [...ls, { chave: crypto.randomUUID(), id: "", quantidade: "1" }])}
          >
            <Plus className="size-5" aria-hidden />
            Adicionar embalagem
          </Botao>
        )}
      </Cartao>

      <Cartao className="flex flex-col gap-4">
        <dl className="grid grid-cols-3 gap-3 rounded-xl bg-fundo p-4">
          <div>
            <dt className="text-sm text-texto-suave">Receita</dt>
            <dd className="font-bold">{formatarDinheiro(custoReceita)}</dd>
          </div>
          <div>
            <dt className="text-sm text-texto-suave">Embalagens</dt>
            <dd className="font-bold">{formatarDinheiro(custoEmbalagens)}</dd>
          </div>
          <div>
            <dt className="text-sm text-texto-suave">Custo total</dt>
            <dd className="font-bold">{formatarDinheiro(custoVariavel)}</dd>
          </div>
        </dl>

        {!faturamentoInformado && <Aviso>Custos fixos não incluídos: informe o faturamento estimado em Custos fixos.</Aviso>}
        {canais.length === 0 && <Aviso>Nenhum canal ativo. Cadastre em Canais.</Aviso>}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={arredondar} onChange={(e) => setArredondar(e.target.checked)} className="size-4 accent-marca-600" />
          Arredondar para R$ 0,50
        </label>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left">
            <thead className="text-sm text-texto-suave">
              <tr>
                <th className="py-2 font-semibold">Canal</th>
                <th className="py-2 font-semibold">Taxa</th>
                <th className="py-2 font-semibold">Preço sugerido</th>
                <th className="py-2 font-semibold">Preço praticado</th>
                <th className="py-2 text-right font-semibold">Margem real</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borda">
              {canais.map((canal) => {
                const base = { custoVariavel, taxaCanalPercentual: canal.taxa, custosFixosPercentual };
                const sugerido = precoSugerido({ ...base, margemPercentual: margemNumero });
                const praticado = lerDinheiro(precos[canal.id] ?? "");
                const real = praticado !== null && praticado > 0 ? resultadoVenda(praticado, base) : null;
                return (
                  <tr key={canal.id}>
                    <td className="py-3 font-semibold">{canal.nome}</td>
                    <td className="py-3">{formatarPercentual(canal.taxa)}</td>
                    <td className="py-3 font-bold">
                      {sugerido.viavel ? formatarDinheiro(arredondar ? arredondarPreco(sugerido.preco) : Math.round(sugerido.preco)) : <span className="text-sm font-normal text-status-cancelado">{sugerido.motivo}</span>}
                    </td>
                    <td className="py-3">
                      <input
                        aria-label={`Preço praticado no canal ${canal.nome}`}
                        placeholder="R$"
                        value={precos[canal.id] ?? ""}
                        onChange={(e) => setPrecos((p) => ({ ...p, [canal.id]: e.target.value }))}
                        inputMode="decimal"
                        className="min-h-11 w-28 rounded-xl border border-borda bg-superficie px-3 outline-none focus:border-marca-500"
                      />
                    </td>
                    <td
                      className={cn(
                        "py-3 text-right font-bold",
                        real && real.lucro < 0 && "text-status-cancelado",
                        real && real.lucro >= 0 && real.margemPercentual < margemNumero && "text-status-atrasado",
                        real && real.margemPercentual >= margemNumero && "text-status-pronto",
                      )}
                    >
                      {real ? (
                        <>
                          {formatarPercentual(real.margemPercentual)}
                          <span className="block text-xs font-normal">{real.lucro < 0 ? "Prejuízo" : "Lucro"} {formatarDinheiro(Math.abs(real.lucro))}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Cartao>
    </div>
  );
}
