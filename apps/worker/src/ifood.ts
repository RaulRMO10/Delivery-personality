import { and, asc, db, eq, isNull, lte, schema, sql } from "@delivery/db";
import { ClienteIfood, ErroIfood, statusDoEvento } from "@delivery/ifood";
import { aplicarStatusExterno, importarPedido } from "./pedidos";

const CANAL = "ifood";
const MAX_TENTATIVAS = 8;

async function registrarSituacao(valores: { ultimoPolling?: Date; ultimoErro?: string | null }) {
  const agora = new Date();
  await db
    .insert(schema.integracoes)
    .values({ canal: CANAL, ...valores, ...(valores.ultimoErro ? { ultimoErroEm: agora } : {}) })
    .onConflictDoUpdate({ target: schema.integracoes.canal, set: { ...valores, ...(valores.ultimoErro ? { ultimoErroEm: agora } : {}) } });
}

/**
 * Um ciclo de polling: busca eventos, grava (ignorando repetidos), confirma ao iFood
 * e só então processa. A confirmação depois da gravação garante que nada se perde.
 */
export async function cicloEventos(cliente: ClienteIfood): Promise<number> {
  const eventos = await cliente.buscarEventos();
  for (const evento of eventos) {
    await db
      .insert(schema.eventosExternos)
      .values({ canal: CANAL, eventoId: evento.id, codigo: evento.code, pedidoExternoId: evento.orderId, payload: evento })
      .onConflictDoNothing();
  }
  await cliente.confirmarEventos(eventos.map((e) => e.id));
  await registrarSituacao({ ultimoPolling: new Date(), ultimoErro: null });
  return processarEventosPendentes(cliente);
}

/** Processa eventos gravados e ainda não processados, na ordem de chegada. */
export async function processarEventosPendentes(cliente: ClienteIfood): Promise<number> {
  const pendentes = await db
    .select()
    .from(schema.eventosExternos)
    .where(and(eq(schema.eventosExternos.canal, CANAL), isNull(schema.eventosExternos.processadoEm)))
    .orderBy(asc(schema.eventosExternos.recebidoEm))
    .limit(100);

  let processados = 0;
  for (const evento of pendentes) {
    try {
      if (evento.pedidoExternoId) {
        // Todo evento garante que o pedido exista (o PLC pode chegar depois de outro código).
        const pedidoId = await obterOuImportar(cliente, evento.pedidoExternoId);
        const status = statusDoEvento(evento.codigo);
        if (status) {
          const observacao = status === "cancelado" ? "Cancelado pelo iFood." : `Atualizado pelo iFood (${evento.codigo}).`;
          await aplicarStatusExterno(pedidoId, status, observacao);
        }
      }
      await db.update(schema.eventosExternos).set({ processadoEm: new Date(), erro: null }).where(eq(schema.eventosExternos.id, evento.id));
      processados++;
    } catch (erro) {
      await db.update(schema.eventosExternos).set({ erro: (erro as Error).message.slice(0, 500) }).where(eq(schema.eventosExternos.id, evento.id));
      if (erro instanceof ErroIfood && erro.temporario) break;
    }
  }
  return processados;
}

async function obterOuImportar(cliente: ClienteIfood, idExterno: string): Promise<string> {
  const [existente] = await db
    .select({ id: schema.pedidos.id })
    .from(schema.pedidos)
    .where(and(eq(schema.pedidos.canal, CANAL), eq(schema.pedidos.idExterno, idExterno)));
  if (existente) return existente.id;
  return importarPedido(await cliente.buscarPedido(idExterno));
}

/** Envia ao iFood as ações registradas no painel, com novas tentativas e espera crescente. */
export async function processarComandos(cliente: ClienteIfood, codigoCancelamento: string): Promise<number> {
  const comandos = await db
    .select({ comando: schema.comandosIntegracao, idExterno: schema.pedidos.idExterno })
    .from(schema.comandosIntegracao)
    .innerJoin(schema.pedidos, eq(schema.comandosIntegracao.pedidoId, schema.pedidos.id))
    .where(and(eq(schema.comandosIntegracao.canal, CANAL), eq(schema.comandosIntegracao.status, "pendente"), lte(schema.comandosIntegracao.proximaTentativa, sql`now()`)))
    .orderBy(asc(schema.comandosIntegracao.criadoEm))
    .limit(20);

  let enviados = 0;
  for (const { comando, idExterno } of comandos) {
    try {
      if (!idExterno) throw new Error("Pedido sem id do iFood.");
      const motivo = typeof comando.payload?.motivo === "string" ? comando.payload.motivo : "Cancelado pela loja";
      await cliente.executarAcao(idExterno, comando.acao as never, comando.acao === "cancelar" ? { motivo, codigo: codigoCancelamento } : undefined);
      await db.update(schema.comandosIntegracao).set({ status: "enviado", enviadoEm: new Date(), erro: null }).where(eq(schema.comandosIntegracao.id, comando.id));
      enviados++;
    } catch (erro) {
      const tentativas = comando.tentativas + 1;
      const temporario = !(erro instanceof ErroIfood) || erro.temporario;
      const desistir = !temporario || tentativas >= MAX_TENTATIVAS;
      const mensagem = erro instanceof ErroIfood && erro.corpo ? `${erro.message}: ${erro.corpo}` : (erro as Error).message;
      await db
        .update(schema.comandosIntegracao)
        .set({
          tentativas,
          status: desistir ? "erro" : "pendente",
          erro: mensagem.slice(0, 500),
          proximaTentativa: new Date(Date.now() + Math.min(2 ** tentativas * 5_000, 10 * 60_000)),
        })
        .where(eq(schema.comandosIntegracao.id, comando.id));
      if (desistir) await registrarSituacao({ ultimoErro: `Falha ao enviar "${comando.acao}": ${mensagem.slice(0, 300)}` });
    }
  }
  return enviados;
}

export async function registrarErro(erro: unknown) {
  await registrarSituacao({ ultimoErro: (erro as Error).message.slice(0, 500) });
}
