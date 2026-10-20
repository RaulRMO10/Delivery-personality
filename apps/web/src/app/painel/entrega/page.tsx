import type { Metadata } from "next";
import { asc, db, schema } from "@delivery/db";
import { formatarDinheiro } from "@delivery/core";
import { exigirModulo } from "@/lib/sessao";
import { obterConfiguracao } from "@/lib/loja";
import { TituloPagina } from "@/components/titulo-pagina";
import { Cartao } from "@/components/ui/cartao";
import { Campo } from "@/components/ui/campo";
import { Selo } from "@/components/ui/selo";
import { Vazio } from "@/components/ui/vazio";
import { BotaoExcluir } from "@/components/ui/botao-excluir";
import { FormularioDialogo } from "@/components/ui/formulario-dialogo";
import { excluirBairro, salvarBairro } from "../loja/acoes";
import { FormularioRegras } from "./formulario-regras";
import { BotaoAtivoBairro } from "./botao-ativo-bairro";

export const metadata: Metadata = { title: "Entrega" };

const emReais = (centavos: number | null) => (centavos === null ? "" : (centavos / 100).toFixed(2).replace(".", ","));

function CamposBairro({ id, nome, taxa, tempo }: { id?: string; nome?: string; taxa?: number; tempo?: number }) {
  return (
    <>
      <input type="hidden" name="id" value={id ?? ""} />
      <Campo rotulo="Bairro" name="nome" defaultValue={nome} autoComplete="off" required />
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Taxa (R$)" name="taxa" defaultValue={taxa === undefined ? undefined : emReais(taxa)} inputMode="decimal" required />
        <Campo rotulo="Tempo (min)" name="tempoEstimadoMin" defaultValue={tempo === undefined ? "30" : String(tempo)} inputMode="numeric" required />
      </div>
    </>
  );
}

export default async function PaginaEntrega() {
  await exigirModulo("entrega");
  const [config, bairros] = await Promise.all([obterConfiguracao(), db.select().from(schema.bairros).orderBy(asc(schema.bairros.nome))]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <TituloPagina titulo="Entrega" />
      <FormularioRegras
        pedidoMinimo={emReais(config.pedidoMinimo || null)}
        freteGratisAcima={emReais(config.freteGratisAcima)}
        aceitaRetirada={config.aceitaRetirada}
      />
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Bairros atendidos</h2>
          <FormularioDialogo titulo="Novo bairro" acao={salvarBairro}>
            <CamposBairro />
          </FormularioDialogo>
        </div>
        {bairros.length === 0 ? (
          <Vazio texto="Nenhum bairro cadastrado." />
        ) : (
          <Cartao className="p-0">
            <ul className="divide-y divide-borda">
              {bairros.map((b) => (
                <li key={b.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-semibold">
                      {b.nome}
                      {!b.ativo && <Selo>Inativo</Selo>}
                    </p>
                    <p className="text-sm text-texto-suave">
                      {b.taxa === 0 ? "Grátis" : formatarDinheiro(b.taxa)} · {b.tempoEstimadoMin} min
                    </p>
                  </div>
                  <BotaoAtivoBairro id={b.id} ativo={b.ativo} nome={b.nome} />
                  <FormularioDialogo titulo="Editar bairro" rotuloEditar={`Editar ${b.nome}`} acao={salvarBairro}>
                    <CamposBairro id={b.id} nome={b.nome} taxa={b.taxa} tempo={b.tempoEstimadoMin} />
                  </FormularioDialogo>
                  <BotaoExcluir id={b.id} nome={b.nome} acao={excluirBairro} />
                </li>
              ))}
            </ul>
          </Cartao>
        )}
      </section>
    </div>
  );
}
