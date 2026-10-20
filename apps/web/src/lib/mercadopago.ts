import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Cliente mínimo da API de pagamentos do Mercado Pago (Pix).
 * Credenciais: MP_ACCESS_TOKEN e MP_WEBHOOK_SECRET; URL pública em BETTER_AUTH_URL.
 */
// MP_API_URL permite apontar para um simulador em testes.
const API = process.env.MP_API_URL ?? "https://api.mercadopago.com";
export const MINUTOS_VALIDADE_PIX = 30;

export interface CobrancaPix {
  externoId: string;
  status: string;
  qrCode: string | null;
  qrCodeBase64: string | null;
  expiraEm: Date;
}

interface RespostaPagamento {
  id: number;
  status: string;
  external_reference?: string;
  transaction_amount?: number;
  point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string } };
}

function token() {
  const valor = process.env.MP_ACCESS_TOKEN;
  if (!valor) throw new Error("MP_ACCESS_TOKEN não configurado.");
  return valor;
}

export async function criarCobrancaPix(pedido: { id: string; numero: number; total: number }): Promise<CobrancaPix> {
  const expiraEm = new Date(Date.now() + MINUTOS_VALIDADE_PIX * 60_000);
  const resposta = await fetch(`${API}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": pedido.id,
    },
    body: JSON.stringify({
      transaction_amount: pedido.total / 100,
      description: `Pedido #${pedido.numero}`,
      payment_method_id: "pix",
      external_reference: pedido.id,
      date_of_expiration: expiraEm.toISOString().replace("Z", "-00:00"),
      notification_url: process.env.BETTER_AUTH_URL ? `${process.env.BETTER_AUTH_URL}/api/webhooks/mercadopago` : undefined,
      payer: { email: process.env.MP_EMAIL_PAGADOR_PADRAO ?? "cliente@pedido.local" },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!resposta.ok) throw new Error(`Mercado Pago respondeu ${resposta.status}`);
  const dados = (await resposta.json()) as RespostaPagamento;
  return {
    externoId: String(dados.id),
    status: dados.status,
    qrCode: dados.point_of_interaction?.transaction_data?.qr_code ?? null,
    qrCodeBase64: dados.point_of_interaction?.transaction_data?.qr_code_base64 ?? null,
    expiraEm,
  };
}

export async function consultarPagamento(externoId: string): Promise<RespostaPagamento> {
  if (!/^\d{1,20}$/.test(externoId)) throw new Error("Identificador inválido.");
  const resposta = await fetch(`${API}/v1/payments/${externoId}`, {
    headers: { Authorization: `Bearer ${token()}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!resposta.ok) throw new Error(`Mercado Pago respondeu ${resposta.status}`);
  return (await resposta.json()) as RespostaPagamento;
}

/**
 * Valida o cabeçalho x-signature do webhook ("ts=...,v1=...").
 * Manifesto: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`, assinado com HMAC-SHA256.
 */
export function assinaturaValida(opcoes: {
  assinatura: string | null;
  requestId: string | null;
  dataId: string;
  segredo: string;
  agora?: number;
  toleranciaSegundos?: number;
}): boolean {
  if (!opcoes.assinatura || !opcoes.requestId) return false;
  const partes = Object.fromEntries(
    opcoes.assinatura.split(",").map((p) => {
      const [chave, ...valor] = p.trim().split("=");
      return [chave, valor.join("=")];
    }),
  );
  const ts = partes.ts;
  const v1 = partes.v1;
  if (!ts || !v1 || !/^\d+$/.test(ts) || !/^[0-9a-f]{64}$/i.test(v1)) return false;

  // Recusa notificações antigas (aceita ts em segundos ou milissegundos).
  const tolerancia = (opcoes.toleranciaSegundos ?? 600) * 1000;
  const instante = ts.length <= 10 ? Number(ts) * 1000 : Number(ts);
  if (Math.abs((opcoes.agora ?? Date.now()) - instante) > tolerancia) return false;

  const manifesto = `id:${opcoes.dataId.toLowerCase()};request-id:${opcoes.requestId};ts:${ts};`;
  const esperado = createHmac("sha256", opcoes.segredo).update(manifesto).digest();
  const recebido = Buffer.from(v1, "hex");
  return recebido.length === esperado.length && timingSafeEqual(recebido, esperado);
}
