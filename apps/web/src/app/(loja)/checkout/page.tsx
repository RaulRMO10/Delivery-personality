import type { Metadata } from "next";
import { connection } from "next/server";
import { asc, db, eq, schema } from "@delivery/db";
import { calcularStatus, obterConfiguracao } from "@/lib/loja";
import { formasAceitas } from "@/lib/pagamentos";
import { Checkout } from "./checkout";

export const metadata: Metadata = { title: "Finalizar pedido" };

export default async function PaginaCheckout() {
  await connection();
  const [config, bairros] = await Promise.all([
    obterConfiguracao(),
    db.select({ id: schema.bairros.id, nome: schema.bairros.nome, taxa: schema.bairros.taxa }).from(schema.bairros).where(eq(schema.bairros.ativo, true)).orderBy(asc(schema.bairros.nome)),
  ]);
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

  return (
    <Checkout
      aberta={calcularStatus(config).aberta}
      bairros={bairros}
      aceitaRetirada={config.aceitaRetirada}
      pedidoMinimo={config.pedidoMinimo}
      freteGratisAcima={config.freteGratisAcima}
      formas={formasAceitas(config)}
      hoje={hoje}
    />
  );
}
