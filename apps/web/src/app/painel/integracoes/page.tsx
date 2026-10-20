import type { Metadata } from "next";
import { FUSO_LOJA } from "@delivery/core";
import { and, count, db, desc, eq, schema, sql } from "@delivery/db";
import { exigirModulo } from "@/lib/sessao";
import { cn } from "@/lib/utils";
import { TituloPagina } from "@/components/titulo-pagina";
import { Cartao } from "@/components/ui/cartao";
import { Selo } from "@/components/ui/selo";
import { TentarNovamente } from "./tentar-novamente";

export const metadata: Metadata = { title: "Integrações" };

const formato = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_LOJA, dateStyle: "short", timeStyle: "medium" });
const NOME_ACAO: Record<string, string> = {
  confirmar: "Confirmar",
  iniciar_preparo: "Iniciar preparo",
  pronto: "Pronto",
  despachar: "Despachar",
  cancelar: "Cancelar",
};
const NOME_EVENTO: Record<string, string> = {
  PLC: "Novo pedido",
  CFM: "Confirmado",
  RTP: "Pronto",
  DSP: "Despachado",
  CON: "Concluído",
  CAN: "Cancelado",
};

export default async function PaginaIntegracoes() {
  await exigirModulo("integracoes");
  const [[situacao], [pendentes], comErro, eventos] = await Promise.all([
    // "Conectado" é calculado no banco: último polling há menos de 2 minutos.
    db
      .select({
        ultimoPolling: schema.integracoes.ultimoPolling,
        ultimoErro: schema.integracoes.ultimoErro,
        ultimoErroEm: schema.integracoes.ultimoErroEm,
        conectado: sql<boolean>`coalesce(${schema.integracoes.ultimoPolling} > now() - interval '2 minutes', false)`,
      })
      .from(schema.integracoes)
      .where(eq(schema.integracoes.canal, "ifood")),
    db.select({ total: count() }).from(schema.comandosIntegracao).where(and(eq(schema.comandosIntegracao.canal, "ifood"), eq(schema.comandosIntegracao.status, "pendente"))),
    db
      .select({ comando: schema.comandosIntegracao, numero: schema.pedidos.numero })
      .from(schema.comandosIntegracao)
      .innerJoin(schema.pedidos, eq(schema.comandosIntegracao.pedidoId, schema.pedidos.id))
      .where(and(eq(schema.comandosIntegracao.canal, "ifood"), eq(schema.comandosIntegracao.status, "erro")))
      .orderBy(desc(schema.comandosIntegracao.criadoEm))
      .limit(20),
    db.select().from(schema.eventosExternos).where(eq(schema.eventosExternos.canal, "ifood")).orderBy(desc(schema.eventosExternos.recebidoEm)).limit(15),
  ]);

  const ultimo = situacao?.ultimoPolling ?? null;
  const conectado = situacao?.conectado ?? false;
  const estado = ultimo === null ? "Não iniciado" : conectado ? "Conectado" : "Sem contato";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <TituloPagina titulo="Integrações" />

      <Cartao className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">iFood</h2>
          <Selo className={cn(conectado ? "bg-status-pronto/10 text-status-pronto" : ultimo ? "bg-status-cancelado/10 text-status-cancelado" : undefined)}>{estado}</Selo>
        </div>
        <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <dt className="text-texto-suave">Último contato</dt>
          <dd>{ultimo ? formato.format(ultimo) : "—"}</dd>
          <dt className="text-texto-suave">Envios na fila</dt>
          <dd>{pendentes?.total ?? 0}</dd>
          {situacao?.ultimoErro && (
            <>
              <dt className="text-texto-suave">Último erro</dt>
              <dd className="text-status-cancelado">
                {situacao.ultimoErro}
                {situacao.ultimoErroEm && <span className="block text-xs text-texto-suave">{formato.format(situacao.ultimoErroEm)}</span>}
              </dd>
            </>
          )}
        </dl>
        {ultimo === null && <p className="text-sm text-texto-suave">Inicie o worker com as credenciais do iFood para receber pedidos.</p>}
      </Cartao>

      {comErro.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Envios com falha</h2>
          <Cartao className="p-0">
            <ul className="divide-y divide-borda">
              {comErro.map(({ comando, numero }) => (
                <li key={comando.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      #{numero} · {NOME_ACAO[comando.acao] ?? comando.acao}
                    </p>
                    <p className="truncate text-sm text-texto-suave">{comando.erro}</p>
                  </div>
                  <TentarNovamente id={comando.id} />
                </li>
              ))}
            </ul>
          </Cartao>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Eventos recentes</h2>
        {eventos.length === 0 ? (
          <p className="text-sm text-texto-suave">Nenhum evento recebido.</p>
        ) : (
          <Cartao className="p-0">
            <ul className="divide-y divide-borda">
              {eventos.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                  <span className="w-28 font-semibold">{NOME_EVENTO[e.codigo] ?? e.codigo}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-texto-suave">{e.pedidoExternoId}</span>
                  <span className="text-texto-suave">{formato.format(e.recebidoEm)}</span>
                  {e.erro ? <Selo className="bg-status-cancelado/10 text-status-cancelado">Erro</Selo> : e.processadoEm ? null : <Selo>Pendente</Selo>}
                </li>
              ))}
            </ul>
          </Cartao>
        )}
      </section>

      <Cartao className="flex items-center justify-between gap-3">
        <h2 className="font-bold">99Food</h2>
        <Selo>Indisponível</Selo>
      </Cartao>
    </div>
  );
}
