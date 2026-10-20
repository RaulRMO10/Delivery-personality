import { describe, expect, it } from "vitest";
import { ClienteIfood, ErroIfood } from "./cliente";
import { acaoParaStatus, converterPedido, statusDoEvento } from "./conversao";
import type { PedidoIfood } from "./tipos";

function simulador() {
  const chamadas: { url: string; metodo: string; corpo?: string; auth?: string }[] = [];
  let agora = 1_000_000;
  const respostas = new Map<string, () => Response>();
  const falso: typeof fetch = async (entrada, init) => {
    const url = String(entrada).replace("https://api.teste", "");
    chamadas.push({ url, metodo: init?.method ?? "GET", corpo: init?.body as string, auth: (init?.headers as Record<string, string>)?.Authorization });
    const resposta = respostas.get(`${init?.method ?? "GET"} ${url}`);
    return resposta ? resposta() : new Response("não encontrado", { status: 404 });
  };
  respostas.set("POST /authentication/v1.0/oauth/token", () => Response.json({ accessToken: `tok-${chamadas.length}`, expiresIn: 3600 }));
  const cliente = new ClienteIfood({ clientId: "id", clientSecret: "segredo", merchantId: "loja-1", baseUrl: "https://api.teste", fetch: falso, agora: () => agora });
  return { cliente, chamadas, respostas, avancar: (ms: number) => (agora += ms) };
}

describe("cliente iFood", () => {
  it("autentica, reaproveita o token e renova perto de expirar", async () => {
    const { cliente, chamadas, respostas, avancar } = simulador();
    respostas.set("GET /events/v1.0/events:polling", () => new Response(null, { status: 204 }));
    expect(await cliente.buscarEventos()).toEqual([]);
    await cliente.buscarEventos();
    expect(chamadas.filter((c) => c.url.includes("oauth")).length).toBe(1);
    expect(chamadas[1]!.auth).toBe("Bearer tok-1");
    expect(chamadas[0]!.corpo).toContain("grantType=client_credentials");
    avancar(3600_000 - 30_000);
    await cliente.buscarEventos();
    expect(chamadas.filter((c) => c.url.includes("oauth")).length).toBe(2);
  });

  it("confirma eventos e executa ações", async () => {
    const { cliente, chamadas, respostas } = simulador();
    respostas.set("POST /events/v1.0/events/acknowledgment", () => new Response(null, { status: 202 }));
    respostas.set("POST /order/v1.0/orders/abc/confirm", () => new Response(null, { status: 202 }));
    respostas.set("POST /order/v1.0/orders/abc/requestCancellation", () => new Response(null, { status: 202 }));
    await cliente.confirmarEventos(["e1", "e2"]);
    await cliente.executarAcao("abc", "confirmar");
    await cliente.executarAcao("abc", "cancelar", { motivo: "Sem estoque", codigo: "501" });
    expect(chamadas.find((c) => c.url.endsWith("acknowledgment"))!.corpo).toBe('[{"id":"e1"},{"id":"e2"}]');
    expect(JSON.parse(chamadas.find((c) => c.url.endsWith("requestCancellation"))!.corpo!)).toEqual({ reason: "Sem estoque", cancellationCode: "501" });
  });

  it("classifica erros temporários", async () => {
    const { cliente, respostas } = simulador();
    respostas.set("GET /events/v1.0/events:polling", () => new Response("instável", { status: 503 }));
    const erro = await cliente.buscarEventos().catch((e) => e);
    expect(erro).toBeInstanceOf(ErroIfood);
    expect(erro.temporario).toBe(true);
    respostas.set("GET /events/v1.0/events:polling", () => new Response("proibido", { status: 403 }));
    expect((await cliente.buscarEventos().catch((e) => e)).temporario).toBe(false);
  });
});

const pedido: PedidoIfood = {
  id: "ped-1",
  displayId: "4821",
  orderType: "DELIVERY",
  orderTiming: "IMMEDIATE",
  createdAt: "2026-10-20T15:00:00.000Z",
  customer: { name: "Joana", phone: { number: "0800", localizer: "12345678" } },
  delivery: { deliveredBy: "IFOOD", deliveryAddress: { streetName: "Rua X", streetNumber: "10", neighborhood: "Centro", complement: "", reference: "Perto da praça" } },
  items: [
    { name: "Cento de brigadeiro", quantity: 1, unitPrice: 120, totalPrice: 125, observations: "Caprichar", options: [{ name: "Pistache", groupName: "Sabores", quantity: 1, unitPrice: 5 }] },
    { name: "Coxinha", quantity: 4, unitPrice: 6.5, totalPrice: 26 },
  ],
  total: { subTotal: 151, deliveryFee: 7.99, benefits: 10, orderAmount: 148.99 },
  payments: { prepaid: 148.99, pending: 0, methods: [{ method: "CREDIT", type: "ONLINE", value: 148.99 }] },
};

describe("conversão de pedido", () => {
  it("converte valores, itens, endereço e pagamento online", () => {
    const c = converterPedido(pedido);
    expect(c).toMatchObject({
      idExterno: "ped-1",
      codigoExterno: "4821",
      nomeCliente: "Joana",
      tipo: "entrega",
      entregaPeloIfood: true,
      subtotal: 15100,
      taxaEntrega: 799,
      desconto: 1000,
      total: 14899,
      formaPagamento: "online",
      statusPagamento: "pago",
      observacaoContato: "Localizador iFood: 12345678",
      endereco: { bairro: "Centro", rua: "Rua X", numero: "10", complemento: null, referencia: "Perto da praça" },
    });
    expect(c.itens[0]).toEqual({
      nome: "Cento de brigadeiro",
      quantidade: 1,
      precoUnitario: 12500,
      observacao: "Caprichar",
      opcoes: [{ grupo: "Sabores", opcao: "Pistache", quantidade: 1, precoAdicional: 500 }],
    });
    expect(c.itens[1]!.precoUnitario).toBe(650);
  });

  it("pagamento na entrega, retirada e agendado", () => {
    const dinheiro = converterPedido({
      ...pedido,
      orderType: "TAKEOUT",
      orderTiming: "SCHEDULED",
      schedule: { deliveryDateTimeStart: "2026-10-22T18:00:00.000Z" },
      payments: { prepaid: 0, pending: 148.99, methods: [{ method: "CASH", type: "OFFLINE", value: 148.99, cash: { changeFor: 200 } }] },
    });
    expect(dinheiro).toMatchObject({ tipo: "retirada", endereco: null, formaPagamento: "dinheiro", statusPagamento: "pendente", trocoPara: 20000 });
    expect(dinheiro.agendadoPara?.toISOString()).toBe("2026-10-22T18:00:00.000Z");
    const cartao = converterPedido({ ...pedido, payments: { pending: 10, methods: [{ method: "DEBIT", type: "OFFLINE", value: 10 }] } });
    expect(cartao.formaPagamento).toBe("cartao");
  });

  it("mapeia eventos e ações", () => {
    expect(statusDoEvento("CAN")).toBe("cancelado");
    expect(statusDoEvento("CON")).toBe("entregue");
    expect(statusDoEvento("PLC")).toBeNull();
    expect(acaoParaStatus("confirmado", false)).toBe("confirmar");
    expect(acaoParaStatus("saiu_para_entrega", true)).toBeNull();
    expect(acaoParaStatus("saiu_para_entrega", false)).toBe("despachar");
    expect(acaoParaStatus("entregue", false)).toBeNull();
  });
});
