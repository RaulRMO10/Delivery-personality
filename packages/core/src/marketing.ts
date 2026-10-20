/**
 * Cupons e fidelidade. Valores em centavos; percentuais em pontos (10 = 10%).
 */
import type { Desconto } from "./pedidos";

export const TIPOS_CUPOM = ["percentual", "valor", "frete"] as const;
export type TipoCupom = (typeof TIPOS_CUPOM)[number];

export interface Cupom {
  codigo: string;
  tipo: TipoCupom;
  /** Percentual (1–100) ou valor em centavos; ignorado no frete grátis. */
  valor: number;
  pedidoMinimo: number;
  validoDe: Date | null;
  validoAte: Date | null;
  limiteTotal: number | null;
  limitePorCliente: number | null;
  somentePrimeiraCompra: boolean;
  ativo: boolean;
}

export interface ContextoCupom {
  agora: Date;
  subtotal: number;
  usosTotais: number;
  usosDoCliente: number;
  pedidosDoCliente: number;
}

export function normalizarCodigoCupom(texto: string): string {
  return texto.trim().toUpperCase().replace(/\s+/g, "");
}

export function descreverCupom(c: Pick<Cupom, "tipo" | "valor">): string {
  if (c.tipo === "frete") return "Frete grátis";
  if (c.tipo === "percentual") return `${c.valor}% de desconto`;
  return `R$ ${(c.valor / 100).toFixed(2).replace(".", ",")} de desconto`;
}

export type ResultadoCupom = { ok: true; desconto: Desconto } | { ok: false; erro: string };

export function aplicarCupom(cupom: Cupom, ctx: ContextoCupom): ResultadoCupom {
  if (!cupom.ativo) return { ok: false, erro: "Cupom inválido." };
  if (cupom.validoDe && ctx.agora < cupom.validoDe) return { ok: false, erro: "Cupom ainda não está válido." };
  if (cupom.validoAte && ctx.agora > cupom.validoAte) return { ok: false, erro: "Cupom expirado." };
  if (cupom.limiteTotal !== null && ctx.usosTotais >= cupom.limiteTotal) return { ok: false, erro: "Cupom esgotado." };
  if (cupom.limitePorCliente !== null && ctx.usosDoCliente >= cupom.limitePorCliente) return { ok: false, erro: "Cupom já utilizado." };
  if (cupom.somentePrimeiraCompra && ctx.pedidosDoCliente > 0) return { ok: false, erro: "Cupom válido só na primeira compra." };
  if (ctx.subtotal < cupom.pedidoMinimo) {
    return { ok: false, erro: `Cupom válido para pedidos a partir de R$ ${(cupom.pedidoMinimo / 100).toFixed(2).replace(".", ",")}.` };
  }
  if (cupom.tipo === "frete") return { ok: true, desconto: { valor: 0, freteGratis: true } };
  const valor = cupom.tipo === "percentual" ? Math.round((ctx.subtotal * Math.min(cupom.valor, 100)) / 100) : cupom.valor;
  return { ok: true, desconto: { valor: Math.min(valor, ctx.subtotal), freteGratis: false } };
}

export function validarCupom(c: Pick<Cupom, "codigo" | "tipo" | "valor" | "validoDe" | "validoAte">): string | null {
  if (!/^[A-Z0-9_-]{3,20}$/.test(c.codigo)) return "Código: 3 a 20 letras, números, - ou _.";
  if (c.tipo === "percentual" && (!Number.isInteger(c.valor) || c.valor < 1 || c.valor > 100)) return "Percentual entre 1 e 100.";
  if (c.tipo === "valor" && (!Number.isInteger(c.valor) || c.valor < 1)) return "Informe o valor do desconto.";
  if (c.validoDe && c.validoAte && c.validoDe > c.validoAte) return "A data final deve ser depois da inicial.";
  return null;
}

/* ---------- Fidelidade ---------- */

export interface RegraFidelidade {
  ativa: boolean;
  /** Pedidos entregues necessários para ganhar a recompensa. */
  pedidos: number;
  tipo: "valor" | "percentual";
  valor: number;
}

export interface ProgressoFidelidade {
  acumulados: number;
  faltam: number;
  disponivel: boolean;
}

/** `entreguesDesdeUltimaRecompensa`: pedidos entregues depois do último em que a recompensa foi usada. */
export function progressoFidelidade(regra: RegraFidelidade, entreguesDesdeUltimaRecompensa: number): ProgressoFidelidade | null {
  if (!regra.ativa || regra.pedidos < 1) return null;
  const acumulados = Math.min(entreguesDesdeUltimaRecompensa, regra.pedidos);
  return { acumulados, faltam: regra.pedidos - acumulados, disponivel: acumulados >= regra.pedidos };
}

export function descontoFidelidade(regra: RegraFidelidade, subtotal: number): Desconto {
  const valor = regra.tipo === "percentual" ? Math.round((subtotal * Math.min(regra.valor, 100)) / 100) : regra.valor;
  return { valor: Math.min(valor, subtotal), freteGratis: false };
}

export function descreverRecompensa(regra: Pick<RegraFidelidade, "tipo" | "valor">): string {
  return regra.tipo === "percentual" ? `${regra.valor}% de desconto` : `R$ ${(regra.valor / 100).toFixed(2).replace(".", ",")} de desconto`;
}

/** Entre cupom e fidelidade (não acumulam), vale o que gera mais economia. */
export function melhorDesconto(a: Desconto | null, b: Desconto | null, taxaEntrega: number): "a" | "b" | null {
  const economia = (d: Desconto | null) => (d ? d.valor + (d.freteGratis ? taxaEntrega : 0) : -1);
  if (!a && !b) return null;
  return economia(a) >= economia(b) ? "a" : "b";
}
