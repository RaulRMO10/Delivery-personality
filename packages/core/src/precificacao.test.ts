import { describe, expect, it } from "vitest";
import { arredondarPreco, percentualCustosFixos, precoSugerido, resultadoVenda } from "./precificacao";

describe("precificação", () => {
  it("percentual de custos fixos", () => {
    expect(percentualCustosFixos(100_000, 1_000_000)).toBe(10);
    expect(percentualCustosFixos(100_000, 0)).toBe(0);
  });

  it("preço sugerido", () => {
    const r = precoSugerido({ custoVariavel: 4200, taxaCanalPercentual: 1, custosFixosPercentual: 10, margemPercentual: 30 });
    expect(r.viavel && r.preco).toBeCloseTo(4200 / 0.59);
  });

  it("preço sugerido entrega a margem pedida", () => {
    const parametros = { custoVariavel: 4200, taxaCanalPercentual: 27, custosFixosPercentual: 10 };
    const r = precoSugerido({ ...parametros, margemPercentual: 30 });
    if (!r.viavel) throw new Error("deveria ser viável");
    expect(resultadoVenda(r.preco, parametros).margemPercentual).toBeCloseTo(30);
  });

  it("inviável quando descontos somam 100% ou mais", () => {
    expect(precoSugerido({ custoVariavel: 100, taxaCanalPercentual: 30, custosFixosPercentual: 40, margemPercentual: 30 }).viavel).toBe(false);
  });

  it("detecta prejuízo a um preço definido", () => {
    const r = resultadoVenda(12_000, { custoVariavel: 4200, taxaCanalPercentual: 27, custosFixosPercentual: 40 });
    expect(r.lucro).toBeLessThan(0);
  });

  it("arredonda para cima", () => {
    expect(arredondarPreco(10_712)).toBe(10_750);
    expect(arredondarPreco(10_700)).toBe(10_700);
    expect(arredondarPreco(10_701, 100)).toBe(10_800);
  });
});
