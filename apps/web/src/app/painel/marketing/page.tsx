import type { Metadata } from "next";
import { FUSO_LOJA, descreverCupom, formatarDinheiro, type Cupom } from "@delivery/core";
import { asc, db, schema, sql } from "@delivery/db";
import { exigirModulo } from "@/lib/sessao";
import { obterConfiguracao } from "@/lib/loja";
import { TituloPagina } from "@/components/titulo-pagina";
import { Cartao } from "@/components/ui/cartao";
import { Selo } from "@/components/ui/selo";
import { Vazio } from "@/components/ui/vazio";
import { BotaoExcluir } from "@/components/ui/botao-excluir";
import { FormularioDialogo } from "@/components/ui/formulario-dialogo";
import { alternarCupom, excluirCupom, salvarCupom } from "./acoes";
import { CamposCupom } from "./campos-cupom";
import { FormularioFidelidade } from "./formulario-fidelidade";
import { BotaoAtivo } from "./botao-ativo";

export const metadata: Metadata = { title: "Marketing" };

const formatoData = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_LOJA, dateStyle: "short" });
const dataIso = (d: Date | null) => (d ? new Intl.DateTimeFormat("en-CA", { timeZone: FUSO_LOJA }).format(d) : "");

function situacao(c: Cupom & { usos: number }, agora: Date) {
  if (!c.ativo) return "Inativo";
  if (c.validoAte && agora > c.validoAte) return "Expirado";
  if (c.validoDe && agora < c.validoDe) return "Agendado";
  if (c.limiteTotal !== null && c.usos >= c.limiteTotal) return "Esgotado";
  return null;
}

export default async function PaginaMarketing() {
  await exigirModulo("marketing");
  const [config, cupons, usos] = await Promise.all([
    obterConfiguracao(),
    db.select().from(schema.cupons).orderBy(asc(schema.cupons.codigo)),
    db.execute<{ cupom_id: string; total: string }>(sql`SELECT cupom_id, count(*) AS total FROM pedidos WHERE cupom_id IS NOT NULL AND status <> 'cancelado' GROUP BY cupom_id`),
  ]);
  const usosPorCupom = new Map(usos.map((u) => [u.cupom_id, Number(u.total)]));
  const agora = new Date();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <TituloPagina titulo="Marketing" />

      <FormularioFidelidade
        ativa={config.fidelidade.ativa}
        pedidos={String(config.fidelidade.pedidos)}
        tipo={config.fidelidade.tipo}
        valor={config.fidelidade.valor ? (config.fidelidade.tipo === "percentual" ? String(config.fidelidade.valor) : (config.fidelidade.valor / 100).toFixed(2).replace(".", ",")) : ""}
      />

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Cupons</h2>
          <FormularioDialogo titulo="Novo cupom" acao={salvarCupom}>
            <CamposCupom />
          </FormularioDialogo>
        </div>
        {cupons.length === 0 ? (
          <Vazio texto="Nenhum cupom cadastrado." />
        ) : (
          <Cartao className="p-0">
            <ul className="divide-y divide-borda">
              {cupons.map((c) => {
                const usosCupom = usosPorCupom.get(c.id) ?? 0;
                const estado = situacao({ ...c, usos: usosCupom }, agora);
                return (
                  <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-mono font-bold">
                        {c.codigo}
                        {estado && <Selo className="font-sans">{estado}</Selo>}
                      </p>
                      <p className="text-sm text-texto-suave">
                        {descreverCupom(c)}
                        {c.pedidoMinimo > 0 && ` · mínimo ${formatarDinheiro(c.pedidoMinimo)}`}
                        {c.somentePrimeiraCompra && " · primeira compra"}
                        {c.validoAte && ` · até ${formatoData.format(c.validoAte)}`}
                        {` · ${usosCupom}${c.limiteTotal !== null ? `/${c.limiteTotal}` : ""} ${usosCupom === 1 ? "uso" : "usos"}`}
                      </p>
                    </div>
                    <BotaoAtivo id={c.id} ativo={c.ativo} nome={c.codigo} acao={alternarCupom} />
                    <FormularioDialogo titulo="Editar cupom" rotuloEditar={`Editar ${c.codigo}`} acao={salvarCupom}>
                      <CamposCupom
                        cupom={{
                          id: c.id,
                          codigo: c.codigo,
                          tipo: c.tipo,
                          valor: c.tipo === "percentual" ? String(c.valor) : c.tipo === "valor" ? (c.valor / 100).toFixed(2).replace(".", ",") : "",
                          pedidoMinimo: c.pedidoMinimo ? (c.pedidoMinimo / 100).toFixed(2).replace(".", ",") : "",
                          validoDe: dataIso(c.validoDe),
                          validoAte: dataIso(c.validoAte),
                          limiteTotal: c.limiteTotal?.toString() ?? "",
                          limitePorCliente: c.limitePorCliente?.toString() ?? "",
                          somentePrimeiraCompra: c.somentePrimeiraCompra,
                        }}
                      />
                    </FormularioDialogo>
                    <BotaoExcluir id={c.id} nome={c.codigo} acao={excluirCupom} />
                  </li>
                );
              })}
            </ul>
          </Cartao>
        )}
      </section>
    </div>
  );
}
