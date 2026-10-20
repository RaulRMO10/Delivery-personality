import type { FormaPagamento } from "@delivery/core";

/** Formas de pagamento oferecidas no checkout. */
export function formasAceitas(_config: unknown): FormaPagamento[] {
  return ["pix", "dinheiro", "cartao"];
}
