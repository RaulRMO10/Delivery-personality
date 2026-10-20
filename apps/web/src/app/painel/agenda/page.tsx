import type { Metadata } from "next";
import { Printer } from "lucide-react";
import { FUSO_LOJA, NOME_STATUS, ehAdmin, horarioLocal, type StatusPedido } from "@delivery/core";
import { and, asc, db, gte, inArray, lt, ne, schema } from "@delivery/db";
import { exigirModulo } from "@/lib/sessao";
import { obterConfiguracao } from "@/lib/loja";
import { TituloPagina } from "@/components/titulo-pagina";
import { Cartao } from "@/components/ui/cartao";
import { Selo } from "@/components/ui/selo";
import { Vazio } from "@/components/ui/vazio";
import { FormularioAgenda } from "./formulario";

export const metadata: Metadata = { title: "Agenda" };

const DIAS = 30;
const formatoDia = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_LOJA, weekday: "long", day: "2-digit", month: "2-digit" });
const formatoHora = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_LOJA, hour: "2-digit", minute: "2-digit" });

export default async function PaginaAgenda() {
  const usuario = await exigirModulo("agenda");
  const config = await obterConfiguracao();
  const agora = new Date();
  const hoje = horarioLocal(agora).data;
  const inicio = new Date(`${hoje}T00:00:00-03:00`);
  const fim = new Date(inicio.getTime() + DIAS * 86_400_000);

  const pedidos = await db
    .select()
    .from(schema.pedidos)
    .where(and(gte(schema.pedidos.agendadoPara, inicio), lt(schema.pedidos.agendadoPara, fim), ne(schema.pedidos.status, "cancelado")))
    .orderBy(asc(schema.pedidos.agendadoPara));
  const itens = pedidos.length
    ? await db.select().from(schema.pedidoItens).where(inArray(schema.pedidoItens.pedidoId, pedidos.map((p) => p.id)))
    : [];

  const dias = new Map<string, typeof pedidos>();
  for (const p of pedidos) {
    const dia = horarioLocal(p.agendadoPara!).data;
    dias.set(dia, [...(dias.get(dia) ?? []), p]);
  }
  const amanha = horarioLocal(new Date(agora.getTime() + 86_400_000)).data;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <TituloPagina titulo="Agenda" />
      {ehAdmin(usuario.perfil) && (
        <FormularioAgenda
          antecedenciaHoras={String(config.antecedenciaEncomendaHoras)}
          limitePorDia={config.limiteEncomendasDia?.toString() ?? ""}
        />
      )}

      {dias.size === 0 ? (
        <Vazio texto={`Nenhuma encomenda nos próximos ${DIAS} dias.`} />
      ) : (
        [...dias.entries()].map(([dia, doDia]) => {
          const itensDoDia = itens.filter((i) => doDia.some((p) => p.id === i.pedidoId));
          const produtos = new Map<string, number>();
          const opcoes = new Map<string, number>();
          for (const item of itensDoDia) {
            produtos.set(item.nome, (produtos.get(item.nome) ?? 0) + item.quantidade);
            for (const o of item.opcoes) opcoes.set(o.opcao, (opcoes.get(o.opcao) ?? 0) + o.quantidade * item.quantidade);
          }
          const rotulo = dia === hoje ? "Hoje" : dia === amanha ? "Amanhã" : null;
          return (
            <section key={dia} className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 text-lg font-bold first-letter:uppercase">
                {rotulo && <Selo className="bg-marca-50 text-marca-700">{rotulo}</Selo>}
                <span className="first-letter:uppercase">{formatoDia.format(new Date(`${dia}T12:00:00-03:00`))}</span>
                <span className="text-texto-suave">· {doDia.length}</span>
              </h2>
              <Cartao className="flex flex-col gap-2">
                <p className="text-sm font-bold text-texto-suave">Produção</p>
                <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                  {[...produtos.entries()].map(([nome, quantidade]) => (
                    <li key={nome} className="flex justify-between gap-2">
                      <span>{nome}</span>
                      <span className="font-bold">{quantidade}</span>
                    </li>
                  ))}
                </ul>
                {opcoes.size > 0 && (
                  <ul className="mt-1 flex flex-wrap gap-1.5 border-t border-borda pt-2 text-sm">
                    {[...opcoes.entries()].map(([nome, quantidade]) => (
                      <li key={nome} className="rounded-full bg-fundo px-2.5 py-0.5">
                        {nome} <span className="font-bold">{quantidade}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Cartao>
              <Cartao className="p-0">
                <ul className="divide-y divide-borda">
                  {doDia.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                      <span className="w-14 font-bold">{formatoHora.format(p.agendadoPara!)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">
                          #{p.numero} · {p.nomeCliente}
                        </p>
                        <p className="text-sm text-texto-suave">
                          {p.tipo === "entrega" ? `Entrega · ${p.endereco?.bairro ?? ""}` : "Retirada"} ·{" "}
                          {itens
                            .filter((i) => i.pedidoId === p.id)
                            .map((i) => `${i.quantidade}× ${i.nome}`)
                            .join(", ")}
                        </p>
                      </div>
                      <Selo>{NOME_STATUS[p.status as StatusPedido]}</Selo>
                      <a
                        href={`/comanda/${p.id}`}
                        target="_blank"
                        rel="noopener"
                        className="flex size-11 items-center justify-center rounded-xl text-texto-suave hover:bg-fundo hover:text-texto"
                        aria-label={`Imprimir pedido ${p.numero}`}
                      >
                        <Printer className="size-5" />
                      </a>
                    </li>
                  ))}
                </ul>
              </Cartao>
            </section>
          );
        })
      )}
    </div>
  );
}
