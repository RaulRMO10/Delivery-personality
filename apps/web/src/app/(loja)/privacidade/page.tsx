import type { Metadata } from "next";
import { connection } from "next/server";
import { formatarTelefone } from "@delivery/core";
import { obterConfiguracao } from "@/lib/loja";

export const metadata: Metadata = { title: "Política de privacidade" };

export default async function PaginaPrivacidade() {
  await connection();
  const config = await obterConfiguracao();
  const contato = config.telefone ? formatarTelefone(config.telefone) : "os canais de atendimento da loja";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8 leading-relaxed">
      <h1 className="text-2xl font-bold">Política de privacidade</h1>
      <p>
        {config.nome} trata dados pessoais conforme a Lei nº 13.709/2018 (LGPD).
      </p>
      <h2 className="text-lg font-bold">Dados coletados</h2>
      <p>Nome, telefone e endereço de entrega, informados no pedido.</p>
      <h2 className="text-lg font-bold">Finalidade</h2>
      <p>Preparar, entregar e acompanhar pedidos, e prestar atendimento. Mensagens promocionais somente com consentimento.</p>
      <h2 className="text-lg font-bold">Compartilhamento</h2>
      <p>Somente com prestadores necessários à operação, como entrega e processamento de pagamento.</p>
      <h2 className="text-lg font-bold">Direitos do titular</h2>
      <p>Acesso, correção e exclusão dos dados podem ser solicitados por {contato}.</p>
    </main>
  );
}
