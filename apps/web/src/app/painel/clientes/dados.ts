import "server-only";
import { db, sql } from "@delivery/db";

export const FILTROS = {
  todos: "Todos",
  melhores: "Melhores clientes",
  sumidos: "Sem pedir há 30 dias",
  aniversariantes: "Aniversariantes do mês",
  marketing: "Aceitam promoções",
} as const;
export type Filtro = keyof typeof FILTROS;

export interface ClienteResumo {
  id: string;
  nome: string;
  telefone: string;
  aceitaMarketing: boolean;
  dataNascimento: string | null;
  pedidos: number;
  totalGasto: number;
  ultimoPedido: Date | null;
}

/** Clientes com totais de pedidos entregues. */
export async function listarClientes(busca: string, filtro: Filtro): Promise<ClienteResumo[]> {
  const termo = busca.trim();
  const digitos = termo.replace(/\D/g, "");
  const condicaoBusca = termo
    ? digitos.length >= 3
      ? sql`AND (c.nome ILIKE ${`%${termo}%`} OR c.telefone LIKE ${`%${digitos}%`})`
      : sql`AND c.nome ILIKE ${`%${termo}%`}`
    : sql``;
  const condicaoFiltro =
    filtro === "aniversariantes"
      ? sql`AND extract(month from c.data_nascimento) = extract(month from now() at time zone 'America/Sao_Paulo')`
      : filtro === "marketing"
        ? sql`AND c.aceita_marketing`
        : sql``;
  const condicaoGrupo = filtro === "sumidos" ? sql`HAVING max(p.criado_em) < now() - interval '30 days'` : sql``;
  const ordem = filtro === "melhores" ? sql`total_gasto DESC` : sql`ultimo_pedido DESC NULLS LAST`;

  const linhas = await db.execute<{
    id: string;
    nome: string;
    telefone: string;
    aceita_marketing: boolean;
    data_nascimento: string | null;
    pedidos: string;
    total_gasto: string;
    ultimo_pedido: string | null;
  }>(sql`
    SELECT c.id, c.nome, c.telefone, c.aceita_marketing, c.data_nascimento,
      count(p.id) FILTER (WHERE p.status = 'entregue') AS pedidos,
      coalesce(sum(p.total) FILTER (WHERE p.status = 'entregue'), 0) AS total_gasto,
      max(p.criado_em) AS ultimo_pedido
    FROM clientes c
    LEFT JOIN pedidos p ON p.cliente_id = c.id
    WHERE true ${condicaoBusca} ${condicaoFiltro}
    GROUP BY c.id
    ${condicaoGrupo}
    ORDER BY ${ordem}
    LIMIT 200
  `);
  return linhas.map((l) => ({
    id: l.id,
    nome: l.nome,
    telefone: l.telefone,
    aceitaMarketing: l.aceita_marketing,
    dataNascimento: l.data_nascimento,
    pedidos: Number(l.pedidos),
    totalGasto: Number(l.total_gasto),
    ultimoPedido: l.ultimo_pedido ? new Date(l.ultimo_pedido) : null,
  }));
}
