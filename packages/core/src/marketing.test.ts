import { describe, expect, it } from "vitest";
import {
  aplicarCupom,
  descontoFidelidade,
  melhorDesconto,
  normalizarCodigoCupom,
  progressoFidelidade,
  validarCupom,
  type Cupom,
} from "./marketing";

const base: Cupom = {
  codigo: "BEMVINDO",
  tipo: "percentual",
  valor: 10,
  pedidoMinimo: 0,
  validoDe: null,
  validoAte: null,
  limiteTotal: null,
  limitePorCliente: null,
  somentePrimeiraCompra: false,
  ativo: true,
};
const ctx = { agora: new Date("2026-10-20T12:00:00Z"), subtotal: 10_000, usosTotais: 0, usosDoCliente: 0, pedidosDoCliente: 0 };

describe("cupons", () => {
  it("calcula percentual, valor e frete", () => {
    expect(aplicarCupom(base, ctx)).toEqual({ ok: true, desconto: { valor: 1000, freteGratis: false } });
    expect(aplicarCupom({ ...base, tipo: "valor", valor: 1500 }, ctx)).toEqual({ ok: true, desconto: { valor: 1500, freteGratis: false } });
    expect(aplicarCupom({ ...base, tipo: "valor", valor: 50_000 }, ctx)).toEqual({ ok: true, desconto: { valor: 10_000, freteGratis: false } });
    expect(aplicarCupom({ ...base, tipo: "frete" }, ctx)).toEqual({ ok: true, desconto: { valor: 0, freteGratis: true } });
  });

  it("respeita validade, limites, primeira compra e mínimo", () => {
    expect(aplicarCupom({ ...base, ativo: false }, ctx).ok).toBe(false);
    expect(aplicarCupom({ ...base, validoAte: new Date("2026-10-19T00:00:00Z") }, ctx)).toEqual({ ok: false, erro: "Cupom expirado." });
    expect(aplicarCupom({ ...base, validoDe: new Date("2026-10-21T00:00:00Z") }, ctx).ok).toBe(false);
    expect(aplicarCupom({ ...base, limiteTotal: 5 }, { ...ctx, usosTotais: 5 })).toEqual({ ok: false, erro: "Cupom esgotado." });
    expect(aplicarCupom({ ...base, limitePorCliente: 1 }, { ...ctx, usosDoCliente: 1 })).toEqual({ ok: false, erro: "Cupom já utilizado." });
    expect(aplicarCupom({ ...base, somentePrimeiraCompra: true }, { ...ctx, pedidosDoCliente: 2 }).ok).toBe(false);
    expect(aplicarCupom({ ...base, pedidoMinimo: 20_000 }, ctx).ok).toBe(false);
  });

  it("valida cadastro e normaliza código", () => {
    expect(normalizarCodigoCupom(" bem vindo ")).toBe("BEMVINDO");
    expect(validarCupom(base)).toBeNull();
    expect(validarCupom({ ...base, codigo: "A" })).not.toBeNull();
    expect(validarCupom({ ...base, valor: 0 })).not.toBeNull();
    expect(validarCupom({ ...base, valor: 101 })).not.toBeNull();
    expect(validarCupom({ ...base, validoDe: new Date("2026-11-01"), validoAte: new Date("2026-10-01") })).not.toBeNull();
  });
});

describe("fidelidade", () => {
  const regra = { ativa: true, pedidos: 10, tipo: "valor" as const, valor: 2000 };

  it("acompanha o progresso", () => {
    expect(progressoFidelidade(regra, 3)).toEqual({ acumulados: 3, faltam: 7, disponivel: false });
    expect(progressoFidelidade(regra, 10)).toEqual({ acumulados: 10, faltam: 0, disponivel: true });
    expect(progressoFidelidade(regra, 14)).toEqual({ acumulados: 10, faltam: 0, disponivel: true });
    expect(progressoFidelidade({ ...regra, ativa: false }, 10)).toBeNull();
  });

  it("calcula a recompensa", () => {
    expect(descontoFidelidade(regra, 10_000)).toEqual({ valor: 2000, freteGratis: false });
    expect(descontoFidelidade({ ...regra, tipo: "percentual", valor: 15 }, 10_000)).toEqual({ valor: 1500, freteGratis: false });
    expect(descontoFidelidade(regra, 1000)).toEqual({ valor: 1000, freteGratis: false });
  });

  it("escolhe o maior desconto entre cupom e fidelidade", () => {
    expect(melhorDesconto({ valor: 1000, freteGratis: false }, { valor: 2000, freteGratis: false }, 800)).toBe("b");
    expect(melhorDesconto({ valor: 0, freteGratis: true }, { valor: 500, freteGratis: false }, 800)).toBe("a");
    expect(melhorDesconto(null, { valor: 500, freteGratis: false }, 0)).toBe("b");
    expect(melhorDesconto(null, null, 0)).toBeNull();
  });
});
