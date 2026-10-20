/**
 * Tipos da Merchant API do iFood usados pela integração.
 * Conferir com a documentação oficial (developer.ifood.com.br) antes da homologação:
 * os campos aqui são os essenciais para receber e operar pedidos.
 */

export interface EventoIfood {
  id: string;
  /** Ex.: PLC (novo), CFM (confirmado), CAN (cancelado), CON (concluído). */
  code: string;
  fullCode?: string;
  orderId: string;
  merchantId?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface OpcaoIfood {
  name: string;
  groupName?: string;
  quantity: number;
  unitPrice: number;
  price?: number;
}

export interface ItemIfood {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  observations?: string;
  options?: OpcaoIfood[];
}

export interface PedidoIfood {
  id: string;
  displayId: string;
  orderType: "DELIVERY" | "TAKEOUT" | "INDOOR" | string;
  orderTiming: "IMMEDIATE" | "SCHEDULED" | string;
  createdAt: string;
  schedule?: { deliveryDateTimeStart?: string; deliveryDateTimeEnd?: string };
  customer: { name: string; phone?: { number?: string; localizer?: string } };
  delivery?: {
    deliveredBy?: "IFOOD" | "MERCHANT" | string;
    deliveryAddress?: {
      streetName?: string;
      streetNumber?: string;
      complement?: string;
      neighborhood?: string;
      reference?: string;
      city?: string;
    };
  };
  items: ItemIfood[];
  total: { subTotal: number; deliveryFee: number; benefits?: number; orderAmount: number; additionalFees?: number };
  payments?: {
    prepaid?: number;
    pending?: number;
    methods?: { method: string; type: "ONLINE" | "OFFLINE" | string; value: number; cash?: { changeFor?: number } }[];
  };
  extraInfo?: string;
}

export type AcaoPedidoIfood = "confirmar" | "iniciar_preparo" | "pronto" | "despachar" | "cancelar";
