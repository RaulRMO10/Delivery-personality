"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, eq, schema } from "@delivery/db";
import { exigirModulo } from "@/lib/sessao";

export type Resultado = { ok: true } | { ok: false; mensagem: string } | null;

const esquema = z.object({
  id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  titulo: z.string().trim().min(1, "Informe o título.").max(120),
  conteudo: z.string().max(10_000),
  fixada: z
    .string()
    .optional()
    .transform((v) => v === "on"),
});

export async function salvarAnotacao(_anterior: Resultado, dados: FormData): Promise<Resultado> {
  const usuario = await exigirModulo("anotacoes");
  const validacao = esquema.safeParse(Object.fromEntries(dados));
  if (!validacao.success) return { ok: false, mensagem: validacao.error.issues[0]?.message ?? "Dados inválidos." };
  const { id, ...valores } = validacao.data;
  if (id) await db.update(schema.anotacoes).set(valores).where(eq(schema.anotacoes.id, id));
  else await db.insert(schema.anotacoes).values({ ...valores, autorId: usuario.id });
  revalidatePath("/painel/anotacoes");
  return { ok: true };
}

export async function excluirAnotacao(id: string): Promise<Resultado> {
  await exigirModulo("anotacoes");
  await db.delete(schema.anotacoes).where(eq(schema.anotacoes.id, z.uuid().parse(id)));
  revalidatePath("/painel/anotacoes");
  return { ok: true };
}
