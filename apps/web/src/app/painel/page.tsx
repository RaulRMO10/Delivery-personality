import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ChevronRight } from "lucide-react";
import {
  FUSO_LOJA,
  MINUTOS_ATRASO,
  NOME_CANAL,
  NOME_STATUS,
  formatarDinheiro,
  podeAcessar,
  telaInicial,
  type CanalPedido,
  type StatusPedido,
} from "@delivery/core";
import { and, count, db, desc, eq, gte, lt, ne, schema } from "@delivery/db";
import { exigirModulo, exigirUsuario } from "@/lib/sessao";
import { obterConfiguracao } from "@/lib/loja";
import { dataLocal, limitesDoPeriodo } from "@/lib/relatorios";
import { calcularMargens, carregarCustos, listarProdutos } from "./cardapio/dados";
import { listarInsumos } from "./receitas/dados";
import { TituloPagina } from "@/components/titulo-pagina";
import { Cartao } from "@/components/ui/cartao";
import { Selo } from "@/components/ui/selo";

export const metadata: Metadata = { title: "Início" };

const formatoHora = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_LOJA, hour: "2-digit", minute: "2-digit" });
const DIAS_PRECO_DESATUALIZADO = 90;

async function carregarAlertas() {
  const config = await obterConfiguracao();
  const [produtos, custos, insumos, [bairros]] = await Promise.all([
    listarProdutos(),
    carregarCustos(),
    listarInsumos(),
    db.select({ total: count() }).from(schema.bairros).where(eq(schema.bairros.ativo, true)),
  ]);
  const alertas: { texto: string; href: string }[] = [];
  if (produtos.filter((p) => p.ativo).length === 0) alertas.push({ texto: "Cardápio sem produtos visíveis.", href: "/painel/cardapio" });
  if (config.horarios.length === 0) alertas.push({ texto: "Horários de funcionamento não cadastrados.", href: "/painel/loja" });
  if ((bairros?.total ?? 0) === 0) alertas.push({ texto: "Nenhum bairro de entrega ativo.", href: "/painel/entrega" });
  if (!config.telefone) alertas.push({ texto: "WhatsApp da loja não informado.", href: "/painel/loja" });
  if (config.formasPagamento.includes("pix") && !config.chavePix) alertas.push({ texto: "Chave Pix não cadastrada.", href: "/painel/pagamentos" });
  const comPrejuizo = produtos.filter((p) => p.ativo && calcularMargens(p, custos)?.canais.some((c) => c.lucro < 0)).length;
  if (comPrejuizo > 0) alertas.push({ texto: `${comPrejuizo} ${comPrejuizo === 1 ? "produto com prejuízo" : "produtos com prejuízo"} em algum canal.`, href: "/painel/cardapio" });
  const limite = Date.now() - DIAS_PRECO_DESATUALIZADO * 86_400_000;
  const antigos = insumos.filter((i) => i.precoAtualizadoEm.getTime() < limite).length;
  if (antigos > 0) alertas.push({ texto: `${antigos} ${antigos === 1 ? "item com preço" : "itens com preço"} sem atualização há ${DIAS_PRECO_DESATUALIZADO} dias.`, href: "/painel/receitas/ingredientes" });
  return alertas;
}

export default async function PaginaInicio() {
  const usuario = await exigirUsuario();
  if (!podeAcessar(usuario.perfil, "inicio")) redirect(telaInicial(usuario.perfil));
  await exigirModulo("inicio");

  const hoje = dataLocal();
  const { inicio, fim } = limitesDoPeriodo({ de: hoje, ate: hoje });
  const amanha = limitesDoPeriodo({ de: dataLocal(1), ate: dataLocal(1) });
  const [pedidosHoje, ativos, [encomendasHoje], [encomendasAmanha], ultimos, alertas] = await Promise.all([
    db.select().from(schema.pedidos).where(and(gte(schema.pedidos.criadoEm, inicio), lt(schema.pedidos.criadoEm, fim), ne(schema.pedidos.status, "cancelado"))),
    db.select().from(schema.pedidos).where(and(ne(schema.pedidos.status, "entregue"), ne(schema.pedidos.status, "cancelado"), ne(schema.pedidos.status, "aguardando_pagamento"))),
    db.select({ total: count() }).from(schema.pedidos).where(and(gte(schema.pedidos.agendadoPara, inicio), lt(schema.pedidos.agendadoPara, fim), ne(schema.pedidos.status, "cancelado"))),
    db.select({ total: count() }).from(schema.pedidos).where(and(gte(schema.pedidos.agendadoPara, amanha.inicio), lt(schema.pedidos.agendadoPara, amanha.fim), ne(schema.pedidos.status, "cancelado"))),
    db.select().from(schema.pedidos).orderBy(desc(schema.pedidos.criadoEm)).limit(6),
    carregarAlertas(),
  ]);

  const faturamento = pedidosHoje.reduce((s, p) => s + p.total, 0);
  const agora = new Date();
  const atrasados = ativos.filter((p) => !p.agendadoPara && agora.getTime() - p.criadoEm.getTime() > MINUTOS_ATRASO * 60_000).length;
  const porCanal = new Map<string, number>();
  for (const p of pedidosHoje) porCanal.set(NOME_CANAL[p.canal as CanalPedido], (porCanal.get(NOME_CANAL[p.canal as CanalPedido]) ?? 0) + 1);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <TituloPagina titulo={`Olá, ${usuario.nome.split(" ")[0]}`} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cartao>
          <p className="text-sm text-texto-suave">Vendas hoje</p>
          <p className="text-3xl font-bold">{formatarDinheiro(faturamento)}</p>
        </Cartao>
        <Cartao>
          <p className="text-sm text-texto-suave">Pedidos hoje</p>
          <p className="text-3xl font-bold">{pedidosHoje.length}</p>
          {porCanal.size > 0 && <p className="mt-1 text-xs text-texto-suave">{[...porCanal.entries()].map(([c, n]) => `${c} ${n}`).join(" · ")}</p>}
        </Cartao>
        <Link href="/painel/pedidos" className="rounded-2xl border border-borda bg-superficie p-5 hover:bg-fundo">
          <p className="text-sm text-texto-suave">Em andamento</p>
          <p className="text-3xl font-bold">{ativos.length}</p>
          {atrasados > 0 && <p className="mt-1 text-xs font-bold text-status-cancelado">{atrasados} atrasado(s)</p>}
        </Link>
        <Link href="/painel/agenda" className="rounded-2xl border border-borda bg-superficie p-5 hover:bg-fundo">
          <p className="text-sm text-texto-suave">Encomendas</p>
          <p className="text-3xl font-bold">{encomendasHoje?.total ?? 0}</p>
          <p className="mt-1 text-xs text-texto-suave">Amanhã: {encomendasAmanha?.total ?? 0}</p>
        </Link>
      </div>

      {alertas.length > 0 && (
        <Cartao className="flex flex-col gap-1 p-3">
          {alertas.map((a) => (
            <Link key={a.texto} href={a.href} className="flex min-h-11 items-center gap-3 rounded-xl px-2 hover:bg-fundo">
              <AlertTriangle className="size-5 shrink-0 text-status-atrasado" aria-hidden />
              <span className="flex-1 text-sm">{a.texto}</span>
              <ChevronRight className="size-4 text-texto-suave" aria-hidden />
            </Link>
          ))}
        </Cartao>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Últimos pedidos</h2>
          <Link href="/painel/relatorios" className="text-sm font-semibold text-marca-600 hover:underline">
            Relatórios
          </Link>
        </div>
        {ultimos.length === 0 ? (
          <p className="text-sm text-texto-suave">Nenhum pedido ainda.</p>
        ) : (
          <Cartao className="p-0">
            <ul className="divide-y divide-borda">
              {ultimos.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="font-bold">#{p.numero}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {p.nomeCliente} <span className="text-texto-suave">· {formatoHora.format(p.criadoEm)}</span>
                  </span>
                  <Selo>{NOME_STATUS[p.status as StatusPedido]}</Selo>
                  <span className="font-semibold">{formatarDinheiro(p.total)}</span>
                </li>
              ))}
            </ul>
          </Cartao>
        )}
      </section>
    </div>
  );
}
