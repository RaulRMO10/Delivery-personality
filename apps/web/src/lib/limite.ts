import "server-only";
import { headers } from "next/headers";
import { db, sql } from "@delivery/db";

/**
 * Registra uma tentativa e informa se ainda está dentro do limite.
 * Janela fixa: ao expirar, a contagem recomeça.
 */
export async function dentroDoLimite(chave: string, maximo: number, janelaSegundos: number): Promise<boolean> {
  const resultado = await db.execute<{ contagem: number }>(sql`
    INSERT INTO limites_uso (chave, contagem, janela_inicio)
    VALUES (${chave}, 1, now())
    ON CONFLICT (chave) DO UPDATE SET
      contagem = CASE WHEN limites_uso.janela_inicio < now() - make_interval(secs => ${janelaSegundos}) THEN 1 ELSE limites_uso.contagem + 1 END,
      janela_inicio = CASE WHEN limites_uso.janela_inicio < now() - make_interval(secs => ${janelaSegundos}) THEN now() ELSE limites_uso.janela_inicio END
    RETURNING contagem
  `);
  return Number(resultado[0]?.contagem ?? 0) <= maximo;
}

/** IP do cliente informado pelo proxy da hospedagem. */
export async function ipDaRequisicao(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido";
}
