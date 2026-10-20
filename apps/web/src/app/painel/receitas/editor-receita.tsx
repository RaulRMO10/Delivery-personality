"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import {
  UNIDADES,
  calcularCustoReceita,
  criaCiclo,
  custoUnitarioInsumo,
  formatarDinheiro,
  formatarNumero,
  lerNumero,
  type Receita,
  type Unidade,
} from "@delivery/core";
import { Botao } from "@/components/ui/botao";
import { AreaTexto, Campo, Selecao } from "@/components/ui/campo";
import { Cartao } from "@/components/ui/cartao";
import { Aviso } from "@/components/ui/aviso";
import type { InsumoLista, ReceitaCompleta } from "./dados";
import { excluirReceita, salvarReceita } from "./acoes";
import { custoPorRendimento } from "./rotulos";

interface Linha {
  chave: string;
  /** "insumo:<id>" ou "receita:<id>"; vazio enquanto não selecionado. */
  ref: string;
  quantidade: string;
}

interface Props {
  receitas: ReceitaCompleta[];
  insumos: InsumoLista[];
  receita?: ReceitaCompleta;
}

const ID_RASCUNHO = "rascunho";

const paraTexto = (n: number) => formatarNumero(n).replace(/\./g, "");

function novaLinha(ref = "", quantidade = ""): Linha {
  return { chave: crypto.randomUUID(), ref, quantidade };
}

function separarRef(ref: string) {
  const [tipo, id] = ref.split(":") as ["insumo" | "receita", string];
  return { tipo, id };
}

export function EditorReceita({ receitas, insumos, receita }: Props) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState(receita?.nome ?? "");
  const [rendimento, setRendimento] = useState(receita ? paraTexto(receita.rendimento) : "");
  const [unidade, setUnidade] = useState<Unidade>(receita?.unidadeRendimento ?? "un");
  const [perda, setPerda] = useState(receita ? paraTexto(receita.perdaPercentual) : "0");
  const [tempo, setTempo] = useState(receita?.tempoPreparoMin?.toString() ?? "");
  const [modoPreparo, setModoPreparo] = useState(receita?.modoPreparo ?? "");
  const [linhas, setLinhas] = useState<Linha[]>(() =>
    receita
      ? receita.itens.map((i) => novaLinha(i.tipo === "insumo" ? `insumo:${i.insumoId}` : `receita:${i.receitaId}`, paraTexto(i.quantidade)))
      : [novaLinha()],
  );

  const mapaInsumos = useMemo(() => new Map(insumos.map((i) => [i.id, i])), [insumos]);
  const mapaReceitas = useMemo(() => new Map<string, Receita>(receitas.map((r) => [r.id, r])), [receitas]);
  const idAtual = receita?.id ?? ID_RASCUNHO;

  // Sub-receitas possíveis: exclui a própria e as que gerariam referência circular.
  const subReceitas = receitas.filter((r) => r.id !== idAtual && !criaCiclo(idAtual, r.id, mapaReceitas));
  const ingredientes = insumos.filter((i) => i.tipo === "ingrediente");
  const embalagens = insumos.filter((i) => i.tipo === "embalagem");

  function unidadeDaLinha(ref: string): Unidade | null {
    if (!ref) return null;
    const { tipo, id } = separarRef(ref);
    return tipo === "insumo" ? (mapaInsumos.get(id)?.unidade ?? null) : (mapaReceitas.get(id)?.unidadeRendimento ?? null);
  }

  function custoDaLinha(linha: Linha): number | null {
    const quantidade = lerNumero(linha.quantidade);
    if (!linha.ref || quantidade === null || quantidade <= 0) return null;
    const { tipo, id } = separarRef(linha.ref);
    try {
      if (tipo === "insumo") {
        const insumo = mapaInsumos.get(id);
        return insumo ? custoUnitarioInsumo(insumo) * quantidade : null;
      }
      return calcularCustoReceita(id, mapaReceitas, mapaInsumos).porUnidade * quantidade;
    } catch {
      return null;
    }
  }

  const custosLinhas = linhas.map(custoDaLinha);
  const total = custosLinhas.reduce<number>((soma, c) => soma + (c ?? 0), 0);
  const rendimentoNumero = lerNumero(rendimento);
  const perdaNumero = lerNumero(perda) ?? 0;
  const rendimentoReal = rendimentoNumero && rendimentoNumero > 0 && perdaNumero >= 0 && perdaNumero < 100 ? rendimentoNumero * (1 - perdaNumero / 100) : null;

  function alterarLinha(chave: string, campos: Partial<Linha>) {
    setLinhas((atuais) => atuais.map((l) => (l.chave === chave ? { ...l, ...campos } : l)));
  }

  function salvar() {
    setErro(null);
    iniciar(async () => {
      const resultado = await salvarReceita({
        id: receita?.id,
        nome,
        rendimento,
        unidadeRendimento: unidade,
        perdaPercentual: perda,
        tempoPreparoMin: tempo,
        modoPreparo,
        itens: linhas
          .filter((l) => l.ref || l.quantidade)
          .map((l) => ({ tipo: l.ref ? separarRef(l.ref).tipo : "insumo", refId: l.ref ? separarRef(l.ref).id : "", quantidade: l.quantidade })),
      });
      if (!resultado.ok) {
        setErro(resultado.mensagem);
        return;
      }
      router.push("/painel/receitas");
    });
  }

  function excluir() {
    if (!receita || !confirm(`Excluir "${receita.nome}"?`)) return;
    setErro(null);
    iniciar(async () => {
      const resultado = await excluirReceita(receita.id);
      if (resultado && !resultado.ok) {
        setErro(resultado.mensagem);
        return;
      }
      router.push("/painel/receitas");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Cartao className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Campo rotulo="Nome" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="off" required />
        </div>
        <div className="grid grid-cols-[1fr_6rem] gap-3">
          <Campo rotulo="Rendimento" value={rendimento} onChange={(e) => setRendimento(e.target.value)} inputMode="decimal" required />
          <Selecao rotulo="Unidade" value={unidade} onChange={(e) => setUnidade(e.target.value as Unidade)}>
            {UNIDADES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Selecao>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Perda (%)" value={perda} onChange={(e) => setPerda(e.target.value)} inputMode="decimal" />
          <Campo rotulo="Preparo (min)" value={tempo} onChange={(e) => setTempo(e.target.value)} inputMode="numeric" />
        </div>
      </Cartao>

      <Cartao className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Itens</h2>
        {insumos.length === 0 && receitas.length === 0 && (
          <Aviso>
            Cadastre ingredientes antes.{" "}
            <Link href="/painel/receitas/ingredientes" className="font-semibold text-marca-600 hover:underline">
              Ir para ingredientes
            </Link>
          </Aviso>
        )}
        <ul className="flex flex-col gap-3">
          {linhas.map((linha, indice) => {
            const unidadeLinha = unidadeDaLinha(linha.ref);
            const custo = custosLinhas[indice];
            return (
              <li key={linha.chave} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_9rem_7rem_auto] sm:items-center">
                <select
                  aria-label={`Item ${indice + 1}`}
                  value={linha.ref}
                  onChange={(e) => alterarLinha(linha.chave, { ref: e.target.value })}
                  className="col-span-2 min-h-12 rounded-xl border border-borda bg-superficie px-3 sm:col-span-1"
                >
                  <option value="">Selecione</option>
                  {ingredientes.length > 0 && (
                    <optgroup label="Ingredientes">
                      {ingredientes.map((i) => (
                        <option key={i.id} value={`insumo:${i.id}`}>
                          {i.nome}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {embalagens.length > 0 && (
                    <optgroup label="Embalagens">
                      {embalagens.map((i) => (
                        <option key={i.id} value={`insumo:${i.id}`}>
                          {i.nome}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {subReceitas.length > 0 && (
                    <optgroup label="Receitas">
                      {subReceitas.map((r) => (
                        <option key={r.id} value={`receita:${r.id}`}>
                          {r.nome}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <div className="flex min-h-12 items-center rounded-xl border border-borda bg-superficie focus-within:border-marca-500">
                  <input
                    aria-label={`Quantidade do item ${indice + 1}`}
                    value={linha.quantidade}
                    onChange={(e) => alterarLinha(linha.chave, { quantidade: e.target.value })}
                    inputMode="decimal"
                    className="w-full min-w-0 bg-transparent px-3 outline-none"
                  />
                  <span className="pr-3 text-sm text-texto-suave">{unidadeLinha ?? ""}</span>
                </div>
                <p className="hidden text-right font-semibold sm:block">{custo === null ? "—" : formatarDinheiro(custo)}</p>
                <button
                  type="button"
                  onClick={() => setLinhas((atuais) => atuais.filter((l) => l.chave !== linha.chave))}
                  className="flex size-12 items-center justify-center rounded-xl text-texto-suave hover:bg-fundo hover:text-status-cancelado"
                  aria-label={`Remover item ${indice + 1}`}
                >
                  <Trash2 className="size-5" />
                </button>
              </li>
            );
          })}
        </ul>
        <Botao variante="secundario" onClick={() => setLinhas((atuais) => [...atuais, novaLinha()])} className="self-start">
          <Plus className="size-5" aria-hidden />
          Adicionar item
        </Botao>
        <dl className="mt-2 grid grid-cols-2 gap-3 rounded-xl bg-fundo p-4">
          <div>
            <dt className="text-sm text-texto-suave">Custo total</dt>
            <dd className="text-xl font-bold">{formatarDinheiro(total)}</dd>
          </div>
          <div>
            <dt className="text-sm text-texto-suave">Custo por {unidade === "un" ? "unidade" : unidade === "g" ? "kg" : "litro"}</dt>
            <dd className="text-xl font-bold">{rendimentoReal ? custoPorRendimento(total / rendimentoReal, unidade) : "—"}</dd>
          </div>
        </dl>
      </Cartao>

      <Cartao>
        <AreaTexto rotulo="Modo de preparo (opcional)" value={modoPreparo} onChange={(e) => setModoPreparo(e.target.value)} />
      </Cartao>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-3">
          <Botao onClick={salvar} disabled={pendente}>
            Salvar
          </Botao>
          <Link href="/painel/receitas" className="inline-flex min-h-12 items-center px-4 font-semibold text-texto-suave hover:text-texto">
            Cancelar
          </Link>
        </div>
        {receita && (
          <Botao variante="fantasma" onClick={excluir} disabled={pendente} className="text-status-cancelado">
            Excluir receita
          </Botao>
        )}
      </div>
    </div>
  );
}
