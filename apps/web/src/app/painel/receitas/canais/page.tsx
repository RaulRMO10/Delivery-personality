import type { Metadata } from "next";
import { formatarPercentual } from "@delivery/core";
import { exigirModulo } from "@/lib/sessao";
import { Cartao } from "@/components/ui/cartao";
import { Campo } from "@/components/ui/campo";
import { Vazio } from "@/components/ui/vazio";
import { Selo } from "@/components/ui/selo";
import { BotaoExcluir } from "@/components/ui/botao-excluir";
import { obterParametros } from "../dados";
import { excluirCanal, salvarCanal } from "../acoes";
import { FormularioSimples } from "../formulario-simples";

export const metadata: Metadata = { title: "Canais" };

function CamposCanal({ id, nome, taxa }: { id?: string; nome?: string; taxa?: number }) {
  return (
    <>
      <input type="hidden" name="id" value={id ?? ""} />
      <Campo rotulo="Nome" name="nome" defaultValue={nome} placeholder="Ex.: iFood" autoComplete="off" required />
      <Campo
        rotulo="Taxa sobre a venda (%)"
        name="taxa"
        inputMode="decimal"
        defaultValue={taxa === undefined ? undefined : String(taxa).replace(".", ",")}
        required
      />
    </>
  );
}

export default async function PaginaCanais() {
  await exigirModulo("receitas");
  const { canais } = await obterParametros();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <FormularioSimples titulo="Novo canal" acao={salvarCanal}>
          <CamposCanal />
        </FormularioSimples>
      </div>
      {canais.length === 0 ? (
        <Vazio texto="Nenhum canal cadastrado." />
      ) : (
        <Cartao className="p-0">
          <ul className="divide-y divide-borda">
            {canais.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                <p className="flex flex-1 items-center gap-2 font-semibold">
                  {c.nome}
                  {c.principal && <Selo>Loja própria</Selo>}
                </p>
                <p className="font-semibold">{formatarPercentual(c.taxaPercentual)}</p>
                <div className="flex">
                  <FormularioSimples titulo="Editar canal" rotuloEditar={`Editar ${c.nome}`} acao={salvarCanal}>
                    <CamposCanal id={c.id} nome={c.nome} taxa={c.taxaPercentual} />
                  </FormularioSimples>
                  {c.principal ? <span className="size-11" aria-hidden /> : <BotaoExcluir id={c.id} nome={c.nome} acao={excluirCanal} />}
                </div>
              </li>
            ))}
          </ul>
        </Cartao>
      )}
    </div>
  );
}
