"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, db, eq, schema } from "@delivery/db";
import { registrarAtividade } from "@/lib/atividades";
import { exigirModulo } from "@/lib/sessao";

/** Recoloca na fila um envio que falhou. */
export async function tentarNovamente(id: string) {
  const usuario = await exigirModulo("integracoes");
  const comandoId = z.uuid().parse(id);
  await db
    .update(schema.comandosIntegracao)
    .set({ status: "pendente", tentativas: 0, proximaTentativa: new Date(), erro: null })
    .where(and(eq(schema.comandosIntegracao.id, comandoId), eq(schema.comandosIntegracao.status, "erro")));
  await registrarAtividade({ usuarioId: usuario.id, acao: "integracao.reenvio", entidade: "comando", entidadeId: comandoId });
  revalidatePath("/painel/integracoes");
}
