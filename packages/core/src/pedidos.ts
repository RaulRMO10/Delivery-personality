/**
 * Pedidos: etapas, transições permitidas e cálculo dos valores.
 * Valores em centavos.
 */
import { precoComAdicionais, validarEscolhas, type Escolha, type GrupoComplemento } from "./cardapio";
import { taxaEntrega } from "./funcionamento";

export const STATUS_PEDIDO = [
  "aguardando_pagamento",
  "recebido",
  "confirmado",
  "em_preparo",
  "pronto",
  "saiu_para_entrega",
  "entregue",
  "cancelado",
] as const;
export type StatusPedido = (typeof STATUS_PEDIDO)[number];

export const NOME_STATUS: Record<StatusPedido, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  recebido: "Recebido",
  confirmado: "Confirmado",
  em_preparo: "Em preparo",
  pronto: "Pronto",
  saiu_para_entrega: "Saiu para entrega",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export type TipoEntrega = "entrega" | "retirada";
export const FORMAS_PAGAMENTO = ["pix", "pix_online", "dinheiro", "cartao"] as const;
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number];

export const NOME_PAGAMENTO: Record<FormaPagamento, string> = {
  pix: "Pix",
  pix_online: "Pix online",
  dinheiro: "Dinheiro",
  cartao: "Cartão na entrega",
};

export const CANAIS_PEDIDO = ["site", "whatsapp", "telefone", "ifood", "99food"] as const;
export type CanalPedido = (typeof CANAIS_PEDIDO)[number];

export const NOME_CANAL: Record<CanalPedido, string> = {
  site: "Site",
  whatsapp: "WhatsApp",
  telefone: "Telefone",
  ifood: "iFood",
  "99food": "99Food",
};

/** Próximas etapas possíveis a partir de cada etapa. */
export function proximosStatus(atual: StatusPedido, tipo: TipoEntrega): StatusPedido[] {
  switch (atual) {
    case "aguardando_pagamento":
      return ["recebido", "cancelado"];
    case "recebido":
      return ["confirmado", "cancelado"];
    case "confirmado":
      return ["em_preparo", "cancelado"];
    case "em_preparo":
      return ["pronto", "cancelado"];
    case "pronto":
      return tipo === "entrega" ? ["saiu_para_entrega", "cancelado"] : ["entregue", "cancelado"];
    case "saiu_para_entrega":
      return ["entregue", "cancelado"];
    default:
      return [];
  }
}

export function podeMudarStatus(de: StatusPedido, para: StatusPedido, tipo: TipoEntrega): boolean {
  return proximosStatus(de, tipo).includes(para);
}

/** Etapa principal seguinte (o botão de avanço no painel). */
export function proximoPasso(atual: StatusPedido, tipo: TipoEntrega): StatusPedido | null {
  return proximosStatus(atual, tipo).find((s) => s !== "cancelado") ?? null;
}

export const ROTULO_AVANCO: Partial<Record<StatusPedido, string>> = {
  recebido: "Confirmar recebimento",
  confirmado: "Aceitar",
  em_preparo: "Iniciar preparo",
  pronto: "Marcar pronto",
  saiu_para_entrega: "Saiu para entrega",
  entregue: "Concluir",
};

/** O entregador só registra a saída e a entrega de pedidos para entrega. */
export function perfilPodeMudarStatus(perfil: "dona" | "suporte" | "cozinha" | "entregador", de: StatusPedido, para: StatusPedido, tipo: TipoEntrega): boolean {
  if (!podeMudarStatus(de, para, tipo)) return false;
  if (perfil !== "entregador") return true;
  return tipo === "entrega" && ((de === "pronto" && para === "saiu_para_entrega") || (de === "saiu_para_entrega" && para === "entregue"));
}

/** Minutos desde a criação a partir dos quais o pedido é destacado como atrasado. */
export const MINUTOS_ATENCAO = 30;
export const MINUTOS_ATRASO = 50;

export function pedidoEncerrado(status: StatusPedido): boolean {
  return status === "entregue" || status === "cancelado";
}

/* ---------- Valores ---------- */

export interface ProdutoVenda {
  id: string;
  nome: string;
  preco: number;
  disponivel: boolean;
  grupos: GrupoComplemento[];
}

export interface ItemCarrinho {
  produtoId: string;
  quantidade: number;
  escolhas: Escolha[];
  observacao?: string;
}

export interface ItemCalculado {
  produtoId: string;
  nome: string;
  quantidade: number;
  precoUnitario: number;
  total: number;
  observacao: string | null;
  opcoes: { grupo: string; opcao: string; quantidade: number; precoAdicional: number }[];
  escolhas: Escolha[];
}

export interface Desconto {
  /** Valor em centavos a abater do subtotal. */
  valor: number;
  /** Zera a taxa de entrega. */
  freteGratis: boolean;
}

export interface ParametrosPedido {
  tipo: TipoEntrega;
  taxaBairro: number;
  freteGratisAcima: number | null;
  pedidoMinimo: number;
  desconto?: Desconto;
}

export type ResultadoCalculo =
  | {
      ok: true;
      itens: ItemCalculado[];
      subtotal: number;
      taxaEntrega: number;
      desconto: number;
      total: number;
    }
  | { ok: false; erro: string };

export const LIMITE_ITENS = 50;
export const LIMITE_QUANTIDADE = 999;

/** Calcula os valores do pedido a partir dos dados do servidor; nunca confia em preços vindos do cliente. */
export function calcularPedido(carrinho: readonly ItemCarrinho[], produtos: ReadonlyMap<string, ProdutoVenda>, p: ParametrosPedido): ResultadoCalculo {
  if (carrinho.length === 0) return { ok: false, erro: "O carrinho está vazio." };
  if (carrinho.length > LIMITE_ITENS) return { ok: false, erro: "Itens demais no pedido." };

  const itens: ItemCalculado[] = [];
  for (const item of carrinho) {
    const produto = produtos.get(item.produtoId);
    if (!produto) return { ok: false, erro: "Um produto do carrinho não está mais disponível." };
    if (!produto.disponivel) return { ok: false, erro: `${produto.nome} está indisponível.` };
    if (!Number.isInteger(item.quantidade) || item.quantidade < 1 || item.quantidade > LIMITE_QUANTIDADE) {
      return { ok: false, erro: "Quantidade inválida." };
    }
    const erro = validarEscolhas(produto.grupos, item.escolhas);
    if (erro) return { ok: false, erro: `${produto.nome}: ${erro}` };

    const precoUnitario = precoComAdicionais(produto.preco, produto.grupos, item.escolhas);
    itens.push({
      produtoId: produto.id,
      nome: produto.nome,
      quantidade: item.quantidade,
      precoUnitario,
      total: precoUnitario * item.quantidade,
      observacao: item.observacao?.trim() ? item.observacao.trim().slice(0, 200) : null,
      escolhas: item.escolhas.map((e) => ({ grupoId: e.grupoId, opcaoId: e.opcaoId, quantidade: e.quantidade })),
      opcoes: item.escolhas.map((e) => {
        const grupo = produto.grupos.find((g) => g.id === e.grupoId)!;
        const opcao = grupo.opcoes.find((o) => o.id === e.opcaoId)!;
        return { grupo: grupo.nome, opcao: opcao.nome, quantidade: e.quantidade, precoAdicional: opcao.precoAdicional };
      }),
    });
  }

  const subtotal = itens.reduce((soma, i) => soma + i.total, 0);
  if (subtotal < p.pedidoMinimo) return { ok: false, erro: "Pedido abaixo do valor mínimo." };

  const desconto = Math.min(p.desconto?.valor ?? 0, subtotal);
  const taxa =
    p.tipo === "retirada" || p.desconto?.freteGratis ? 0 : taxaEntrega(subtotal, p.taxaBairro, { freteGratisAcima: p.freteGratisAcima });
  return { ok: true, itens, subtotal, taxaEntrega: taxa, desconto, total: subtotal - desconto + taxa };
}

/** Troco: o valor informado precisa cobrir o total. */
export function validarTroco(total: number, trocoPara: number | null): string | null {
  if (trocoPara === null) return null;
  if (trocoPara < total) return "O valor para troco deve ser maior que o total.";
  return null;
}

/** Telefone brasileiro só com dígitos (10 ou 11), sem o 55. */
export function normalizarTelefone(texto: string): string | null {
  let digitos = texto.replace(/\D/g, "");
  if (digitos.length >= 12 && digitos.startsWith("55")) digitos = digitos.slice(2);
  return digitos.length === 10 || digitos.length === 11 ? digitos : null;
}

export function formatarTelefone(digitos: string): string {
  if (digitos.length === 11) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  if (digitos.length === 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  return digitos;
}
