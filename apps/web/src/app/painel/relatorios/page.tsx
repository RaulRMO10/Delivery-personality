import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { formatarDinheiro, formatarNumero } from "@delivery/core";
import { exigirModulo } from "@/lib/sessao";
import { cn } from "@/lib/utils";
import { dataLocal, gerarRelatorio, type Periodo } from "@/lib/relatorios";
import { TituloPagina } from "@/components/titulo-pagina";
import { Cartao } from "@/components/ui/cartao";
import { Aviso } from "@/components/ui/aviso";
import { Barras, Colunas } from "@/components/graficos/graficos";

export const metadata: Metadata = { title: "Relatórios" };

const DATA = /^\d{4}-\d{2}-\d{2}$/;

function presets(): { rotulo: string; periodo: Periodo }[] {
  const hoje = dataLocal();
  return [
    { rotulo: "Hoje", periodo: { de: hoje, ate: hoje } },
    { rotulo: "7 dias", periodo: { de: dataLocal(-6), ate: hoje } },
    { rotulo: "30 dias", periodo: { de: dataLocal(-29), ate: hoje } },
    { rotulo: "Este mês", periodo: { de: `${hoje.slice(0, 8)}01`, ate: hoje } },
  ];
}

function Indicador({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <Cartao>
      <p className="text-sm text-texto-suave">{rotulo}</p>
      <p className={cn("font-bold", destaque ? "text-3xl" : "text-2xl")}>{valor}</p>
    </Cartao>
  );
}

export default async function PaginaRelatorios({ searchParams }: PageProps<"/painel/relatorios">) {
  await exigirModulo("relatorios");
  const parametros = await searchParams;
  const padrao = presets()[2]!.periodo;
  const de = typeof parametros.de === "string" && DATA.test(parametros.de) ? parametros.de : padrao.de;
  const ateBruto = typeof parametros.ate === "string" && DATA.test(parametros.ate) ? parametros.ate : padrao.ate;
  const ate = ateBruto < de ? de : ateBruto;
  // Período limitado a um ano para manter a consulta leve.
  const periodo = { de, ate: new Date(`${ate}T00:00:00Z`).getTime() - new Date(`${de}T00:00:00Z`).getTime() > 366 * 86_400_000 ? de : ate };
  const r = await gerarRelatorio(periodo);
  const margemLucro = r.faturamento - r.taxasEntrega > 0 ? (r.lucroEstimado / (r.faturamento - r.taxasEntrega)) * 100 : 0;
  const passo = Math.ceil(r.porDia.length / 8);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <TituloPagina
        titulo="Relatórios"
        acoes={
          <a
            href={`/painel/relatorios/csv?de=${periodo.de}&ate=${periodo.ate}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-borda bg-superficie px-4 font-semibold hover:bg-fundo"
          >
            <Download className="size-5" aria-hidden />
            CSV
          </a>
        }
      />

      <div className="flex flex-wrap items-end gap-2">
        {presets().map(({ rotulo, periodo: p }) => {
          const ativo = p.de === periodo.de && p.ate === periodo.ate;
          return (
            <Link
              key={rotulo}
              href={{ pathname: "/painel/relatorios", query: { de: p.de, ate: p.ate } }}
              aria-current={ativo ? "page" : undefined}
              className={cn("min-h-11 rounded-xl px-4 py-2.5 text-sm font-semibold", ativo ? "bg-texto text-white" : "border border-borda bg-superficie")}
            >
              {rotulo}
            </Link>
          );
        })}
        <form className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col text-xs text-texto-suave">
            De
            <input type="date" name="de" defaultValue={periodo.de} className="min-h-11 rounded-xl border border-borda bg-superficie px-3 text-sm text-texto" />
          </label>
          <label className="flex flex-col text-xs text-texto-suave">
            Até
            <input type="date" name="ate" defaultValue={periodo.ate} className="min-h-11 rounded-xl border border-borda bg-superficie px-3 text-sm text-texto" />
          </label>
          <button type="submit" className="min-h-11 rounded-xl border border-borda bg-superficie px-4 text-sm font-semibold hover:bg-fundo">
            Aplicar
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Faturamento" valor={formatarDinheiro(r.faturamento)} destaque />
        <Indicador rotulo="Pedidos entregues" valor={formatarNumero(r.pedidos)} />
        <Indicador rotulo="Ticket médio" valor={formatarDinheiro(r.ticketMedio)} />
        <Indicador rotulo="Lucro estimado" valor={formatarDinheiro(r.lucroEstimado)} />
      </div>

      <Cartao>
        <h2 className="mb-4 font-bold">Vendas por dia</h2>
        <Colunas dados={r.porDia} formato="dinheiro" rotulosEixo={r.porDia.map((d, i) => (i % passo === 0 ? d.rotulo.slice(8, 10) + "/" + d.rotulo.slice(5, 7) : null))} />
      </Cartao>

      <div className="grid gap-4 lg:grid-cols-2">
        <Cartao>
          <h2 className="mb-4 font-bold">Por canal</h2>
          <Barras dados={r.porCanal} formato="dinheiro" />
        </Cartao>
        <Cartao>
          <h2 className="mb-4 font-bold">Por forma de pagamento</h2>
          <Barras dados={r.porPagamento} formato="dinheiro" />
        </Cartao>
      </div>

      <Cartao>
        <h2 className="mb-4 font-bold">Pedidos por horário</h2>
        <Colunas dados={r.porHora} formato="numero" altura={140} rotulosEixo={r.porHora.map((h, i) => (i % 3 === 0 ? h.rotulo : null))} />
      </Cartao>

      <Cartao className="flex flex-col gap-3">
        <h2 className="font-bold">Resultado estimado</h2>
        <dl className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
          {(
            [
              ["Faturamento", r.faturamento],
              ["Taxas de entrega recebidas", -r.taxasEntrega],
              ["Custo dos produtos", -r.custoProdutos],
              ["Taxas dos canais", -r.taxasCanais],
              ["Descontos concedidos (já abatidos)", r.descontos],
              [`Cancelados (${r.cancelados})`, r.valorCancelado],
            ] as const
          ).map(([rotulo, valor]) => (
            <div key={rotulo} className="flex justify-between gap-3 border-b border-borda py-1.5">
              <dt className="text-texto-suave">{rotulo}</dt>
              <dd className="font-semibold">{valor < 0 ? `− ${formatarDinheiro(-valor)}` : formatarDinheiro(valor)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 py-1.5 sm:col-span-2">
            <dt className="font-bold">Lucro estimado</dt>
            <dd className="font-bold">
              {formatarDinheiro(r.lucroEstimado)} <span className="font-normal text-texto-suave">({margemLucro.toFixed(1).replace(".", ",")}%)</span>
            </dd>
          </div>
        </dl>
        <p className="text-xs text-texto-suave">Custos atuais das receitas; não inclui custos fixos.</p>
        {r.percentualSemCusto > 0 && <Aviso>{r.percentualSemCusto}% dos itens vendidos não têm receita vinculada e entram sem custo.</Aviso>}
      </Cartao>

      <Cartao className="p-0">
        <h2 className="px-5 pt-5 pb-3 font-bold">Produtos</h2>
        {r.produtos.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-texto-suave">Sem vendas no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="border-y border-borda text-texto-suave">
                <tr>
                  <th className="px-5 py-2 font-semibold">Produto</th>
                  <th className="px-3 py-2 text-right font-semibold">Qtd.</th>
                  <th className="px-3 py-2 text-right font-semibold">Receita</th>
                  <th className="px-3 py-2 text-right font-semibold">Custo</th>
                  <th className="px-5 py-2 text-right font-semibold">Margem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borda">
                {r.produtos.map((p) => (
                  <tr key={p.nome}>
                    <td className="px-5 py-2 font-semibold">{p.nome}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatarNumero(p.quantidade)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatarDinheiro(p.receita)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.semCusto === p.quantidade ? "—" : formatarDinheiro(p.custo)}</td>
                    <td className="px-5 py-2 text-right tabular-nums">
                      {p.semCusto === p.quantidade || p.receita === 0 ? "—" : `${(((p.receita - p.custo) / p.receita) * 100).toFixed(0)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>
    </div>
  );
}
