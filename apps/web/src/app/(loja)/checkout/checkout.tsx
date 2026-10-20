"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { NOME_PAGAMENTO, formatarDinheiro, taxaEntrega, type FormaPagamento } from "@delivery/core";
import { cn } from "@/lib/utils";
import { Campo, Selecao } from "@/components/ui/campo";
import { Aviso } from "@/components/ui/aviso";
import { guardarPedidoNoAparelho, useCarrinho } from "@/components/loja/carrinho";
import { Contador } from "@/components/loja/janela-produto";
import { criarPedido } from "./acoes";

interface Props {
  /** Pessoa da equipe logada: pode lançar pedidos de telefone e WhatsApp. */
  operador: boolean;
  aberta: boolean;
  bairros: { id: string; nome: string; taxa: number }[];
  aceitaRetirada: boolean;
  pedidoMinimo: number;
  freteGratisAcima: number | null;
  formas: FormaPagamento[];
  hoje: string;
}

const CHAVE_CLIENTE = "cliente:v1";

function Opcao({ ativo, onClick, children, disabled }: { ativo: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={ativo}
      className={cn(
        "min-h-12 flex-1 rounded-xl border px-4 font-semibold transition-colors disabled:opacity-40",
        ativo ? "border-marca-600 bg-marca-50 text-marca-700" : "border-borda bg-superficie",
      )}
    >
      {children}
    </button>
  );
}

export function Checkout({ operador, aberta, bairros, aceitaRetirada, pedidoMinimo, freteGratisAcima, formas, hoje }: Props) {
  const [canal, setCanal] = useState<"site" | "whatsapp" | "telefone">(operador ? "whatsapp" : "site");
  const router = useRouter();
  const carrinho = useCarrinho();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [tipo, setTipo] = useState<"entrega" | "retirada">("entrega");
  const [bairroId, setBairroId] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [referencia, setReferencia] = useState("");
  const [quando, setQuando] = useState<"agora" | "agendado">(aberta ? "agora" : "agendado");
  const [data, setData] = useState(hoje);
  const [hora, setHora] = useState("");
  const [forma, setForma] = useState<FormaPagamento>(formas[0] ?? "pix");
  const [troco, setTroco] = useState("");
  const [observacao, setObservacao] = useState("");

  // Preenche os dados do último pedido feito neste aparelho (não para a equipe, que lança para vários clientes).
  useEffect(() => {
    if (operador) return;
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_CLIENTE) ?? "null");
      if (salvo) {
        /* eslint-disable react-hooks/set-state-in-effect -- leitura única do armazenamento local */
        setNome(salvo.nome ?? "");
        setTelefone(salvo.telefone ?? "");
        setBairroId(salvo.bairroId ?? "");
        setRua(salvo.rua ?? "");
        setNumero(salvo.numero ?? "");
        setComplemento(salvo.complemento ?? "");
        setReferencia(salvo.referencia ?? "");
        /* eslint-enable react-hooks/set-state-in-effect */
      }
    } catch {
      // Sem dados salvos.
    }
  }, [operador]);

  const bairro = bairros.find((b) => b.id === bairroId);
  const taxa = tipo === "retirada" || !bairro ? 0 : taxaEntrega(carrinho.subtotal, bairro.taxa, { freteGratisAcima });
  const total = carrinho.subtotal + taxa;
  const abaixoDoMinimo = carrinho.subtotal < pedidoMinimo;

  function finalizar() {
    setErro(null);
    iniciar(async () => {
      const resultado = await criarPedido({
        nome,
        telefone,
        tipo,
        bairroId,
        rua,
        numero,
        complemento,
        referencia,
        quando,
        data,
        hora,
        formaPagamento: forma,
        canal,
        trocoPara: troco,
        observacao,
        itens: carrinho.itens.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade, escolhas: i.escolhas, observacao: i.observacao })),
      });
      if (!resultado.ok) {
        setErro(resultado.mensagem);
        return;
      }
      if (operador) {
        carrinho.limpar();
        router.push("/painel/pedidos");
        return;
      }
      try {
        localStorage.setItem(CHAVE_CLIENTE, JSON.stringify({ nome, telefone, bairroId, rua, numero, complemento, referencia }));
      } catch {
        // Sem armazenamento local.
      }
      guardarPedidoNoAparelho({ codigo: resultado.codigo, numero: resultado.numero });
      carrinho.limpar();
      router.push(`/pedido/${resultado.codigo}`);
    });
  }

  if (!carrinho.carregado) return null;

  if (carrinho.itens.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 px-4 py-16 text-center">
        <p className="text-texto-suave">Seu carrinho está vazio.</p>
        <Link href="/" className="font-semibold text-marca-600 hover:underline">
          Ver cardápio
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
      <h1 className="text-2xl font-bold">Finalizar pedido</h1>

      {operador && (
        <section className="flex flex-col gap-3 rounded-2xl border border-marca-200 bg-marca-50 p-4">
          <p className="text-sm font-bold text-marca-700">Pedido lançado pela equipe</p>
          <div className="flex gap-2">
            {(["whatsapp", "telefone", "site"] as const).map((c) => (
              <Opcao key={c} ativo={canal === c} onClick={() => setCanal(c)}>
                {c === "whatsapp" ? "WhatsApp" : c === "telefone" ? "Telefone" : "Site"}
              </Opcao>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-borda bg-superficie">
        <ul className="divide-y divide-borda">
          {carrinho.itens.map((item) => (
            <li key={item.chave} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{item.nome}</p>
                {item.resumoOpcoes && <p className="text-sm text-texto-suave">{item.resumoOpcoes}</p>}
                {item.observacao && <p className="text-sm text-texto-suave italic">{item.observacao}</p>}
                <p className="mt-1 text-sm font-semibold">{formatarDinheiro(item.precoUnitario * item.quantidade)}</p>
              </div>
              {item.quantidade === 1 ? (
                <button
                  type="button"
                  onClick={() => carrinho.remover(item.chave)}
                  className="flex size-10 items-center justify-center rounded-full text-texto-suave hover:text-status-cancelado"
                  aria-label={`Remover ${item.nome}`}
                >
                  <Trash2 className="size-5" />
                </button>
              ) : null}
              <Contador valor={item.quantidade} aoMudar={(n) => carrinho.alterarQuantidade(item.chave, n)} minimo={item.quantidade === 1 ? 1 : 0} maximo={99} rotulo={item.nome} />
            </li>
          ))}
        </ul>
        <div className="border-t border-borda p-4">
          <Link href="/" className="text-sm font-semibold text-marca-600 hover:underline">
            Adicionar mais itens
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-borda bg-superficie p-4">
        <h2 className="text-lg font-bold">Seus dados</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Nome" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" required />
          <Campo rotulo="Celular (WhatsApp)" value={telefone} onChange={(e) => setTelefone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" required />
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-borda bg-superficie p-4">
        <h2 className="text-lg font-bold">Entrega</h2>
        {aceitaRetirada && (
          <div className="flex gap-2">
            <Opcao ativo={tipo === "entrega"} onClick={() => setTipo("entrega")}>
              Entregar
            </Opcao>
            <Opcao ativo={tipo === "retirada"} onClick={() => setTipo("retirada")}>
              Retirar
            </Opcao>
          </div>
        )}
        {tipo === "entrega" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Selecao rotulo="Bairro" value={bairroId} onChange={(e) => setBairroId(e.target.value)} required>
                <option value="">Selecione</option>
                {bairros.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nome} · {b.taxa === 0 ? "grátis" : formatarDinheiro(b.taxa)}
                  </option>
                ))}
              </Selecao>
            </div>
            <Campo rotulo="Rua" value={rua} onChange={(e) => setRua(e.target.value)} autoComplete="address-line1" required />
            <Campo rotulo="Número" value={numero} onChange={(e) => setNumero(e.target.value)} required />
            <Campo rotulo="Complemento" value={complemento} onChange={(e) => setComplemento(e.target.value)} autoComplete="address-line2" />
            <Campo rotulo="Ponto de referência" value={referencia} onChange={(e) => setReferencia(e.target.value)} />
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-borda bg-superficie p-4">
        <h2 className="text-lg font-bold">Quando</h2>
        <div className="flex gap-2">
          <Opcao ativo={quando === "agora"} onClick={() => setQuando("agora")} disabled={!aberta}>
            {aberta ? "Agora" : "Loja fechada"}
          </Opcao>
          <Opcao ativo={quando === "agendado"} onClick={() => setQuando("agendado")}>
            Agendar
          </Opcao>
        </div>
        {quando === "agendado" && (
          <div className="grid grid-cols-2 gap-4">
            <Campo rotulo="Data" type="date" min={hoje} value={data} onChange={(e) => setData(e.target.value)} required />
            <Campo rotulo="Hora" type="time" step={900} value={hora} onChange={(e) => setHora(e.target.value)} required />
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-borda bg-superficie p-4">
        <h2 className="text-lg font-bold">Pagamento</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {formas.map((f) => (
            <Opcao key={f} ativo={forma === f} onClick={() => setForma(f)}>
              {NOME_PAGAMENTO[f]}
            </Opcao>
          ))}
        </div>
        {forma === "dinheiro" && <Campo rotulo="Troco para (opcional)" value={troco} onChange={(e) => setTroco(e.target.value)} inputMode="decimal" placeholder="R$" />}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Observação do pedido (opcional)</span>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            maxLength={300}
            rows={2}
            className="rounded-xl border border-borda px-4 py-3 outline-none focus:border-marca-500"
          />
        </label>
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border border-borda bg-superficie p-4">
        <div className="flex justify-between">
          <span className="text-texto-suave">Subtotal</span>
          <span>{formatarDinheiro(carrinho.subtotal)}</span>
        </div>
        {tipo === "entrega" && (
          <div className="flex justify-between">
            <span className="text-texto-suave">Entrega</span>
            <span>{bairro ? (taxa === 0 ? "Grátis" : formatarDinheiro(taxa)) : "—"}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>{formatarDinheiro(total)}</span>
        </div>
        {abaixoDoMinimo && <Aviso>Pedido mínimo de {formatarDinheiro(pedidoMinimo)}.</Aviso>}
        {freteGratisAcima !== null && tipo === "entrega" && carrinho.subtotal < freteGratisAcima && (
          <p className="text-sm text-texto-suave">Frete grátis acima de {formatarDinheiro(freteGratisAcima)}.</p>
        )}
      </section>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      <button
        type="button"
        onClick={finalizar}
        disabled={pendente || abaixoDoMinimo}
        className="flex min-h-14 items-center justify-between rounded-xl bg-marca-600 px-5 text-lg font-bold text-white hover:bg-marca-700 disabled:opacity-50"
      >
        <span>{pendente ? "Enviando…" : "Fazer pedido"}</span>
        <span>{formatarDinheiro(total)}</span>
      </button>
    </main>
  );
}
