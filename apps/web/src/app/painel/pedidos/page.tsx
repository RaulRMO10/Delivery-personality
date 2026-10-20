import type { Metadata } from "next";
import { exigirModulo } from "@/lib/sessao";
import { listarPedidosDoPainel } from "@/lib/pedidos";
import { expirarPagamentosPendentes } from "@/lib/pagamento-online";
import { QuadroPedidos } from "./quadro";

export const metadata: Metadata = { title: "Pedidos" };

export default async function PaginaPedidos() {
  const usuario = await exigirModulo("pedidos");
  await expirarPagamentosPendentes();
  let pedidos = await listarPedidosDoPainel();
  if (usuario.perfil === "entregador") {
    pedidos = pedidos.filter((p) => p.tipo === "entrega" && ["pronto", "saiu_para_entrega", "entregue"].includes(p.status));
  }
  return <QuadroPedidos pedidos={pedidos} perfil={usuario.perfil} />;
}
