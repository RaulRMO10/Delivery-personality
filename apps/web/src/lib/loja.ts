import "server-only";
import { cache } from "react";
import { LOJA, statusLoja, type Intervalo } from "@delivery/core";
import { asc, db, eq, schema } from "@delivery/db";

/** Configuração completa da loja, lida uma vez por requisição. */
export const obterConfiguracao = cache(async () => {
  const [linhas, horarios, datas] = await Promise.all([
    db.select().from(schema.configuracaoLoja).where(eq(schema.configuracaoLoja.id, 1)),
    db.select().from(schema.horariosFuncionamento).orderBy(asc(schema.horariosFuncionamento.diaSemana), asc(schema.horariosFuncionamento.abre)),
    db.select().from(schema.datasFechadas).orderBy(asc(schema.datasFechadas.data)),
  ]);
  const config = linhas[0];
  return {
    nome: config?.nome || LOJA.nome,
    telefone: config?.telefone ?? null,
    endereco: config?.endereco ?? null,
    documento: config?.documento ?? null,
    aviso: config?.aviso ?? null,
    tempoPreparoMin: config?.tempoPreparoMin ?? 30,
    pedidoMinimo: config?.pedidoMinimo ?? 0,
    aceitaRetirada: config?.aceitaRetirada ?? true,
    freteGratisAcima: config?.freteGratisAcima ?? null,
    formasPagamento: config?.formasPagamento ?? ["pix", "dinheiro", "cartao"],
    chavePix: config?.chavePix ?? null,
    nomeRecebedorPix: config?.nomeRecebedorPix ?? null,
    cidadePix: config?.cidadePix ?? null,
    fidelidade: {
      ativa: config?.fidelidadeAtiva ?? false,
      pedidos: config?.fidelidadePedidos ?? 10,
      tipo: config?.fidelidadeTipo ?? ("valor" as const),
      valor: config?.fidelidadeValor ?? 0,
    },
    fechadaManual: config?.fechadaManual ?? false,
    pausadaAte: config?.pausadaAte ?? null,
    horarios: horarios.map((h): Intervalo & { id: string } => ({ id: h.id, diaSemana: h.diaSemana, abre: h.abre, fecha: h.fecha })),
    datasFechadas: datas,
  };
});

export type Configuracao = Awaited<ReturnType<typeof obterConfiguracao>>;

export function calcularStatus(config: Configuracao, agora = new Date()) {
  return statusLoja(
    agora,
    config.horarios,
    { fechadaManual: config.fechadaManual, pausadaAte: config.pausadaAte },
    new Set(config.datasFechadas.map((d) => d.data)),
  );
}
