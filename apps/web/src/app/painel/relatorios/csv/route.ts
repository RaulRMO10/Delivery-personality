import { FUSO_LOJA, NOME_CANAL, NOME_PAGAMENTO, NOME_STATUS, podeAcessar, type CanalPedido, type FormaPagamento, type StatusPedido } from "@delivery/core";
import { and, asc, db, gte, lt, schema } from "@delivery/db";
import { obterUsuario } from "@/lib/sessao";
import { limitesDoPeriodo } from "@/lib/relatorios";

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const formatoData = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_LOJA, dateStyle: "short", timeStyle: "short" });

/** Escapa um campo para CSV (separador ;) e neutraliza fórmulas de planilha. */
function campo(valor: string | number) {
  let texto = String(valor);
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

const reais = (centavos: number) => (centavos / 100).toFixed(2).replace(".", ",");

export async function GET(requisicao: Request) {
  const usuario = await obterUsuario();
  if (!usuario || !podeAcessar(usuario.perfil, "relatorios")) return new Response(null, { status: 403 });
  const url = new URL(requisicao.url);
  const de = url.searchParams.get("de") ?? "";
  const ate = url.searchParams.get("ate") ?? "";
  if (!DATA.test(de) || !DATA.test(ate)) return new Response("Período inválido.", { status: 400 });

  const { inicio, fim } = limitesDoPeriodo({ de, ate });
  const pedidos = await db
    .select()
    .from(schema.pedidos)
    .where(and(gte(schema.pedidos.criadoEm, inicio), lt(schema.pedidos.criadoEm, fim)))
    .orderBy(asc(schema.pedidos.criadoEm))
    .limit(20_000);

  const linhas = [
    ["Número", "Data", "Canal", "Cliente", "Tipo", "Bairro", "Situação", "Subtotal", "Desconto", "Entrega", "Total", "Pagamento", "Cupom"],
    ...pedidos.map((p) => [
      p.numero,
      formatoData.format(p.criadoEm),
      NOME_CANAL[p.canal as CanalPedido] ?? p.canal,
      p.nomeCliente,
      p.tipo === "entrega" ? "Entrega" : "Retirada",
      p.endereco?.bairro ?? "",
      NOME_STATUS[p.status as StatusPedido] ?? p.status,
      reais(p.subtotal),
      reais(p.desconto),
      reais(p.taxaEntrega),
      reais(p.total),
      NOME_PAGAMENTO[p.formaPagamento as FormaPagamento] ?? "Online",
      p.codigoCupom ?? "",
    ]),
  ];
  // BOM para o Excel reconhecer UTF-8.
  const csv = "﻿" + linhas.map((l) => l.map(campo).join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pedidos-${de}-a-${ate}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
