import { describe, expect, it } from "vitest";
import {
  calcularPedido,
  formatarTelefone,
  normalizarTelefone,
  perfilPodeMudarStatus,
  podeMudarStatus,
  proximoPasso,
  validarTroco,
  type ProdutoVenda,
} from "./pedidos";

const produtos = new Map<string, ProdutoVenda>([
  [
    "cento",
    {
      id: "cento",
      nome: "Cento de brigadeiro",
      preco: 12000,
      disponivel: true,
      grupos: [
        {
          id: "sabores",
          nome: "Sabores",
          minimo: 1,
          maximo: 2,
          opcoes: [
            { id: "brig", nome: "Brigadeiro", precoAdicional: 0, esgotado: false },
            { id: "pist", nome: "Pistache", precoAdicional: 500, esgotado: false },
          ],
        },
      ],
    },
  ],
  ["coxinha", { id: "coxinha", nome: "Coxinha", preco: 600, disponivel: true, grupos: [] }],
  ["esgotado", { id: "esgotado", nome: "Bolo", preco: 5000, disponivel: false, grupos: [] }],
]);

const base = { tipo: "entrega" as const, taxaBairro: 800, freteGratisAcima: 20000, pedidoMinimo: 3000 };

describe("etapas do pedido", () => {
  it("segue a ordem da entrega", () => {
    expect(proximoPasso("recebido", "entrega")).toBe("confirmado");
    expect(proximoPasso("pronto", "entrega")).toBe("saiu_para_entrega");
    expect(proximoPasso("saiu_para_entrega", "entrega")).toBe("entregue");
    expect(proximoPasso("entregue", "entrega")).toBeNull();
  });

  it("retirada pula a saída para entrega", () => {
    expect(proximoPasso("pronto", "retirada")).toBe("entregue");
    expect(podeMudarStatus("pronto", "saiu_para_entrega", "retirada")).toBe(false);
  });

  it("entregador só registra saída e entrega", () => {
    expect(perfilPodeMudarStatus("entregador", "pronto", "saiu_para_entrega", "entrega")).toBe(true);
    expect(perfilPodeMudarStatus("entregador", "saiu_para_entrega", "entregue", "entrega")).toBe(true);
    expect(perfilPodeMudarStatus("entregador", "recebido", "confirmado", "entrega")).toBe(false);
    expect(perfilPodeMudarStatus("entregador", "pronto", "cancelado", "entrega")).toBe(false);
    expect(perfilPodeMudarStatus("entregador", "pronto", "entregue", "retirada")).toBe(false);
    expect(perfilPodeMudarStatus("cozinha", "recebido", "cancelado", "entrega")).toBe(true);
  });

  it("não volta etapas nem altera pedido encerrado", () => {
    expect(podeMudarStatus("em_preparo", "recebido", "entrega")).toBe(false);
    expect(podeMudarStatus("entregue", "cancelado", "entrega")).toBe(false);
    expect(podeMudarStatus("cancelado", "recebido", "entrega")).toBe(false);
    expect(podeMudarStatus("recebido", "cancelado", "entrega")).toBe(true);
  });
});

describe("cálculo do pedido", () => {
  it("soma itens, adicionais e taxa", () => {
    const r = calcularPedido(
      [
        { produtoId: "cento", quantidade: 1, escolhas: [{ grupoId: "sabores", opcaoId: "pist", quantidade: 1 }] },
        { produtoId: "coxinha", quantidade: 5, escolhas: [], observacao: "  bem quentinha  " },
      ],
      produtos,
      base,
    );
    if (!r.ok) throw new Error(r.erro);
    expect(r.subtotal).toBe(12500 + 3000);
    expect(r.taxaEntrega).toBe(800);
    expect(r.total).toBe(16300);
    expect(r.itens[1]!.observacao).toBe("bem quentinha");
    expect(r.itens[0]!.opcoes).toEqual([{ grupo: "Sabores", opcao: "Pistache", quantidade: 1, precoAdicional: 500 }]);
  });

  it("frete grátis acima do valor e na retirada", () => {
    const cento2 = [{ produtoId: "cento", quantidade: 2, escolhas: [{ grupoId: "sabores", opcaoId: "brig", quantidade: 1 }] }];
    const r = calcularPedido(cento2, produtos, base);
    expect(r.ok && r.taxaEntrega).toBe(0);
    const retirada = calcularPedido([{ produtoId: "coxinha", quantidade: 10, escolhas: [] }], produtos, { ...base, tipo: "retirada" });
    expect(retirada.ok && retirada.taxaEntrega).toBe(0);
  });

  it("aplica desconto sem passar do subtotal", () => {
    const r = calcularPedido([{ produtoId: "coxinha", quantidade: 10, escolhas: [] }], produtos, { ...base, desconto: { valor: 1000, freteGratis: false } });
    expect(r.ok && r.total).toBe(6000 - 1000 + 800);
    const frete = calcularPedido([{ produtoId: "coxinha", quantidade: 10, escolhas: [] }], produtos, { ...base, desconto: { valor: 0, freteGratis: true } });
    expect(frete.ok && frete.total).toBe(6000);
    const grande = calcularPedido([{ produtoId: "coxinha", quantidade: 10, escolhas: [] }], produtos, { ...base, desconto: { valor: 99999, freteGratis: false } });
    expect(grande.ok && grande.desconto).toBe(6000);
  });

  it("recusa pedidos inválidos", () => {
    expect(calcularPedido([], produtos, base)).toEqual({ ok: false, erro: "O carrinho está vazio." });
    expect(calcularPedido([{ produtoId: "esgotado", quantidade: 1, escolhas: [] }], produtos, base).ok).toBe(false);
    expect(calcularPedido([{ produtoId: "inexistente", quantidade: 1, escolhas: [] }], produtos, base).ok).toBe(false);
    expect(calcularPedido([{ produtoId: "coxinha", quantidade: 0, escolhas: [] }], produtos, base).ok).toBe(false);
    expect(calcularPedido([{ produtoId: "coxinha", quantidade: 1.5, escolhas: [] }], produtos, base).ok).toBe(false);
    expect(calcularPedido([{ produtoId: "coxinha", quantidade: 1, escolhas: [] }], produtos, base)).toEqual({ ok: false, erro: "Pedido abaixo do valor mínimo." });
    expect(calcularPedido([{ produtoId: "cento", quantidade: 1, escolhas: [] }], produtos, base).ok).toBe(false);
  });
});

describe("telefone e troco", () => {
  it("normaliza telefone", () => {
    expect(normalizarTelefone("(11) 98888-7777")).toBe("11988887777");
    expect(normalizarTelefone("+55 11 98888-7777")).toBe("11988887777");
    expect(normalizarTelefone("1133334444")).toBe("1133334444");
    expect(normalizarTelefone("12345")).toBeNull();
    expect(formatarTelefone("11988887777")).toBe("(11) 98888-7777");
  });

  it("valida troco", () => {
    expect(validarTroco(5000, null)).toBeNull();
    expect(validarTroco(5000, 10000)).toBeNull();
    expect(validarTroco(5000, 4000)).not.toBeNull();
  });
});
