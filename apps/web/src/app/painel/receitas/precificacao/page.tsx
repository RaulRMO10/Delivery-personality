import type { Metadata } from "next";
import Link from "next/link";
import { custoUnitarioInsumo } from "@delivery/core";
import { exigirModulo } from "@/lib/sessao";
import { Vazio } from "@/components/ui/vazio";
import { custosDasReceitas, listarInsumos, listarReceitas, obterParametros } from "../dados";
import { Calculadora } from "./calculadora";

export const metadata: Metadata = { title: "Precificação" };

export default async function PaginaPrecificacao() {
  await exigirModulo("receitas");
  const [receitas, insumos, parametros] = await Promise.all([listarReceitas(), listarInsumos(), obterParametros()]);
  const custos = custosDasReceitas(receitas, insumos);

  const opcoesReceitas = receitas.flatMap((r) => {
    const custo = custos.get(r.id);
    return custo ? [{ id: r.id, nome: r.nome, unidade: r.unidadeRendimento, custoPorUnidade: custo.porUnidade }] : [];
  });

  if (opcoesReceitas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3">
        <Vazio texto="Cadastre uma receita para calcular preços." />
        <Link href="/painel/receitas/nova" className="font-semibold text-marca-600 hover:underline">
          Nova receita
        </Link>
      </div>
    );
  }

  return (
    <Calculadora
      receitas={opcoesReceitas}
      embalagens={insumos
        .filter((i) => i.tipo === "embalagem")
        .map((i) => ({ id: i.id, nome: i.nome, unidade: i.unidade, custoUnitario: custoUnitarioInsumo(i) }))}
      canais={parametros.canais.filter((c) => c.ativo).map((c) => ({ id: c.id, nome: c.nome, taxa: c.taxaPercentual }))}
      custosFixosPercentual={parametros.custosFixosPercentual}
      faturamentoInformado={parametros.faturamentoMensalEstimado > 0}
      margemPadrao={parametros.margemDesejadaPercentual}
    />
  );
}
