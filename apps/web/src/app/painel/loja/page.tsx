import type { Metadata } from "next";
import { exigirModulo } from "@/lib/sessao";
import { obterConfiguracao } from "@/lib/loja";
import { TituloPagina } from "@/components/titulo-pagina";
import { Cartao } from "@/components/ui/cartao";
import { BotaoExcluir } from "@/components/ui/botao-excluir";
import { FormularioDados } from "./formulario-dados";
import { EditorHorarios } from "./editor-horarios";
import { NovaDataFechada } from "./nova-data-fechada";
import { removerDataFechada } from "./acoes";

export const metadata: Metadata = { title: "Loja" };

const formatoData = new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeZone: "UTC" });

export default async function PaginaLoja() {
  await exigirModulo("loja");
  const config = await obterConfiguracao();
  const hoje = new Date().toISOString().slice(0, 10);
  const futuras = config.datasFechadas.filter((d) => d.data >= hoje);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <TituloPagina titulo="Loja" />

      <FormularioDados
        valores={{
          nome: config.nome,
          telefone: config.telefone ?? "",
          endereco: config.endereco ?? "",
          documento: config.documento ?? "",
          aviso: config.aviso ?? "",
          tempoPreparoMin: String(config.tempoPreparoMin),
        }}
      />

      <EditorHorarios horarios={config.horarios.map(({ diaSemana, abre, fecha }) => ({ diaSemana, abre, fecha }))} />

      <Cartao className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">Datas fechadas</h2>
        <NovaDataFechada />
        {futuras.length === 0 ? (
          <p className="text-sm text-texto-suave">Nenhuma data cadastrada.</p>
        ) : (
          <ul className="divide-y divide-borda border-t border-borda">
            {futuras.map((d) => (
              <li key={d.data} className="flex items-center gap-3 py-2">
                <div className="flex-1">
                  <p className="font-semibold first-letter:uppercase">{formatoData.format(new Date(`${d.data}T00:00:00Z`))}</p>
                  {d.motivo && <p className="text-sm text-texto-suave">{d.motivo}</p>}
                </div>
                <BotaoExcluir id={d.data} nome={d.data.split("-").reverse().join("/")} acao={removerDataFechada} />
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}
