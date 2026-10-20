import type { Metadata } from "next";
import { formatarDinheiro, formatarPercentual } from "@delivery/core";
import { exigirModulo } from "@/lib/sessao";
import { Cartao } from "@/components/ui/cartao";
import { Campo } from "@/components/ui/campo";
import { Vazio } from "@/components/ui/vazio";
import { BotaoExcluir } from "@/components/ui/botao-excluir";
import { obterParametros } from "../dados";
import { excluirCustoFixo, salvarCustoFixo } from "../acoes";
import { FormularioSimples } from "../formulario-simples";
import { FormularioParametros } from "./formulario-parametros";

export const metadata: Metadata = { title: "Custos fixos" };

const emReais = (centavos: number) => (centavos / 100).toFixed(2).replace(".", ",");

function CamposCusto({ id, nome, valor }: { id?: string; nome?: string; valor?: number }) {
  return (
    <>
      <input type="hidden" name="id" value={id ?? ""} />
      <Campo rotulo="Nome" name="nome" defaultValue={nome} placeholder="Ex.: Gás" autoComplete="off" required />
      <Campo rotulo="Valor mensal (R$)" name="valor" inputMode="decimal" defaultValue={valor === undefined ? undefined : emReais(valor)} required />
    </>
  );
}

export default async function PaginaCustos() {
  await exigirModulo("receitas");
  const p = await obterParametros();

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Cartao>
          <p className="text-sm text-texto-suave">Total mensal</p>
          <p className="text-2xl font-bold">{formatarDinheiro(p.totalCustosFixos)}</p>
        </Cartao>
        <Cartao>
          <p className="text-sm text-texto-suave">Sobre o faturamento</p>
          <p className="text-2xl font-bold">{p.faturamentoMensalEstimado > 0 ? formatarPercentual(p.custosFixosPercentual) : "—"}</p>
        </Cartao>
        <Cartao>
          <p className="text-sm text-texto-suave">Margem desejada</p>
          <p className="text-2xl font-bold">{formatarPercentual(p.margemDesejadaPercentual)}</p>
        </Cartao>
      </div>

      <FormularioParametros faturamento={emReais(p.faturamentoMensalEstimado)} margem={String(p.margemDesejadaPercentual).replace(".", ",")} />

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Custos</h2>
          <FormularioSimples titulo="Novo custo" acao={salvarCustoFixo}>
            <CamposCusto />
          </FormularioSimples>
        </div>
        {p.custos.length === 0 ? (
          <Vazio texto="Nenhum custo cadastrado." />
        ) : (
          <Cartao className="p-0">
            <ul className="divide-y divide-borda">
              {p.custos.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                  <p className="flex-1 font-semibold">{c.nome}</p>
                  <p className="font-semibold">{formatarDinheiro(c.valorMensal)}</p>
                  <div className="flex">
                    <FormularioSimples titulo="Editar custo" rotuloEditar={`Editar ${c.nome}`} acao={salvarCustoFixo}>
                      <CamposCusto id={c.id} nome={c.nome} valor={c.valorMensal} />
                    </FormularioSimples>
                    <BotaoExcluir id={c.id} nome={c.nome} acao={excluirCustoFixo} />
                  </div>
                </li>
              ))}
            </ul>
          </Cartao>
        )}
      </section>
    </div>
  );
}
