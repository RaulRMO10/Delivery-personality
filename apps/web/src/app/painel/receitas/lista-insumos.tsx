import { custoReferencia, formatarDinheiro, formatarNumero, type TipoInsumo } from "@delivery/core";
import { exigirModulo } from "@/lib/sessao";
import { Cartao } from "@/components/ui/cartao";
import { Vazio } from "@/components/ui/vazio";
import { BotaoExcluir } from "@/components/ui/botao-excluir";
import { listarInsumos } from "./dados";
import { excluirInsumo } from "./acoes";
import { FormularioInsumo } from "./formulario-insumo";

const TEXTOS: Record<TipoInsumo, { vazio: string; novo: string }> = {
  ingrediente: { vazio: "Nenhum ingrediente cadastrado.", novo: "Novo ingrediente" },
  embalagem: { vazio: "Nenhuma embalagem cadastrada.", novo: "Nova embalagem" },
};

const dataCurta = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

export async function ListaInsumos({ tipo }: { tipo: TipoInsumo }) {
  await exigirModulo("receitas");
  const insumos = await listarInsumos(tipo);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <FormularioInsumo tipo={tipo} titulo={TEXTOS[tipo].novo} />
      </div>
      {insumos.length === 0 ? (
        <Vazio texto={TEXTOS[tipo].vazio} />
      ) : (
        <Cartao className="p-0">
          <ul className="divide-y divide-borda">
            {insumos.map((insumo) => {
              const referencia = custoReferencia(insumo);
              return (
                <li key={insumo.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{insumo.nome}</p>
                    <p className="text-sm text-texto-suave">
                      {formatarNumero(insumo.quantidadeEmbalagem)} {insumo.unidade} por {formatarDinheiro(insumo.precoEmbalagem)}
                      {insumo.fornecedor && ` · ${insumo.fornecedor}`}
                      {` · ${dataCurta.format(insumo.precoAtualizadoEm)}`}
                    </p>
                  </div>
                  <p className="text-right font-semibold whitespace-nowrap">
                    {formatarDinheiro(referencia.valor)}
                    <span className="text-sm font-normal text-texto-suave">/{referencia.unidade}</span>
                  </p>
                  <div className="flex">
                    <FormularioInsumo tipo={tipo} titulo="Editar" insumo={insumo} />
                    <BotaoExcluir id={insumo.id} nome={insumo.nome} acao={excluirInsumo} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Cartao>
      )}
    </div>
  );
}
