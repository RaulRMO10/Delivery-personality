import type { StatusPedido } from "@delivery/core";
import type { AcaoPedidoIfood, PedidoIfood } from "./tipos";

const centavos = (reais: number | undefined) => Math.round((reais ?? 0) * 100);

export interface PedidoConvertido {
  idExterno: string;
  codigoExterno: string;
  nomeCliente: string;
  /** Telefone do iFood é mascarado; guardamos o localizador para contato pela central. */
  observacaoContato: string | null;
  tipo: "entrega" | "retirada";
  entregaPeloIfood: boolean;
  endereco: { bairro: string; rua: string; numero: string; complemento: string | null; referencia: string | null } | null;
  agendadoPara: Date | null;
  criadoEm: Date;
  subtotal: number;
  taxaEntrega: number;
  desconto: number;
  total: number;
  formaPagamento: "online" | "dinheiro" | "cartao" | "pix";
  statusPagamento: "pago" | "pendente";
  trocoPara: number | null;
  observacao: string | null;
  itens: {
    nome: string;
    precoUnitario: number;
    quantidade: number;
    observacao: string | null;
    opcoes: { grupo: string; opcao: string; quantidade: number; precoAdicional: number }[];
  }[];
}

function formaDePagamento(pedido: PedidoIfood): Pick<PedidoConvertido, "formaPagamento" | "statusPagamento" | "trocoPara"> {
  const pendente = pedido.payments?.pending ?? 0;
  const metodo = pedido.payments?.methods?.find((m) => m.type === "OFFLINE");
  if (pendente <= 0 || !metodo) return { formaPagamento: "online", statusPagamento: "pago", trocoPara: null };
  const nome = metodo.method.toUpperCase();
  if (nome === "CASH") return { formaPagamento: "dinheiro", statusPagamento: "pendente", trocoPara: metodo.cash?.changeFor ? centavos(metodo.cash.changeFor) : null };
  if (nome === "PIX") return { formaPagamento: "pix", statusPagamento: "pendente", trocoPara: null };
  return { formaPagamento: "cartao", statusPagamento: "pendente", trocoPara: null };
}

/** Converte o pedido do iFood para o formato interno (valores em centavos). */
export function converterPedido(pedido: PedidoIfood): PedidoConvertido {
  const endereco = pedido.delivery?.deliveryAddress;
  const entrega = pedido.orderType === "DELIVERY";
  return {
    idExterno: pedido.id,
    codigoExterno: pedido.displayId,
    nomeCliente: pedido.customer?.name?.trim() || "Cliente iFood",
    observacaoContato: pedido.customer?.phone?.localizer ? `Localizador iFood: ${pedido.customer.phone.localizer}` : null,
    tipo: entrega ? "entrega" : "retirada",
    entregaPeloIfood: entrega && pedido.delivery?.deliveredBy === "IFOOD",
    endereco:
      entrega && endereco
        ? {
            bairro: endereco.neighborhood ?? "",
            rua: endereco.streetName ?? "",
            numero: endereco.streetNumber ?? "",
            complemento: endereco.complement || null,
            referencia: endereco.reference || null,
          }
        : null,
    agendadoPara: pedido.orderTiming === "SCHEDULED" && pedido.schedule?.deliveryDateTimeStart ? new Date(pedido.schedule.deliveryDateTimeStart) : null,
    criadoEm: new Date(pedido.createdAt),
    subtotal: centavos(pedido.total.subTotal),
    taxaEntrega: centavos(pedido.total.deliveryFee),
    desconto: centavos(pedido.total.benefits),
    total: centavos(pedido.total.orderAmount),
    ...formaDePagamento(pedido),
    observacao: pedido.extraInfo?.trim() || null,
    itens: pedido.items.map((item) => ({
      nome: item.name,
      quantidade: item.quantity,
      // Preço unitário já com os complementos (totalPrice inclui as opções).
      precoUnitario: item.quantity > 0 ? Math.round(centavos(item.totalPrice) / item.quantity) : centavos(item.unitPrice),
      observacao: item.observations?.trim() || null,
      opcoes: (item.options ?? []).map((o) => ({ grupo: o.groupName ?? "", opcao: o.name, quantidade: o.quantity, precoAdicional: centavos(o.unitPrice) })),
    })),
  };
}

/** Etapa interna correspondente a um evento do iFood (null = sem efeito no pedido). */
export function statusDoEvento(codigo: string): StatusPedido | null {
  switch (codigo) {
    case "CAN":
      return "cancelado";
    case "CON":
      return "entregue";
    case "DSP":
      return "saiu_para_entrega";
    default:
      return null;
  }
}

/** Ação a enviar ao iFood quando o pedido muda de etapa no painel. */
export function acaoParaStatus(para: StatusPedido, entregaPeloIfood: boolean): AcaoPedidoIfood | null {
  switch (para) {
    case "confirmado":
      return "confirmar";
    case "em_preparo":
      return "iniciar_preparo";
    case "pronto":
      return "pronto";
    case "saiu_para_entrega":
      // Quando o entregador é do iFood, a saída é registrada pela própria logística.
      return entregaPeloIfood ? null : "despachar";
    case "cancelado":
      return "cancelar";
    default:
      return null;
  }
}
