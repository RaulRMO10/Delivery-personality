"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, eq, schema } from "@delivery/db";
import { registrarAtividade } from "@/lib/atividades";
import { exigirModulo } from "@/lib/sessao";

export type Resultado = { ok: true } | { ok: false; mensagem: string } | null;

export async function responderAvaliacao(_anterior: Resultado, dados: FormData): Promise<Resultado> {
  const usuario = await exigirModulo("avaliacoes");
  const validacao = z.object({ id: z.uuid(), resposta: z.string().trim().min(1, "Escreva a resposta.").max(500) }).safeParse(Object.fromEntries(dados));
  if (!validacao.success) return { ok: false, mensagem: validacao.error.issues[0]?.message ?? "Dados inválidos." };
  await db.update(schema.avaliacoes).set({ resposta: validacao.data.resposta, respondidoEm: new Date() }).where(eq(schema.avaliacoes.id, validacao.data.id));
  await registrarAtividade({ usuarioId: usuario.id, acao: "avaliacao.respondida", entidade: "avaliacao", entidadeId: validacao.data.id });
  revalidatePath("/painel/avaliacoes");
  return { ok: true };
}
