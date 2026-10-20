import type { Metadata } from "next";
import { exigirModulo } from "@/lib/sessao";
import { obterConfiguracao } from "@/lib/loja";
import { mercadoPagoConfigurado } from "@/lib/pagamentos";
import { TituloPagina } from "@/components/titulo-pagina";
import { FormularioPagamentos } from "./formulario";

export const metadata: Metadata = { title: "Pagamentos" };

export default async function PaginaPagamentos() {
  await exigirModulo("pagamentos");
  const config = await obterConfiguracao();
  return (
    <div className="mx-auto max-w-3xl">
      <TituloPagina titulo="Pagamentos" />
      <FormularioPagamentos
        formas={config.formasPagamento}
        chavePix={config.chavePix ?? ""}
        nomeRecebedorPix={config.nomeRecebedorPix ?? ""}
        cidadePix={config.cidadePix ?? ""}
        mercadoPago={mercadoPagoConfigurado()}
      />
    </div>
  );
}
