"use server";

import { revalidatePath } from "next/cache";
import { FORMAS_PAGAMENTO, validarChavePix, type FormaPagamento } from "@delivery/core";
import { db, schema } from "@delivery/db";
import { registrarAtividade } from "@/lib/atividades";
import { exigirModulo } from "@/lib/sessao";

export type Resultado = { ok: true; mensagem: string } | { ok: false; mensagem: string } | null;

export async function salvarPagamentos(_anterior: Resultado, dados: FormData): Promise<Resultado> {
  const usuario = await exigirModulo("pagamentos");
  const formas = dados.getAll("formas").filter((f): f is FormaPagamento => (FORMAS_PAGAMENTO as readonly unknown[]).includes(f));
  if (formas.length === 0) return { ok: false, mensagem: "Selecione ao menos uma forma de pagamento." };

  const textoChave = String(dados.get("chavePix") ?? "").trim();
  let chavePix: string | null = null;
  if (textoChave) {
    const validacao = validarChavePix(textoChave);
    if (!validacao.ok) return { ok: false, mensagem: validacao.erro };
    chavePix = validacao.chave;
  }
  const nomeRecebedorPix = String(dados.get("nomeRecebedorPix") ?? "").trim().slice(0, 25) || null;
  const cidadePix = String(dados.get("cidadePix") ?? "").trim().slice(0, 15) || null;

  const valores = { formasPagamento: formas, chavePix, nomeRecebedorPix, cidadePix };
  await db.insert(schema.configuracaoLoja).values({ id: 1, ...valores }).onConflictDoUpdate({ target: schema.configuracaoLoja.id, set: valores });
  await registrarAtividade({ usuarioId: usuario.id, acao: "pagamentos.salvos", entidade: "loja", detalhes: { formas } });
  revalidatePath("/", "layout");
  return { ok: true, mensagem: "Salvo." };
}
