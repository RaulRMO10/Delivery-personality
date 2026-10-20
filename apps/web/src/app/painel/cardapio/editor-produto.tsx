"use client";

import { useMemo, useRef, useState, useTransition, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageIcon, Plus, Trash2 } from "lucide-react";
import {
  descreverRegraGrupo,
  formatarDinheiro,
  formatarNumero,
  formatarPercentual,
  lerDinheiro,
  lerNumero,
  type GrupoComplemento,
} from "@delivery/core";
import { cn } from "@/lib/utils";
import { prepararFoto } from "@/lib/imagem";
import { Botao } from "@/components/ui/botao";
import { AreaTexto, Campo, Selecao } from "@/components/ui/campo";
import { Cartao } from "@/components/ui/cartao";
import { Aviso } from "@/components/ui/aviso";
import { excluirProduto, salvarProduto } from "./acoes";
import { calcularMargens, type DadosCusto } from "./margens";
import { classeMargem } from "./selo-margem";
import type { Categoria, Produto } from "./dados";

interface Props {
  categorias: Categoria[];
  grupos: GrupoComplemento[];
  custos: DadosCusto;
  produto?: Produto;
}

interface LinhaEmbalagem {
  chave: string;
  insumoId: string;
  quantidade: string;
}

const emReais = (centavos: number | undefined) => (centavos === undefined ? "" : (centavos / 100).toFixed(2).replace(".", ","));
const paraTexto = (n: number | null) => (n === null ? "" : formatarNumero(n).replace(/\./g, ""));

export function EditorProduto({ categorias, grupos, custos, produto }: Props) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const entradaFoto = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState(produto?.nome ?? "");
  const [categoriaId, setCategoriaId] = useState(produto?.categoriaId ?? categorias[0]?.id ?? "");
  const [descricao, setDescricao] = useState(produto?.descricao ?? "");
  const [preco, setPreco] = useState(emReais(produto?.preco));
  const [ativo, setAtivo] = useState(produto?.ativo ?? true);
  const [destaque, setDestaque] = useState(produto?.destaque ?? false);
  const [precosCanal, setPrecosCanal] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(produto?.precosCanal ?? {}).map(([canal, valor]) => [canal, emReais(valor)])),
  );
  const [receitaId, setReceitaId] = useState(produto?.receitaId ?? "");
  const [quantidadeReceita, setQuantidadeReceita] = useState(paraTexto(produto?.quantidadeReceita ?? null));
  const [embalagens, setEmbalagens] = useState<LinhaEmbalagem[]>(() =>
    (produto?.embalagens ?? []).map((e) => ({ chave: e.insumoId, insumoId: e.insumoId, quantidade: paraTexto(e.quantidade) })),
  );
  const [grupoIds, setGrupoIds] = useState<string[]>(produto?.grupoIds ?? []);

  const [foto, setFoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [removerFoto, setRemoverFoto] = useState(false);
  const fotoAtual = foto?.url ?? (removerFoto ? null : (produto?.fotoUrl ?? null));

  const outrosCanais = custos.canais.filter((c) => !c.principal);
  const receita = custos.receitas.find((r) => r.id === receitaId);

  const margens = useMemo(() => {
    const precoNumero = lerDinheiro(preco);
    if (precoNumero === null) return null;
    const precos: Record<string, number> = {};
    for (const [canal, valor] of Object.entries(precosCanal)) {
      const n = lerDinheiro(valor);
      if (n !== null) precos[canal] = n;
    }
    return calcularMargens(
      {
        preco: precoNumero,
        receitaId: receitaId || null,
        quantidadeReceita: lerNumero(quantidadeReceita),
        embalagens: embalagens.flatMap((e) => {
          const q = lerNumero(e.quantidade);
          return e.insumoId && q ? [{ insumoId: e.insumoId, quantidade: q }] : [];
        }),
        precosCanal: precos,
      },
      custos,
    );
  }, [preco, precosCanal, receitaId, quantidadeReceita, embalagens, custos]);

  async function escolherFoto(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!arquivo) return;
    setErro(null);
    try {
      const blob = await prepararFoto(arquivo);
      if (foto) URL.revokeObjectURL(foto.url);
      setFoto({ blob, url: URL.createObjectURL(blob) });
      setRemoverFoto(false);
    } catch {
      setErro("Não foi possível usar esta foto.");
    }
  }

  function salvar() {
    setErro(null);
    const formulario = new FormData();
    formulario.set(
      "dados",
      JSON.stringify({
        id: produto?.id,
        categoriaId,
        nome,
        descricao,
        preco,
        ativo,
        destaque,
        precosCanal,
        receitaId,
        quantidadeReceita,
        embalagens: embalagens.filter((e) => e.insumoId || e.quantidade).map((e) => ({ insumoId: e.insumoId, quantidade: e.quantidade })),
        grupoIds,
      }),
    );
    if (foto) formulario.set("foto", foto.blob, "foto.webp");
    if (removerFoto) formulario.set("removerFoto", "1");
    iniciar(async () => {
      const resultado = await salvarProduto(formulario);
      if (!resultado.ok) {
        setErro(resultado.mensagem);
        return;
      }
      router.push("/painel/cardapio");
    });
  }

  function excluir() {
    if (!produto || !confirm(`Excluir "${produto.nome}"?`)) return;
    iniciar(async () => {
      const resultado = await excluirProduto(produto.id);
      if (resultado && !resultado.ok) {
        setErro(resultado.mensagem);
        return;
      }
      router.push("/painel/cardapio");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Cartao className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <div className="flex flex-col items-center gap-2">
          {fotoAtual ? (
            // eslint-disable-next-line @next/next/no-img-element -- prévia local ou foto da API
            <img src={fotoAtual} alt="Foto do produto" className="aspect-square w-40 rounded-2xl object-cover" />
          ) : (
            <span className="flex aspect-square w-40 items-center justify-center rounded-2xl bg-fundo text-texto-suave">
              <ImageIcon className="size-8" aria-hidden />
            </span>
          )}
          <input ref={entradaFoto} type="file" accept="image/*" className="hidden" onChange={escolherFoto} aria-label="Foto" />
          <Botao variante="secundario" className="min-h-10 w-40 text-sm" onClick={() => entradaFoto.current?.click()}>
            {fotoAtual ? "Trocar foto" : "Adicionar foto"}
          </Botao>
          {fotoAtual && (
            <button
              type="button"
              className="text-sm font-semibold text-texto-suave hover:text-status-cancelado"
              onClick={() => {
                if (foto) URL.revokeObjectURL(foto.url);
                setFoto(null);
                setRemoverFoto(Boolean(produto?.fotoUrl));
              }}
            >
              Remover foto
            </button>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <Campo rotulo="Nome" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="off" required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Selecao rotulo="Categoria" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Selecao>
            <Campo rotulo="Preço (R$)" value={preco} onChange={(e) => setPreco(e.target.value)} inputMode="decimal" required />
          </div>
          <AreaTexto rotulo="Descrição (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={500} className="min-h-20" />
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="size-5 accent-marca-600" />
              Visível na loja
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={destaque} onChange={(e) => setDestaque(e.target.checked)} className="size-5 accent-marca-600" />
              Destaque
            </label>
          </div>
        </div>
      </Cartao>

      {outrosCanais.length > 0 && (
        <Cartao className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Preço por canal</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {outrosCanais.map((canal) => (
              <Campo
                key={canal.id}
                rotulo={`${canal.nome} (R$)`}
                value={precosCanal[canal.id] ?? ""}
                onChange={(e) => setPrecosCanal((p) => ({ ...p, [canal.id]: e.target.value }))}
                placeholder="Igual à loja"
                inputMode="decimal"
              />
            ))}
          </div>
        </Cartao>
      )}

      <Cartao className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Custo</h2>
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
          <Selecao rotulo="Receita" value={receitaId} onChange={(e) => setReceitaId(e.target.value)}>
            <option value="">Sem receita</option>
            {custos.receitas.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome}
              </option>
            ))}
          </Selecao>
          {receitaId && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="quantidade-receita" className="text-sm font-semibold">
                Quantidade por venda
              </label>
              <div className="flex min-h-12 items-center rounded-xl border border-borda bg-superficie focus-within:border-marca-500">
                <input
                  id="quantidade-receita"
                  value={quantidadeReceita}
                  onChange={(e) => setQuantidadeReceita(e.target.value)}
                  inputMode="decimal"
                  className="w-full min-w-0 bg-transparent px-4 outline-none"
                />
                <span className="pr-4 text-sm text-texto-suave">{receita?.unidade}</span>
              </div>
            </div>
          )}
        </div>
        {embalagens.map((linha, i) => (
          <div key={linha.chave} className="grid grid-cols-[1fr_7rem_auto] gap-2">
            <select
              aria-label={`Embalagem ${i + 1}`}
              value={linha.insumoId}
              onChange={(e) => setEmbalagens((ls) => ls.map((l) => (l.chave === linha.chave ? { ...l, insumoId: e.target.value } : l)))}
              className="min-h-12 rounded-xl border border-borda bg-superficie px-3"
            >
              <option value="">Selecione</option>
              {custos.embalagens.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
            <input
              aria-label={`Quantidade da embalagem ${i + 1}`}
              value={linha.quantidade}
              onChange={(e) => setEmbalagens((ls) => ls.map((l) => (l.chave === linha.chave ? { ...l, quantidade: e.target.value } : l)))}
              inputMode="decimal"
              className="min-h-12 min-w-0 rounded-xl border border-borda bg-superficie px-3 outline-none focus:border-marca-500"
            />
            <button
              type="button"
              onClick={() => setEmbalagens((ls) => ls.filter((l) => l.chave !== linha.chave))}
              className="flex size-12 items-center justify-center rounded-xl text-texto-suave hover:bg-fundo hover:text-status-cancelado"
              aria-label={`Remover embalagem ${i + 1}`}
            >
              <Trash2 className="size-5" />
            </button>
          </div>
        ))}
        {custos.embalagens.length > 0 && (
          <Botao
            variante="secundario"
            className="self-start"
            onClick={() => setEmbalagens((ls) => [...ls, { chave: crypto.randomUUID(), insumoId: "", quantidade: "1" }])}
          >
            <Plus className="size-5" aria-hidden />
            Adicionar embalagem
          </Botao>
        )}

        {margens ? (
          <div className="flex flex-col gap-2 rounded-xl bg-fundo p-4">
            <p className="text-sm text-texto-suave">
              Custo <span className="font-bold text-texto">{formatarDinheiro(margens.custo)}</span>
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {margens.canais.map((m) => (
                <li key={m.canalId} className="flex items-center justify-between gap-2 rounded-lg bg-superficie px-3 py-2">
                  <span className="font-semibold">{m.canal}</span>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-sm font-bold", classeMargem(m, custos.margemDesejada))}>
                    {formatarPercentual(m.margemPercentual)} · {m.lucro < 0 ? "−" : ""}
                    {formatarDinheiro(Math.abs(m.lucro))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-texto-suave">Vincule uma receita para ver a margem.</p>
        )}
      </Cartao>

      {grupos.length > 0 && (
        <Cartao className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Complementos</h2>
          <ul className="flex flex-col gap-2">
            {grupos.map((g) => (
              <li key={g.id}>
                <label className="flex min-h-11 items-center gap-3">
                  <input
                    type="checkbox"
                    checked={grupoIds.includes(g.id)}
                    onChange={(e) => setGrupoIds((ids) => (e.target.checked ? [...ids, g.id] : ids.filter((id) => id !== g.id)))}
                    className="size-5 accent-marca-600"
                  />
                  <span className="font-semibold">{g.nome}</span>
                  <span className="text-sm text-texto-suave">{descreverRegraGrupo(g.minimo, g.maximo)}</span>
                </label>
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-3">
          <Botao onClick={salvar} disabled={pendente}>
            Salvar
          </Botao>
          <Link href="/painel/cardapio" className="inline-flex min-h-12 items-center px-4 font-semibold text-texto-suave hover:text-texto">
            Cancelar
          </Link>
        </div>
        {produto && (
          <Botao variante="fantasma" onClick={excluir} disabled={pendente} className="text-status-cancelado">
            Excluir produto
          </Botao>
        )}
      </div>
    </div>
  );
}
