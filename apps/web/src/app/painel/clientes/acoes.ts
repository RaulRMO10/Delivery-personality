"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, eq, schema } from "@delivery/db";
import { registrarAtividade } from "@/lib/atividades";
import { exigirModulo } from "@/lib/sessao";

export type Resultado = { ok: true; mensagem: string } | { ok: false; mensagem: string } | null;

const esquema = z.object({
  id: z.uuid(),
  nome: z.string().trim().min(2, "Informe o nome.").max(80),
  email: z.union([z.literal(""), z.email("E-mail inválido.")]).transform((v) => v || null),
  dataNascimento: z.union([z.literal(""), z.iso.date("Data inválida.")]).transform((v) => v || null),
  aceitaMarketing: z
    .string()
    .optional()
    .transform((v) => v === "on"),
  observacoes: z
    .string()
    .trim()
    .max(500)
    .transform((v) => v || null),
});

export async function salvarCliente(_anterior: Resultado, dados: FormData): Promise<Resultado> {
  const usuario = await exigirModulo("clientes");
  const validacao = esquema.safeParse(Object.fromEntries(dados));
  if (!validacao.success) return { ok: false, mensagem: validacao.error.issues[0]?.message ?? "Dados inválidos." };
  const { id, ...valores } = validacao.data;
  await db.update(schema.clientes).set(valores).where(eq(schema.clientes.id, id));
  await registrarAtividade({ usuarioId: usuario.id, acao: "cliente.atualizado", entidade: "cliente", entidadeId: id, detalhes: { nome: valores.nome } });
  revalidatePath("/painel/clientes");
  return { ok: true, mensagem: "Salvo." };
}

/**
 * Exclusão a pedido do titular (LGPD): remove o cadastro e anonimiza os pedidos,
 * mantendo apenas valores e itens para os relatórios.
 */
export async function excluirDadosCliente(id: string) {
  const usuario = await exigirModulo("clientes");
  const clienteId = z.uuid().parse(id);
  await db.transaction(async (tx) => {
    await tx
      .update(schema.pedidos)
      .set({ nomeCliente: "Cliente removido", telefoneCliente: null, endereco: null, observacao: null, ip: null })
      .where(eq(schema.pedidos.clienteId, clienteId));
    await tx.delete(schema.clientes).where(eq(schema.clientes.id, clienteId));
  });
  await registrarAtividade({ usuarioId: usuario.id, acao: "cliente.dados_excluidos", entidade: "cliente", entidadeId: clienteId });
  revalidatePath("/painel/clientes");
  redirect("/painel/clientes");
}
