import type { Metadata } from "next";
import { FUSO_LOJA, formatarDinheiro, formatarNumero, type Unidade } from "@delivery/core";
import { asc, db, desc, eq, schema } from "@delivery/db";
import { exigirModulo } from "@/lib/sessao";
import { TituloPagina } from "@/components/titulo-pagina";
import { Cartao } from "@/components/ui/cartao";
import { Selo } from "@/components/ui/selo";
import { Vazio } from "@/components/ui/vazio";
import { FormularioDialogo } from "@/components/ui/formulario-dialogo";
import { configurarEstoque, movimentarEstoque } from "./acoes";
import { CamposConfiguracao, CamposMovimento } from "./campos";

export const metadata: Metadata = { title: "Estoque" };

const formatoData = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_LOJA, dateStyle: "short", timeStyle: "short" });
const NOME_TIPO: Record<string, string> = { entrada: "Entrada", perda: "Perda", ajuste: "Ajuste", venda: "Venda" };

/** Quantidade legível: 1.500 g → 1,5 kg; 2.000 ml → 2 L. */
function quantidadeLegivel(valor: number, unidade: Unidade) {
  if (unidade !== "un" && Math.abs(valor) >= 1000) return `${formatarNumero(valor / 1000, 2)} ${unidade === "g" ? "kg" : "L"}`;
  return `${formatarNumero(valor, 1)} ${unidade}`;
}

export default async function PaginaEstoque() {
  await exigirModulo("estoque");
  const [insumos, movimentos] = await Promise.all([
    db.select().from(schema.insumos).orderBy(asc(schema.insumos.nome)),
    db
      .select({ movimento: schema.movimentosEstoque, nome: schema.insumos.nome, unidade: schema.insumos.unidade, pedido: schema.pedidos.numero })
      .from(schema.movimentosEstoque)
      .innerJoin(schema.insumos, eq(schema.movimentosEstoque.insumoId, schema.insumos.id))
      .leftJoin(schema.pedidos, eq(schema.movimentosEstoque.pedidoId, schema.pedidos.id))
      .orderBy(desc(schema.movimentosEstoque.criadoEm))
      .limit(30),
  ]);
  const controlados = insumos.filter((i) => i.controlarEstoque);
  const comprar = controlados
    .filter((i) => i.estoqueAtual < i.estoqueMinimo)
    .map((i) => {
      const falta = i.estoqueMinimo * 2 - i.estoqueAtual;
      const embalagens = Math.ceil(falta / i.quantidadeEmbalagem);
      return { ...i, embalagens, custo: embalagens * i.precoEmbalagem };
    });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <TituloPagina titulo="Estoque" />

      {comprar.length > 0 && (
        <Cartao className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Lista de compras</h2>
          <ul className="divide-y divide-borda">
            {comprar.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-2">
                <span>
                  <span className="font-semibold">{i.nome}</span>{" "}
                  <span className="text-sm text-texto-suave">
                    · {i.embalagens}× {quantidadeLegivel(i.quantidadeEmbalagem, i.unidade)}
                  </span>
                </span>
                <span className="font-semibold">{formatarDinheiro(i.custo)}</span>
              </li>
            ))}
          </ul>
          <p className="text-right text-sm text-texto-suave">Total estimado {formatarDinheiro(comprar.reduce((s, i) => s + i.custo, 0))}</p>
        </Cartao>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Itens</h2>
        {insumos.length === 0 ? (
          <Vazio texto="Cadastre ingredientes e embalagens em Receitas e custos." />
        ) : (
          <Cartao className="p-0">
            <ul className="divide-y divide-borda">
              {insumos.map((i) => {
                const abaixo = i.controlarEstoque && i.estoqueAtual < i.estoqueMinimo;
                return (
                  <li key={i.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">
                        {i.nome}
                        {abaixo && <Selo className="bg-status-atrasado/10 text-status-atrasado">Abaixo do mínimo</Selo>}
                      </p>
                      <p className="text-sm text-texto-suave">
                        {i.controlarEstoque
                          ? `Mínimo ${quantidadeLegivel(i.estoqueMinimo, i.unidade)}`
                          : "Sem controle de estoque"}
                      </p>
                    </div>
                    {i.controlarEstoque && <p className="font-bold whitespace-nowrap">{quantidadeLegivel(i.estoqueAtual, i.unidade)}</p>}
                    <FormularioDialogo titulo={`Movimentar · ${i.nome}`} textoBotao="Movimentar" acao={movimentarEstoque}>
                      <CamposMovimento insumoId={i.id} unidade={i.unidade} />
                    </FormularioDialogo>
                    <FormularioDialogo titulo={`Configurar · ${i.nome}`} rotuloEditar={`Configurar ${i.nome}`} acao={configurarEstoque}>
                      <CamposConfiguracao insumoId={i.id} unidade={i.unidade} controlar={i.controlarEstoque} minimo={i.estoqueMinimo} />
                    </FormularioDialogo>
                  </li>
                );
              })}
            </ul>
          </Cartao>
        )}
      </section>

      {movimentos.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Movimentações</h2>
          <Cartao className="p-0">
            <ul className="divide-y divide-borda text-sm">
              {movimentos.map(({ movimento: m, nome, unidade, pedido }) => (
                <li key={m.id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="w-16 font-semibold">{NOME_TIPO[m.tipo] ?? m.tipo}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {nome}
                    {pedido ? ` · pedido #${pedido}` : m.observacao ? ` · ${m.observacao}` : ""}
                  </span>
                  <span className={m.quantidade < 0 ? "text-status-cancelado" : "text-status-pronto"}>
                    {m.quantidade > 0 ? "+" : ""}
                    {quantidadeLegivel(m.quantidade, unidade as Unidade)}
                  </span>
                  <span className="text-texto-suave">{formatoData.format(m.criadoEm)}</span>
                </li>
              ))}
            </ul>
          </Cartao>
        </section>
      )}
    </div>
  );
}
