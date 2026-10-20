import { assinaturaValida } from "@/lib/mercadopago";
import { sincronizarPagamento } from "@/lib/pagamento-online";

/**
 * Notificações do Mercado Pago. A assinatura é validada e o status é sempre
 * confirmado consultando a API, nunca pelo corpo recebido.
 */
export async function POST(requisicao: Request) {
  const segredo = process.env.MP_WEBHOOK_SECRET;
  if (!segredo) return new Response(null, { status: 404 });

  const url = new URL(requisicao.url);
  let corpo: { type?: string; data?: { id?: string | number } } = {};
  try {
    corpo = await requisicao.json();
  } catch {
    // Algumas notificações chegam só com parâmetros na URL.
  }
  const tipo = url.searchParams.get("type") ?? corpo.type;
  const dataId = String(url.searchParams.get("data.id") ?? corpo.data?.id ?? "");
  if (tipo !== "payment" || !/^\d{1,20}$/.test(dataId)) return new Response(null, { status: 200 });

  const valida = assinaturaValida({
    assinatura: requisicao.headers.get("x-signature"),
    requestId: requisicao.headers.get("x-request-id"),
    dataId,
    segredo,
  });
  if (!valida) return new Response(null, { status: 401 });

  try {
    await sincronizarPagamento(dataId);
  } catch (erro) {
    console.error("Falha ao sincronizar pagamento", erro);
    return new Response(null, { status: 500 });
  }
  return new Response(null, { status: 200 });
}
