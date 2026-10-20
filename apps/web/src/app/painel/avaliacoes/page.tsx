import type { Metadata } from "next";
import { FUSO_LOJA } from "@delivery/core";
import { db, desc, eq, schema } from "@delivery/db";
import { exigirModulo } from "@/lib/sessao";
import { TituloPagina } from "@/components/titulo-pagina";
import { Cartao } from "@/components/ui/cartao";
import { Vazio } from "@/components/ui/vazio";
import { AreaTexto } from "@/components/ui/campo";
import { FormularioDialogo } from "@/components/ui/formulario-dialogo";
import { Estrelas } from "@/components/loja/avaliar-pedido";
import { responderAvaliacao } from "./acoes";

export const metadata: Metadata = { title: "Avaliações" };

const formatoData = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_LOJA, dateStyle: "short" });

export default async function PaginaAvaliacoes() {
  await exigirModulo("avaliacoes");
  const avaliacoes = await db
    .select({ avaliacao: schema.avaliacoes, numero: schema.pedidos.numero, cliente: schema.pedidos.nomeCliente })
    .from(schema.avaliacoes)
    .innerJoin(schema.pedidos, eq(schema.avaliacoes.pedidoId, schema.pedidos.id))
    .orderBy(desc(schema.avaliacoes.criadoEm))
    .limit(200);
  const total = avaliacoes.length;
  const media = total ? avaliacoes.reduce((s, a) => s + a.avaliacao.nota, 0) / total : 0;
  const porNota = [5, 4, 3, 2, 1].map((n) => ({ nota: n, quantidade: avaliacoes.filter((a) => a.avaliacao.nota === n).length }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <TituloPagina titulo="Avaliações" />
      {total === 0 ? (
        <Vazio texto="Nenhuma avaliação recebida." />
      ) : (
        <>
          <Cartao className="flex flex-wrap items-center gap-8">
            <div>
              <p className="text-5xl font-bold">{media.toFixed(1).replace(".", ",")}</p>
              <Estrelas nota={Math.round(media)} />
              <p className="mt-1 text-sm text-texto-suave">
                {total} {total === 1 ? "avaliação" : "avaliações"}
              </p>
            </div>
            <ul className="flex min-w-48 flex-1 flex-col gap-1.5">
              {porNota.map(({ nota, quantidade }) => (
                <li key={nota} className="flex items-center gap-2 text-sm">
                  <span className="w-3 text-right">{nota}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-fundo">
                    <span className="block h-full rounded-full bg-status-preparo" style={{ width: `${(quantidade / total) * 100}%` }} />
                  </span>
                  <span className="w-6 text-right text-texto-suave">{quantidade}</span>
                </li>
              ))}
            </ul>
          </Cartao>
          <Cartao className="p-0">
            <ul className="divide-y divide-borda">
              {avaliacoes.map(({ avaliacao: a, numero, cliente }) => (
                <li key={a.id} className="flex flex-col gap-1.5 px-5 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <Estrelas nota={a.nota} />
                    <span className="text-sm text-texto-suave">
                      #{numero} · {cliente} · {formatoData.format(a.criadoEm)}
                    </span>
                  </div>
                  {a.comentario && <p>{a.comentario}</p>}
                  {a.resposta && <p className="rounded-xl bg-fundo p-3 text-sm">Resposta: {a.resposta}</p>}
                  <div className="self-end">
                    <FormularioDialogo titulo="Responder" textoBotao={a.resposta ? "Editar resposta" : "Responder"} acao={responderAvaliacao}>
                      <input type="hidden" name="id" value={a.id} />
                      <AreaTexto rotulo="Resposta (visível ao cliente)" name="resposta" defaultValue={a.resposta ?? ""} maxLength={500} required />
                    </FormularioDialogo>
                  </div>
                </li>
              ))}
            </ul>
          </Cartao>
        </>
      )}
    </div>
  );
}
