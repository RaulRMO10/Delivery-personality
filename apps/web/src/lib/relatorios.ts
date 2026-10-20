import "server-only";
import { FUSO_LOJA, NOME_CANAL, NOME_PAGAMENTO, horarioLocal, type CanalPedido, type FormaPagamento } from "@delivery/core";
import { and, db, gte, inArray, lt, schema } from "@delivery/db";
import { calcularMargens, carregarCustos, listarProdutos } from "@/app/painel/cardapio/dados";

export interface Periodo {
  de: string;
  ate: string;
}

/** Instantes de início e fim (exclusivo) do período, em datas locais da loja. */
export function limitesDoPeriodo(p: Periodo) {
  const inicio = new Date(`${p.de}T00:00:00-03:00`);
  const fim = new Date(new Date(`${p.ate}T00:00:00-03:00`).getTime() + 86_400_000);
  return { inicio, fim };
}

export function dataLocal(deslocamentoDias = 0) {
  return horarioLocal(new Date(Date.now() + deslocamentoDias * 86_400_000), FUSO_LOJA).data;
}

export interface Fatia {
  rotulo: string;
  valor: number;
  detalhe?: string;
}

export async function gerarRelatorio(periodo: Periodo) {
  const { inicio, fim } = limitesDoPeriodo(periodo);
  const pedidos = await db
    .select()
    .from(schema.pedidos)
    .where(and(gte(schema.pedidos.criadoEm, inicio), lt(schema.pedidos.criadoEm, fim)));
  const entregues = pedidos.filter((p) => p.status === "entregue");
  const cancelados = pedidos.filter((p) => p.status === "cancelado");
  const itens = entregues.length
    ? await db.select().from(schema.pedidoItens).where(inArray(schema.pedidoItens.pedidoId, entregues.map((p) => p.id)))
    : [];

  const faturamento = entregues.reduce((s, p) => s + p.total, 0);
  const descontos = entregues.reduce((s, p) => s + p.desconto, 0);
  const taxasEntrega = entregues.reduce((s, p) => s + p.taxaEntrega, 0);

  // Série diária com todos os dias do período (dias sem venda = 0).
  const porDia: Fatia[] = [];
  for (let t = inicio.getTime(); t < fim.getTime(); t += 86_400_000) {
    const dia = horarioLocal(new Date(t + 12 * 3_600_000)).data;
    const doDia = entregues.filter((p) => horarioLocal(p.criadoEm).data === dia);
    porDia.push({ rotulo: dia, valor: doDia.reduce((s, p) => s + p.total, 0), detalhe: `${doDia.length} ${doDia.length === 1 ? "pedido" : "pedidos"}` });
  }

  const agrupar = (chave: (p: (typeof entregues)[number]) => string): Fatia[] => {
    const grupos = new Map<string, { valor: number; quantidade: number }>();
    for (const p of entregues) {
      const k = chave(p);
      const atual = grupos.get(k) ?? { valor: 0, quantidade: 0 };
      grupos.set(k, { valor: atual.valor + p.total, quantidade: atual.quantidade + 1 });
    }
    return [...grupos.entries()]
      .map(([rotulo, g]) => ({ rotulo, valor: g.valor, detalhe: `${g.quantidade} ${g.quantidade === 1 ? "pedido" : "pedidos"}` }))
      .sort((a, b) => b.valor - a.valor);
  };

  const porHora: Fatia[] = Array.from({ length: 24 }, (_, h) => {
    const daHora = entregues.filter((p) => Math.floor(horarioLocal(p.criadoEm).minutos / 60) === h);
    return { rotulo: `${String(h).padStart(2, "0")}h`, valor: daHora.length, detalhe: `${daHora.length} ${daHora.length === 1 ? "pedido" : "pedidos"}` };
  });

  // Produtos: quantidade, receita e custo estimado com as receitas atuais.
  const [custos, produtosAtuais] = await Promise.all([carregarCustos(), listarProdutos()]);
  const custoUnitario = new Map<string, number>();
  for (const produto of produtosAtuais) {
    const margens = calcularMargens(produto, custos);
    if (margens) custoUnitario.set(produto.id, margens.custo);
  }
  const produtos = new Map<string, { quantidade: number; receita: number; custo: number; semCusto: number }>();
  for (const item of itens) {
    const atual = produtos.get(item.nome) ?? { quantidade: 0, receita: 0, custo: 0, semCusto: 0 };
    const custo = item.produtoId ? custoUnitario.get(item.produtoId) : undefined;
    produtos.set(item.nome, {
      quantidade: atual.quantidade + item.quantidade,
      receita: atual.receita + item.precoUnitario * item.quantidade,
      custo: atual.custo + (custo ?? 0) * item.quantidade,
      semCusto: atual.semCusto + (custo === undefined ? item.quantidade : 0),
    });
  }
  const rankingProdutos = [...produtos.entries()].map(([nome, d]) => ({ nome, ...d })).sort((a, b) => b.receita - a.receita);

  // Taxa do canal: pedidos próprios usam o canal principal; iFood, o canal de mesmo nome.
  const principal = custos.canais.find((c) => c.principal);
  const taxaDoCanal = (canal: string) => {
    if (canal === "ifood" || canal === "99food") {
      const nome = canal === "ifood" ? "ifood" : "99";
      return custos.canais.find((c) => c.nome.toLowerCase().includes(nome))?.taxa ?? 0;
    }
    return principal?.taxa ?? 0;
  };
  const taxasCanais = entregues.reduce((s, p) => s + Math.round((p.total * taxaDoCanal(p.canal)) / 100), 0);
  const custoProdutos = rankingProdutos.reduce((s, p) => s + p.custo, 0);
  const itensSemCusto = rankingProdutos.reduce((s, p) => s + p.semCusto, 0);
  const totalItens = rankingProdutos.reduce((s, p) => s + p.quantidade, 0);
  // Receita de produtos = faturamento sem a taxa de entrega cobrada do cliente.
  const lucroEstimado = faturamento - taxasEntrega - custoProdutos - taxasCanais;

  return {
    faturamento,
    pedidos: entregues.length,
    ticketMedio: entregues.length ? Math.round(faturamento / entregues.length) : 0,
    descontos,
    taxasEntrega,
    cancelados: cancelados.length,
    valorCancelado: cancelados.reduce((s, p) => s + p.total, 0),
    porDia,
    porCanal: agrupar((p) => NOME_CANAL[p.canal as CanalPedido] ?? p.canal),
    porPagamento: agrupar((p) => NOME_PAGAMENTO[p.formaPagamento as FormaPagamento] ?? "Online"),
    porHora,
    produtos: rankingProdutos,
    custoProdutos,
    taxasCanais,
    lucroEstimado,
    percentualSemCusto: totalItens ? Math.round((itensSemCusto / totalItens) * 100) : 0,
  };
}

export type Relatorio = Awaited<ReturnType<typeof gerarRelatorio>>;
