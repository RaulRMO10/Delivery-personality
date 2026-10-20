"use server";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import {
  FUSO_LOJA,
  calcularPedido,
  horarioLocal,
  lerDinheiro,
  normalizarTelefone,
  podeOperarLoja,
  statusLoja,
  validarTroco,
  type StatusPedido,
} from "@delivery/core";
import { and, db, eq, schema } from "@delivery/db";
import { calcularStatus, obterConfiguracao } from "@/lib/loja";
import { produtosParaVenda } from "@/lib/cardapio-publico";
import { dentroDoLimite, ipDaRequisicao } from "@/lib/limite";
import { formasAceitas } from "@/lib/pagamentos";
import { obterUsuario } from "@/lib/sessao";

const esquema = z
  .object({
    nome: z.string().trim().min(2, "Informe seu nome.").max(80),
    telefone: z.string().transform((v, ctx) => {
      const t = normalizarTelefone(v);
      if (!t) {
        ctx.addIssue({ code: "custom", message: "Telefone inválido." });
        return z.NEVER;
      }
      return t;
    }),
    tipo: z.enum(["entrega", "retirada"]),
    bairroId: z.string().optional(),
    rua: z.string().trim().max(120).optional(),
    numero: z.string().trim().max(20).optional(),
    complemento: z.string().trim().max(80).optional(),
    referencia: z.string().trim().max(120).optional(),
    quando: z.enum(["agora", "agendado"]),
    data: z.string().optional(),
    hora: z.string().optional(),
    formaPagamento: z.enum(["pix", "pix_online", "dinheiro", "cartao"]),
    canal: z.enum(["site", "whatsapp", "telefone"]).default("site"),
    trocoPara: z.string().optional(),
    observacao: z.string().trim().max(300).optional(),
    itens: z
      .array(
        z.object({
          produtoId: z.uuid(),
          quantidade: z.number().int(),
          escolhas: z.array(z.object({ grupoId: z.uuid(), opcaoId: z.uuid(), quantidade: z.number().int() })).max(50),
          observacao: z.string().max(200).optional(),
        }),
      )
      .min(1, "O carrinho está vazio.")
      .max(50),
  })
  .superRefine((d, ctx) => {
    if (d.tipo === "entrega") {
      if (!d.bairroId) ctx.addIssue({ code: "custom", message: "Selecione o bairro." });
      if (!d.rua) ctx.addIssue({ code: "custom", message: "Informe a rua." });
      if (!d.numero) ctx.addIssue({ code: "custom", message: "Informe o número." });
    }
    if (d.quando === "agendado" && (!d.data || !d.hora)) ctx.addIssue({ code: "custom", message: "Informe data e hora." });
  });

export type DadosPedido = z.input<typeof esquema>;
export type ResultadoPedido = { ok: true; codigo: string; numero: number } | { ok: false; mensagem: string };

/** Converte data e hora locais (fuso da loja) em instante. */
function instanteLocal(data: string, hora: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !/^\d{2}:\d{2}$/.test(hora)) return null;
  // São Paulo não tem horário de verão desde 2019: deslocamento fixo de −03:00.
  const instante = new Date(`${data}T${hora}:00-03:00`);
  if (Number.isNaN(instante.getTime())) return null;
  const local = horarioLocal(instante, FUSO_LOJA);
  return local.data === data ? instante : null;
}

function gerarCodigo() {
  return randomBytes(9).toString("base64url");
}

export async function criarPedido(dados: DadosPedido): Promise<ResultadoPedido> {
  const ip = await ipDaRequisicao();
  const usuario = await obterUsuario();
  // Pedido lançado pela equipe (telefone/WhatsApp): sem limite de tentativas.
  const operador = usuario !== null && podeOperarLoja(usuario.perfil);
  if (!operador && !(await dentroDoLimite(`pedido:ip:${ip}`, 30, 600))) return { ok: false, mensagem: "Muitas tentativas em pouco tempo. Aguarde alguns minutos." };

  const validacao = esquema.safeParse(dados);
  if (!validacao.success) return { ok: false, mensagem: validacao.error.issues[0]?.message ?? "Dados inválidos." };
  const d = validacao.data;
  if (d.canal !== "site" && !operador) return { ok: false, mensagem: "Canal inválido." };
  if (!operador && !(await dentroDoLimite(`pedido:tel:${d.telefone}`, 6, 600))) return { ok: false, mensagem: "Muitas tentativas em pouco tempo. Aguarde alguns minutos." };

  const config = await obterConfiguracao();
  const agora = new Date();

  // Quando: agora (loja aberta) ou agendado (horário de funcionamento, com antecedência do preparo).
  let agendadoPara: Date | null = null;
  if (d.quando === "agora") {
    if (!calcularStatus(config, agora).aberta) return { ok: false, mensagem: "A loja está fechada. Agende o pedido." };
  } else {
    agendadoPara = instanteLocal(d.data!, d.hora!);
    if (!agendadoPara) return { ok: false, mensagem: "Data ou hora inválida." };
    if (agendadoPara.getTime() < agora.getTime() + config.tempoPreparoMin * 60_000) {
      return { ok: false, mensagem: `Agende com pelo menos ${config.tempoPreparoMin} minutos de antecedência.` };
    }
    if (agendadoPara.getTime() > agora.getTime() + 60 * 86_400_000) return { ok: false, mensagem: "Agende com no máximo 60 dias de antecedência." };
    const noHorario = statusLoja(agendadoPara, config.horarios, { fechadaManual: false, pausadaAte: null }, new Set(config.datasFechadas.map((x) => x.data)));
    if (!noHorario.aberta) return { ok: false, mensagem: "A loja não funciona no horário escolhido." };
  }

  if (d.tipo === "retirada" && !config.aceitaRetirada) return { ok: false, mensagem: "Retirada indisponível." };
  if (!formasAceitas(config).includes(d.formaPagamento)) return { ok: false, mensagem: "Forma de pagamento indisponível." };

  let bairro: typeof schema.bairros.$inferSelect | undefined;
  if (d.tipo === "entrega") {
    const parse = z.uuid().safeParse(d.bairroId);
    if (!parse.success) return { ok: false, mensagem: "Selecione o bairro." };
    [bairro] = await db.select().from(schema.bairros).where(and(eq(schema.bairros.id, parse.data), eq(schema.bairros.ativo, true)));
    if (!bairro) return { ok: false, mensagem: "Bairro não atendido." };
  }

  const produtos = await produtosParaVenda(d.itens.map((i) => i.produtoId));
  const calculo = calcularPedido(d.itens, produtos, {
    tipo: d.tipo,
    taxaBairro: bairro?.taxa ?? 0,
    freteGratisAcima: config.freteGratisAcima,
    pedidoMinimo: config.pedidoMinimo,
  });
  if (!calculo.ok) return { ok: false, mensagem: calculo.erro };

  const trocoPara = d.formaPagamento === "dinheiro" && d.trocoPara?.trim() ? lerDinheiro(d.trocoPara) : null;
  if (d.formaPagamento === "dinheiro" && d.trocoPara?.trim() && trocoPara === null) return { ok: false, mensagem: "Valor para troco inválido." };
  const erroTroco = validarTroco(calculo.total, trocoPara);
  if (erroTroco) return { ok: false, mensagem: erroTroco };

  const status: StatusPedido = d.formaPagamento === "pix_online" ? "aguardando_pagamento" : "recebido";
  const previsaoEm = agendadoPara ?? new Date(agora.getTime() + (config.tempoPreparoMin + (bairro?.tempoEstimadoMin ?? 0)) * 60_000);
  const codigo = gerarCodigo();

  const pedido = await db.transaction(async (tx) => {
    const [cliente] = await tx
      .insert(schema.clientes)
      .values({ nome: d.nome, telefone: d.telefone })
      .onConflictDoUpdate({ target: schema.clientes.telefone, set: { nome: d.nome } })
      .returning({ id: schema.clientes.id });

    const [novo] = await tx
      .insert(schema.pedidos)
      .values({
        codigo,
        canal: d.canal,
        clienteId: cliente!.id,
        nomeCliente: d.nome,
        telefoneCliente: d.telefone,
        tipo: d.tipo,
        bairroId: bairro?.id ?? null,
        endereco: bairro
          ? { bairro: bairro.nome, rua: d.rua!, numero: d.numero!, complemento: d.complemento || null, referencia: d.referencia || null }
          : null,
        status,
        agendadoPara,
        previsaoEm,
        subtotal: calculo.subtotal,
        taxaEntrega: calculo.taxaEntrega,
        desconto: calculo.desconto,
        total: calculo.total,
        formaPagamento: d.formaPagamento,
        trocoPara,
        observacao: d.observacao || null,
        ip,
      })
      .returning({ id: schema.pedidos.id, numero: schema.pedidos.numero });

    await tx.insert(schema.pedidoItens).values(
      calculo.itens.map((item, ordem) => ({
        pedidoId: novo!.id,
        produtoId: item.produtoId,
        nome: item.nome,
        precoUnitario: item.precoUnitario,
        quantidade: item.quantidade,
        observacao: item.observacao,
        opcoes: item.opcoes,
        ordem,
      })),
    );
    await tx.insert(schema.pedidoHistorico).values({ pedidoId: novo!.id, status });
    return novo!;
  });

  return { ok: true, codigo, numero: pedido.numero };
}
