import { db, schema } from "@delivery/db";

export interface NovaAtividade {
  usuarioId: string | null;
  acao: string;
  entidade: string;
  entidadeId?: string | null;
  detalhes?: Record<string, unknown> | null;
  ip?: string | null;
}

export async function registrarAtividade(atividade: NovaAtividade) {
  await db.insert(schema.atividades).values(atividade);
}
