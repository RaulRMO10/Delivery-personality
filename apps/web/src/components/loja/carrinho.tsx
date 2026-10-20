"use client";

import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Escolha } from "@delivery/core";

/** Item do carrinho. Nome e preço servem só para exibição; o servidor recalcula tudo. */
export interface ItemNoCarrinho {
  chave: string;
  produtoId: string;
  nome: string;
  precoUnitario: number;
  quantidade: number;
  escolhas: Escolha[];
  resumoOpcoes: string;
  observacao: string;
}

interface ContextoCarrinho {
  itens: ItemNoCarrinho[];
  carregado: boolean;
  quantidadeTotal: number;
  subtotal: number;
  adicionar: (item: Omit<ItemNoCarrinho, "chave">) => void;
  alterarQuantidade: (chave: string, quantidade: number) => void;
  remover: (chave: string) => void;
  limpar: () => void;
}

const Contexto = createContext<ContextoCarrinho | null>(null);
const CHAVE = "carrinho:v1";

function ler(): ItemNoCarrinho[] {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? "[]");
    return Array.isArray(salvo) ? salvo : [];
  } catch {
    return [];
  }
}

export function CarrinhoProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemNoCarrinho[]>([]);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    // Leitura do armazenamento local só existe no navegador.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItens(ler());
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (!carregado) return;
    try {
      localStorage.setItem(CHAVE, JSON.stringify(itens));
    } catch {
      // Armazenamento indisponível (ex.: navegação privada): o carrinho vale só nesta aba.
    }
  }, [itens, carregado]);

  const adicionar = useCallback((item: Omit<ItemNoCarrinho, "chave">) => {
    setItens((atuais) => [...atuais, { ...item, chave: crypto.randomUUID() }]);
  }, []);

  const alterarQuantidade = useCallback((chave: string, quantidade: number) => {
    setItens((atuais) => (quantidade <= 0 ? atuais.filter((i) => i.chave !== chave) : atuais.map((i) => (i.chave === chave ? { ...i, quantidade } : i))));
  }, []);

  const remover = useCallback((chave: string) => setItens((atuais) => atuais.filter((i) => i.chave !== chave)), []);
  const limpar = useCallback(() => setItens([]), []);

  const valor = useMemo(
    () => ({
      itens,
      carregado,
      quantidadeTotal: itens.reduce((s, i) => s + i.quantidade, 0),
      subtotal: itens.reduce((s, i) => s + i.precoUnitario * i.quantidade, 0),
      adicionar,
      alterarQuantidade,
      remover,
      limpar,
    }),
    [itens, carregado, adicionar, alterarQuantidade, remover, limpar],
  );

  return <Contexto value={valor}>{children}</Contexto>;
}

export function useCarrinho() {
  const contexto = use(Contexto);
  if (!contexto) throw new Error("useCarrinho fora do CarrinhoProvider");
  return contexto;
}

const CHAVE_PEDIDOS = "pedidos:v1";

/** Códigos dos pedidos feitos neste aparelho (mais recente primeiro). */
export function lerPedidosDoAparelho(): { codigo: string; numero: number; criadoEm: string }[] {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_PEDIDOS) ?? "[]");
    return Array.isArray(salvo) ? salvo : [];
  } catch {
    return [];
  }
}

export function guardarPedidoNoAparelho(pedido: { codigo: string; numero: number }) {
  try {
    const lista = [{ ...pedido, criadoEm: new Date().toISOString() }, ...lerPedidosDoAparelho().filter((p) => p.codigo !== pedido.codigo)].slice(0, 30);
    localStorage.setItem(CHAVE_PEDIDOS, JSON.stringify(lista));
  } catch {
    // Sem armazenamento local: o cliente ainda tem o link do pedido.
  }
}
