import { FORMAS_PAGAMENTO, gerarPixCopiaECola, type FormaPagamento } from "@delivery/core";

export interface ConfigPagamento {
  formasPagamento: string[];
  chavePix: string | null;
  nomeRecebedorPix: string | null;
  cidadePix: string | null;
  nome: string;
}

/** Mercado Pago ativo quando as credenciais estão nas variáveis de ambiente do servidor. */
export function mercadoPagoConfigurado(): boolean {
  return Boolean(process.env.MP_ACCESS_TOKEN && process.env.MP_WEBHOOK_SECRET);
}

/** Formas de pagamento oferecidas no checkout, na ordem de exibição. */
export function formasAceitas(config: Pick<ConfigPagamento, "formasPagamento">): FormaPagamento[] {
  return FORMAS_PAGAMENTO.filter((forma) => config.formasPagamento.includes(forma) && (forma !== "pix_online" || mercadoPagoConfigurado()));
}

/** Código Pix com o valor do pedido, quando a chave da loja está configurada. */
export function pixDoPedido(config: ConfigPagamento, valor: number, numeroPedido: number): string | null {
  if (!config.chavePix) return null;
  return gerarPixCopiaECola({
    chave: config.chavePix,
    nomeRecebedor: config.nomeRecebedorPix || config.nome,
    cidade: config.cidadePix || "BRASIL",
    valor,
    identificador: `PED${numeroPedido}`,
  });
}
