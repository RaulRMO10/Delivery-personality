import { describe, expect, it } from "vitest";
import {
  ErroCalculo,
  calcularCustoReceita,
  criaCiclo,
  custoReferencia,
  custoUnitarioInsumo,
  paraUnidadeBase,
  type Insumo,
  type Receita,
} from "./receitas";

const insumos = new Map<string, Insumo>([
  ["leite", { id: "leite", unidade: "g", quantidadeEmbalagem: 395, precoEmbalagem: 650 }],
  ["manteiga", { id: "manteiga", unidade: "g", quantidadeEmbalagem: 200, precoEmbalagem: 1000 }],
  ["chocolate", { id: "chocolate", unidade: "g", quantidadeEmbalagem: 200, precoEmbalagem: 800 }],
  ["forminha", { id: "forminha", unidade: "un", quantidadeEmbalagem: 100, precoEmbalagem: 500 }],
  ["farinha", { id: "farinha", unidade: "g", quantidadeEmbalagem: 1000, precoEmbalagem: 600 }],
]);

const brigadeiro: Receita = {
  id: "brigadeiro",
  rendimento: 25,
  unidadeRendimento: "un",
  perdaPercentual: 0,
  itens: [
    { tipo: "insumo", insumoId: "leite", quantidade: 395 },
    { tipo: "insumo", insumoId: "manteiga", quantidade: 20 },
    { tipo: "insumo", insumoId: "chocolate", quantidade: 50 },
    { tipo: "insumo", insumoId: "forminha", quantidade: 25 },
  ],
};

describe("custos", () => {
  it("custo por unidade do insumo", () => {
    expect(custoUnitarioInsumo({ quantidadeEmbalagem: 395, precoEmbalagem: 650 })).toBeCloseTo(1.6456, 3);
    expect(() => custoUnitarioInsumo({ quantidadeEmbalagem: 0, precoEmbalagem: 1 })).toThrow(ErroCalculo);
  });

  it("custo da receita e por unidade", () => {
    const custo = calcularCustoReceita("brigadeiro", new Map([["brigadeiro", brigadeiro]]), insumos);
    // 650 + 100 + 200 + 125 = 1075 centavos
    expect(custo.total).toBeCloseTo(1075);
    expect(custo.porUnidade).toBeCloseTo(43);
  });

  it("aplica a perda ao rendimento", () => {
    const comPerda = { ...brigadeiro, perdaPercentual: 20 };
    const custo = calcularCustoReceita("brigadeiro", new Map([["brigadeiro", comPerda]]), insumos);
    expect(custo.porUnidade).toBeCloseTo(1075 / 20);
  });

  it("resolve sub-receitas", () => {
    const massa: Receita = {
      id: "massa",
      rendimento: 1000,
      unidadeRendimento: "g",
      perdaPercentual: 0,
      itens: [{ tipo: "insumo", insumoId: "farinha", quantidade: 500 }],
    };
    const coxinha: Receita = {
      id: "coxinha",
      rendimento: 10,
      unidadeRendimento: "un",
      perdaPercentual: 0,
      itens: [{ tipo: "receita", receitaId: "massa", quantidade: 400 }],
    };
    const receitas = new Map([
      ["massa", massa],
      ["coxinha", coxinha],
    ]);
    // massa: 300 centavos / 1000 g = 0,3/g; coxinha: 400 g × 0,3 = 120 → 12 por unidade
    expect(calcularCustoReceita("coxinha", receitas, insumos).porUnidade).toBeCloseTo(12);
  });

  it("recusa referência circular", () => {
    const a: Receita = { id: "a", rendimento: 1, unidadeRendimento: "un", perdaPercentual: 0, itens: [{ tipo: "receita", receitaId: "b", quantidade: 1 }] };
    const b: Receita = { id: "b", rendimento: 1, unidadeRendimento: "un", perdaPercentual: 0, itens: [{ tipo: "receita", receitaId: "a", quantidade: 1 }] };
    const receitas = new Map([
      ["a", a],
      ["b", b],
    ]);
    expect(() => calcularCustoReceita("a", receitas, insumos)).toThrow(ErroCalculo);
    expect(criaCiclo("a", "b", receitas)).toBe(true);
    expect(criaCiclo("brigadeiro", "a", new Map([...receitas, ["brigadeiro", brigadeiro]]))).toBe(false);
    expect(criaCiclo("a", "a", receitas)).toBe(true);
  });

  it("valida rendimento e perda", () => {
    const invalida = { ...brigadeiro, rendimento: 0 };
    expect(() => calcularCustoReceita("brigadeiro", new Map([["brigadeiro", invalida]]), insumos)).toThrow(ErroCalculo);
    const perdaTotal = { ...brigadeiro, perdaPercentual: 100 };
    expect(() => calcularCustoReceita("brigadeiro", new Map([["brigadeiro", perdaTotal]]), insumos)).toThrow(ErroCalculo);
  });
});

describe("unidades", () => {
  it("converte para a unidade base", () => {
    expect(paraUnidadeBase(1.5, "kg")).toEqual({ quantidade: 1500, unidade: "g" });
    expect(paraUnidadeBase(2, "l")).toEqual({ quantidade: 2000, unidade: "ml" });
    expect(paraUnidadeBase(12, "un")).toEqual({ quantidade: 12, unidade: "un" });
  });

  it("custo de referência por kg, litro ou unidade", () => {
    expect(custoReferencia({ unidade: "g", quantidadeEmbalagem: 395, precoEmbalagem: 650 }).valor).toBeCloseTo(1645.57, 1);
    expect(custoReferencia({ unidade: "un", quantidadeEmbalagem: 100, precoEmbalagem: 500 })).toEqual({ valor: 5, unidade: "un" });
  });
});
