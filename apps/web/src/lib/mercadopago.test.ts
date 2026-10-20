import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { assinaturaValida } from "./mercadopago";

const segredo = "segredo-de-teste";
const agora = 1_760_000_000_000;

function assinar(dataId: string, requestId: string, ts: string) {
  const v1 = createHmac("sha256", segredo).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest("hex");
  return `ts=${ts},v1=${v1}`;
}

describe("assinatura do webhook do Mercado Pago", () => {
  it("aceita assinatura correta (ts em segundos ou milissegundos)", () => {
    const tsSeg = String(agora / 1000);
    expect(assinaturaValida({ assinatura: assinar("123", "req-1", tsSeg), requestId: "req-1", dataId: "123", segredo, agora })).toBe(true);
    const tsMs = String(agora);
    expect(assinaturaValida({ assinatura: assinar("123", "req-1", tsMs), requestId: "req-1", dataId: "123", segredo, agora })).toBe(true);
  });

  it("recusa dados adulterados, segredo errado ou cabeçalhos ausentes", () => {
    const ts = String(agora / 1000);
    const assinatura = assinar("123", "req-1", ts);
    expect(assinaturaValida({ assinatura, requestId: "req-1", dataId: "999", segredo, agora })).toBe(false);
    expect(assinaturaValida({ assinatura, requestId: "req-2", dataId: "123", segredo, agora })).toBe(false);
    expect(assinaturaValida({ assinatura, requestId: "req-1", dataId: "123", segredo: "outro", agora })).toBe(false);
    expect(assinaturaValida({ assinatura: null, requestId: "req-1", dataId: "123", segredo, agora })).toBe(false);
    expect(assinaturaValida({ assinatura, requestId: null, dataId: "123", segredo, agora })).toBe(false);
    expect(assinaturaValida({ assinatura: "ts=1,v1=zz", requestId: "req-1", dataId: "123", segredo, agora })).toBe(false);
  });

  it("recusa notificação antiga", () => {
    const ts = String(agora / 1000 - 3600);
    expect(assinaturaValida({ assinatura: assinar("123", "req-1", ts), requestId: "req-1", dataId: "123", segredo, agora })).toBe(false);
  });
});
