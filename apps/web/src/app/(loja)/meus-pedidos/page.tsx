import type { Metadata } from "next";
import { MeusPedidos } from "./meus-pedidos";

export const metadata: Metadata = { title: "Meus pedidos", robots: { index: false } };

export default function PaginaMeusPedidos() {
  return <MeusPedidos />;
}
