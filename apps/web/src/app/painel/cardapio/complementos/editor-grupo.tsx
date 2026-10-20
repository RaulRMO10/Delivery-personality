"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { descreverRegraGrupo, type GrupoComplemento } from "@delivery/core";
import { Botao } from "@/components/ui/botao";
import { BotaoEditar } from "@/components/ui/botao-editar";
import { Campo } from "@/components/ui/campo";
import { Dialogo } from "@/components/ui/dialogo";
import { Aviso } from "@/components/ui/aviso";
import { salvarGrupo } from "../acoes";

interface LinhaOpcao {
  chave: string;
  id?: string;
  nome: string;
  preco: string;
  esgotado: boolean;
}

const emReais = (centavos: number) => (centavos ? (centavos / 100).toFixed(2).replace(".", ",") : "");

function linhasIniciais(grupo?: GrupoComplemento): LinhaOpcao[] {
  if (!grupo) return [{ chave: crypto.randomUUID(), nome: "", preco: "", esgotado: false }];
  return grupo.opcoes.map((o) => ({ chave: o.id, id: o.id, nome: o.nome, preco: emReais(o.precoAdicional), esgotado: o.esgotado }));
}

export function EditorGrupo({ grupo }: { grupo?: GrupoComplemento }) {
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [nome, setNome] = useState(grupo?.nome ?? "");
  const [minimo, setMinimo] = useState(String(grupo?.minimo ?? 0));
  const [maximo, setMaximo] = useState(String(grupo?.maximo ?? 1));
  const [linhas, setLinhas] = useState<LinhaOpcao[]>(() => linhasIniciais(grupo));

  function abrir() {
    setNome(grupo?.nome ?? "");
    setMinimo(String(grupo?.minimo ?? 0));
    setMaximo(String(grupo?.maximo ?? 1));
    setLinhas(linhasIniciais(grupo));
    setErro(null);
    setAberto(true);
  }

  function alterar(chave: string, campos: Partial<LinhaOpcao>) {
    setLinhas((atuais) => atuais.map((l) => (l.chave === chave ? { ...l, ...campos } : l)));
  }

  function salvar() {
    setErro(null);
    iniciar(async () => {
      const resultado = await salvarGrupo({
        id: grupo?.id,
        nome,
        minimo: Number(minimo),
        maximo: Number(maximo),
        opcoes: linhas
          .filter((l) => l.nome.trim() || l.preco.trim())
          .map((l) => ({ id: l.id, nome: l.nome, precoAdicional: l.preco.trim() || "0", esgotado: l.esgotado })),
      });
      if (resultado && !resultado.ok) {
        setErro(resultado.mensagem);
        return;
      }
      setAberto(false);
    });
  }

  const min = Number(minimo);
  const max = Number(maximo);
  const regraValida = Number.isInteger(min) && Number.isInteger(max) && min >= 0 && max >= 1 && min <= max;

  return (
    <>
      {grupo ? (
        <BotaoEditar rotulo={`Editar ${grupo.nome}`} onClick={abrir} />
      ) : (
        <Botao onClick={abrir}>
          <Plus className="size-5" aria-hidden />
          Novo grupo
        </Botao>
      )}
      {aberto && (
        <Dialogo titulo={grupo ? "Editar grupo" : "Novo grupo"} aoFechar={() => setAberto(false)}>
          <div className="flex flex-col gap-4">
            <Campo rotulo="Nome do grupo" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Sabores" autoComplete="off" />
            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="Mínimo" type="number" min={0} value={minimo} onChange={(e) => setMinimo(e.target.value)} />
              <Campo rotulo="Máximo" type="number" min={1} value={maximo} onChange={(e) => setMaximo(e.target.value)} />
            </div>
            <p className="text-sm text-texto-suave">{regraValida ? descreverRegraGrupo(min, max) : "Regra inválida."}</p>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold">Opções</p>
              {linhas.map((linha, i) => (
                <div key={linha.chave} className="grid grid-cols-[1fr_6.5rem_auto] gap-2">
                  <input
                    aria-label={`Opção ${i + 1}`}
                    value={linha.nome}
                    onChange={(e) => alterar(linha.chave, { nome: e.target.value })}
                    placeholder="Nome"
                    className="min-h-12 min-w-0 rounded-xl border border-borda bg-superficie px-3 outline-none focus:border-marca-500"
                  />
                  <input
                    aria-label={`Acréscimo da opção ${i + 1}`}
                    value={linha.preco}
                    onChange={(e) => alterar(linha.chave, { preco: e.target.value })}
                    placeholder="+ R$"
                    inputMode="decimal"
                    className="min-h-12 min-w-0 rounded-xl border border-borda bg-superficie px-3 outline-none focus:border-marca-500"
                  />
                  <button
                    type="button"
                    onClick={() => setLinhas((atuais) => atuais.filter((l) => l.chave !== linha.chave))}
                    className="flex size-12 items-center justify-center rounded-xl text-texto-suave hover:bg-fundo hover:text-status-cancelado"
                    aria-label={`Remover opção ${i + 1}`}
                  >
                    <Trash2 className="size-5" />
                  </button>
                </div>
              ))}
              <Botao
                variante="secundario"
                className="self-start"
                onClick={() => setLinhas((atuais) => [...atuais, { chave: crypto.randomUUID(), nome: "", preco: "", esgotado: false }])}
              >
                <Plus className="size-5" aria-hidden />
                Adicionar opção
              </Botao>
            </div>

            {erro && <Aviso tipo="erro">{erro}</Aviso>}
            <Botao onClick={salvar} disabled={pendente}>
              Salvar
            </Botao>
          </div>
        </Dialogo>
      )}
    </>
  );
}
