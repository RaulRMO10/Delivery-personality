"use client";

import { useEffect, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { descreverRegraGrupo, formatarDinheiro, precoComAdicionais, validarEscolhas, type Escolha, type GrupoComplemento } from "@delivery/core";
import { cn } from "@/lib/utils";
import type { ProdutoPublico } from "@/lib/cardapio-publico";
import { useCarrinho } from "./carrinho";

/** Quantidade escolhida por opção, por grupo. */
type Selecao = Record<string, Record<string, number>>;

function paraEscolhas(selecao: Selecao): Escolha[] {
  return Object.entries(selecao).flatMap(([grupoId, opcoes]) =>
    Object.entries(opcoes)
      .filter(([, quantidade]) => quantidade > 0)
      .map(([opcaoId, quantidade]) => ({ grupoId, opcaoId, quantidade })),
  );
}

function resumo(grupos: GrupoComplemento[], escolhas: Escolha[]) {
  return escolhas
    .map((e) => {
      const opcao = grupos.find((g) => g.id === e.grupoId)?.opcoes.find((o) => o.id === e.opcaoId);
      return opcao ? (e.quantidade > 1 ? `${e.quantidade}× ${opcao.nome}` : opcao.nome) : "";
    })
    .filter(Boolean)
    .join(", ");
}

export function Contador({ valor, aoMudar, minimo = 0, maximo, rotulo }: { valor: number; aoMudar: (n: number) => void; minimo?: number; maximo?: number; rotulo: string }) {
  const botao = "flex size-10 items-center justify-center rounded-full border border-borda bg-superficie text-marca-600 disabled:opacity-30";
  return (
    <div className="flex items-center gap-3">
      <button type="button" className={botao} onClick={() => aoMudar(valor - 1)} disabled={valor <= minimo} aria-label={`Diminuir ${rotulo}`}>
        <Minus className="size-4" />
      </button>
      <span className="w-6 text-center font-bold" aria-live="polite">
        {valor}
      </span>
      <button type="button" className={botao} onClick={() => aoMudar(valor + 1)} disabled={maximo !== undefined && valor >= maximo} aria-label={`Aumentar ${rotulo}`}>
        <Plus className="size-4" />
      </button>
    </div>
  );
}

export function JanelaProduto({ produto, aoFechar }: { produto: ProdutoPublico; aoFechar: () => void }) {
  const { adicionar } = useCarrinho();
  const [selecao, setSelecao] = useState<Selecao>({});
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState("");

  useEffect(() => {
    const fechar = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", fechar);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", fechar);
      document.body.style.overflow = "";
    };
  }, [aoFechar]);

  const escolhas = paraEscolhas(selecao);
  const erro = validarEscolhas(produto.grupos, escolhas);
  const precoUnitario = precoComAdicionais(produto.preco, produto.grupos, escolhas);

  function totalDoGrupo(grupoId: string) {
    return Object.values(selecao[grupoId] ?? {}).reduce((s, n) => s + n, 0);
  }

  function definir(grupo: GrupoComplemento, opcaoId: string, valor: number) {
    setSelecao((atual) => {
      if (grupo.maximo === 1) return { ...atual, [grupo.id]: valor > 0 ? { [opcaoId]: 1 } : {} };
      return { ...atual, [grupo.id]: { ...atual[grupo.id], [opcaoId]: Math.max(0, valor) } };
    });
  }

  function confirmar() {
    if (erro) return;
    adicionar({
      produtoId: produto.id,
      nome: produto.nome,
      precoUnitario,
      quantidade,
      escolhas,
      resumoOpcoes: resumo(produto.grupos, escolhas),
      observacao: observacao.trim(),
    });
    aoFechar();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true" aria-label={produto.nome} onClick={aoFechar}>
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-superficie sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative flex-1 overflow-y-auto">
          {produto.fotoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- foto servida pela própria API
            <img src={produto.fotoUrl} alt="" className="aspect-[4/3] w-full object-cover" />
          )}
          <button
            type="button"
            onClick={aoFechar}
            className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-full bg-superficie/90 shadow"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
          <div className="flex flex-col gap-5 p-5">
            <div>
              <h2 className="pr-12 text-xl font-bold">{produto.nome}</h2>
              {produto.descricao && <p className="mt-1 text-texto-suave">{produto.descricao}</p>}
              <p className="mt-2 text-lg font-bold">{formatarDinheiro(produto.preco)}</p>
            </div>

            {produto.grupos.map((grupo) => {
              const total = totalDoGrupo(grupo.id);
              const completo = total >= grupo.minimo;
              return (
                <fieldset key={grupo.id} className="flex flex-col gap-2">
                  <legend className="mb-2 flex w-full items-center justify-between gap-2 rounded-xl bg-fundo px-4 py-3">
                    <span>
                      <span className="block font-bold">{grupo.nome}</span>
                      <span className="text-sm text-texto-suave">{descreverRegraGrupo(grupo.minimo, grupo.maximo)}</span>
                    </span>
                    {grupo.minimo > 0 && (
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", completo ? "bg-status-pronto/10 text-status-pronto" : "bg-texto text-white")}>
                        {completo ? "OK" : "Obrigatório"}
                      </span>
                    )}
                  </legend>
                  {grupo.opcoes.map((opcao) => {
                    const valor = selecao[grupo.id]?.[opcao.id] ?? 0;
                    const adicional = opcao.precoAdicional > 0 ? `+ ${formatarDinheiro(opcao.precoAdicional)}` : null;
                    if (grupo.maximo === 1) {
                      return (
                        <label key={opcao.id} className={cn("flex min-h-12 items-center gap-3 px-1", opcao.esgotado && "opacity-50")}>
                          <input
                            type={grupo.minimo === 1 ? "radio" : "checkbox"}
                            name={grupo.id}
                            checked={valor > 0}
                            disabled={opcao.esgotado}
                            onChange={(e) => definir(grupo, opcao.id, e.target.checked ? 1 : 0)}
                            className="size-5 accent-marca-600"
                          />
                          <span className="flex-1">{opcao.nome}</span>
                          <span className="text-sm text-texto-suave">{opcao.esgotado ? "Esgotado" : adicional}</span>
                        </label>
                      );
                    }
                    return (
                      <div key={opcao.id} className={cn("flex min-h-12 items-center gap-3 px-1", opcao.esgotado && "opacity-50")}>
                        <span className="flex-1">
                          {opcao.nome}
                          {(adicional || opcao.esgotado) && <span className="block text-sm text-texto-suave">{opcao.esgotado ? "Esgotado" : adicional}</span>}
                        </span>
                        {!opcao.esgotado && (
                          <Contador valor={valor} aoMudar={(n) => definir(grupo, opcao.id, n)} maximo={valor + (grupo.maximo - total)} rotulo={opcao.nome} />
                        )}
                      </div>
                    );
                  })}
                </fieldset>
              );
            })}

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">Observação (opcional)</span>
              <textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                maxLength={200}
                rows={2}
                placeholder="Ex.: sem cebola"
                className="rounded-xl border border-borda px-4 py-3 outline-none focus:border-marca-500"
              />
            </label>
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-borda p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Contador valor={quantidade} aoMudar={setQuantidade} minimo={1} maximo={99} rotulo="quantidade" />
          <button
            type="button"
            onClick={confirmar}
            disabled={Boolean(erro)}
            className="flex min-h-12 flex-1 items-center justify-between rounded-xl bg-marca-600 px-5 font-bold text-white hover:bg-marca-700 disabled:opacity-50"
          >
            <span>Adicionar</span>
            <span>{formatarDinheiro(precoUnitario * quantidade)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
