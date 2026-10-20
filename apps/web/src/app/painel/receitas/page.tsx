import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { formatarDinheiro, formatarNumero } from "@delivery/core";
import { exigirModulo } from "@/lib/sessao";
import { Cartao } from "@/components/ui/cartao";
import { Vazio } from "@/components/ui/vazio";
import { custosDasReceitas, listarInsumos, listarReceitas } from "./dados";
import { custoPorRendimento } from "./rotulos";

export const metadata: Metadata = { title: "Receitas" };

export default async function PaginaReceitas() {
  await exigirModulo("receitas");
  const [receitas, insumos] = await Promise.all([listarReceitas(), listarInsumos()]);
  const custos = custosDasReceitas(receitas, insumos);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Link
          href="/painel/receitas/nova"
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-marca-600 px-5 font-semibold text-white hover:bg-marca-700"
        >
          <Plus className="size-5" aria-hidden />
          Nova receita
        </Link>
      </div>
      {receitas.length === 0 ? (
        <Vazio texto="Nenhuma receita cadastrada." />
      ) : (
        <Cartao className="p-0">
          <ul className="divide-y divide-borda">
            {receitas.map((r) => {
              const custo = custos.get(r.id);
              return (
                <li key={r.id}>
                  <Link href={`/painel/receitas/${r.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-fundo">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{r.nome}</p>
                      <p className="text-sm text-texto-suave">
                        Rende {formatarNumero(r.rendimento)} {r.unidadeRendimento}
                        {custo && ` · total ${formatarDinheiro(custo.total)}`}
                      </p>
                    </div>
                    <p className="font-semibold whitespace-nowrap">{custo ? custoPorRendimento(custo.porUnidade, r.unidadeRendimento) : "—"}</p>
                    <ChevronRight className="size-5 text-texto-suave" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Cartao>
      )}
    </div>
  );
}
