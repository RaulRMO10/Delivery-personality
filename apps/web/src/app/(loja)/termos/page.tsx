import type { Metadata } from "next";
import { connection } from "next/server";
import { obterConfiguracao } from "@/lib/loja";

export const metadata: Metadata = { title: "Termos de uso" };

export default async function PaginaTermos() {
  await connection();
  const config = await obterConfiguracao();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8 leading-relaxed">
      <h1 className="text-2xl font-bold">Termos de uso</h1>
      <h2 className="text-lg font-bold">Pedidos</h2>
      <p>O pedido é confirmado pela {config.nome} após o recebimento. Itens podem ficar indisponíveis; nesse caso, a loja entrará em contato.</p>
      <h2 className="text-lg font-bold">Preços e entrega</h2>
      <p>Valores e taxas exibidos no momento do pedido. Prazos são estimativas e podem variar conforme a demanda.</p>
      <h2 className="text-lg font-bold">Cancelamento</h2>
      <p>Solicitações de cancelamento devem ser feitas pelos canais de atendimento antes do início do preparo.</p>
    </main>
  );
}
