"use server";

import { revalidatePath } from "next/cache";
import { ehAdmin, lerNumero } from "@delivery/core";
import { db, schema } from "@delivery/db";
import { registrarAtividade } from "@/lib/atividades";
import { exigirModulo } from "@/lib/sessao";

export type Resultado = { ok: true; mensagem: string } | { ok: false; mensagem: string } | null;

export async function salvarRegrasAgenda(_anterior: Resultado, dados: FormData): Promise<Resultado> {
  const usuario = await exigirModulo("agenda");
  if (!ehAdmin(usuario.perfil)) return { ok: false, mensagem: "Sem permissão." };

  const antecedencia = lerNumero(String(dados.get("antecedenciaHoras") ?? ""));
  if (antecedencia === null || antecedencia < 0 || antecedencia > 720 || !Number.isInteger(antecedencia)) {
    return { ok: false, mensagem: "Antecedência: informe horas inteiras (0 a 720)." };
  }
  const textoLimite = String(dados.get("limitePorDia") ?? "").trim();
  const limite = textoLimite ? lerNumero(textoLimite) : null;
  if (textoLimite && (limite === null || limite < 1 || !Number.isInteger(limite))) return { ok: false, mensagem: "Limite por dia: número inteiro." };

  const valores = { antecedenciaEncomendaHoras: antecedencia, limiteEncomendasDia: limite };
  await db.insert(schema.configuracaoLoja).values({ id: 1, ...valores }).onConflictDoUpdate({ target: schema.configuracaoLoja.id, set: valores });
  await registrarAtividade({ usuarioId: usuario.id, acao: "agenda.regras_salvas", entidade: "loja", detalhes: valores });
  revalidatePath("/painel/agenda");
  return { ok: true, mensagem: "Salvo." };
}
