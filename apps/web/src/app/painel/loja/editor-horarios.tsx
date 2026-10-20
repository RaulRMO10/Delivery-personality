"use client";

import { useState, useTransition } from "react";
import { Copy, Plus, X } from "lucide-react";
import { DIAS_SEMANA, minutosParaTexto, textoParaMinutos, type Intervalo } from "@delivery/core";
import { Botao } from "@/components/ui/botao";
import { Cartao } from "@/components/ui/cartao";
import { Aviso } from "@/components/ui/aviso";
import { salvarHorarios } from "./acoes";

interface Linha {
  chave: string;
  diaSemana: number;
  abre: string;
  fecha: string;
}

// Segunda primeiro; domingo por último.
const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0];

export function EditorHorarios({ horarios }: { horarios: Intervalo[] }) {
  const [pendente, iniciar] = useTransition();
  const [mensagem, setMensagem] = useState<{ ok: boolean; texto: string } | null>(null);
  const [linhas, setLinhas] = useState<Linha[]>(() =>
    horarios.map((h) => ({ chave: crypto.randomUUID(), diaSemana: h.diaSemana, abre: minutosParaTexto(h.abre), fecha: minutosParaTexto(h.fecha) })),
  );

  const alterar = (chave: string, campos: Partial<Linha>) => setLinhas((ls) => ls.map((l) => (l.chave === chave ? { ...l, ...campos } : l)));
  const adicionar = (diaSemana: number) => setLinhas((ls) => [...ls, { chave: crypto.randomUUID(), diaSemana, abre: "10:00", fecha: "18:00" }]);

  function copiarParaTodos(diaSemana: number) {
    const modelo = linhas.filter((l) => l.diaSemana === diaSemana);
    setLinhas([
      ...modelo,
      ...ORDEM_DIAS.filter((d) => d !== diaSemana).flatMap((d) => modelo.map((m) => ({ ...m, chave: crypto.randomUUID(), diaSemana: d }))),
    ]);
  }

  function salvar() {
    setMensagem(null);
    const intervalos = linhas.map((l) => ({ diaSemana: l.diaSemana, abre: textoParaMinutos(l.abre), fecha: textoParaMinutos(l.fecha) }));
    if (intervalos.some((i) => i.abre === null || i.fecha === null)) {
      setMensagem({ ok: false, texto: "Preencha todos os horários." });
      return;
    }
    iniciar(async () => {
      const resultado = await salvarHorarios(intervalos as { diaSemana: number; abre: number; fecha: number }[]);
      if (resultado) setMensagem({ ok: resultado.ok, texto: resultado.mensagem ?? "Salvo." });
    });
  }

  return (
    <Cartao className="flex flex-col gap-4">
      <h2 className="text-lg font-bold">Horários</h2>
      <ul className="flex flex-col divide-y divide-borda">
        {ORDEM_DIAS.map((dia) => {
          const doDia = linhas.filter((l) => l.diaSemana === dia);
          return (
            <li key={dia} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start">
              <p className="w-24 shrink-0 pt-2.5 font-semibold">{DIAS_SEMANA[dia]}</p>
              <div className="flex flex-1 flex-col gap-2">
                {doDia.length === 0 && <p className="pt-2.5 text-sm text-texto-suave">Fechado</p>}
                {doDia.map((l) => (
                  <div key={l.chave} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={l.abre}
                      onChange={(e) => alterar(l.chave, { abre: e.target.value })}
                      aria-label={`${DIAS_SEMANA[dia]}: abre`}
                      className="min-h-11 rounded-xl border border-borda bg-superficie px-3"
                    />
                    <span className="text-texto-suave">às</span>
                    <input
                      type="time"
                      value={l.fecha}
                      onChange={(e) => alterar(l.chave, { fecha: e.target.value })}
                      aria-label={`${DIAS_SEMANA[dia]}: fecha`}
                      className="min-h-11 rounded-xl border border-borda bg-superficie px-3"
                    />
                    <button
                      type="button"
                      onClick={() => setLinhas((ls) => ls.filter((x) => x.chave !== l.chave))}
                      className="flex size-11 items-center justify-center rounded-xl text-texto-suave hover:bg-fundo hover:text-status-cancelado"
                      aria-label={`Remover horário de ${DIAS_SEMANA[dia]}`}
                    >
                      <X className="size-5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => adicionar(dia)}
                  className="flex size-11 items-center justify-center rounded-xl text-texto-suave hover:bg-fundo hover:text-texto"
                  aria-label={`Adicionar horário em ${DIAS_SEMANA[dia]}`}
                  title="Adicionar horário"
                >
                  <Plus className="size-5" />
                </button>
                {doDia.length > 0 && (
                  <button
                    type="button"
                    onClick={() => copiarParaTodos(dia)}
                    className="flex size-11 items-center justify-center rounded-xl text-texto-suave hover:bg-fundo hover:text-texto"
                    aria-label={`Copiar horários de ${DIAS_SEMANA[dia]} para todos os dias`}
                    title="Copiar para todos os dias"
                  >
                    <Copy className="size-5" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {mensagem && <Aviso tipo={mensagem.ok ? "sucesso" : "erro"}>{mensagem.texto}</Aviso>}
      <Botao onClick={salvar} disabled={pendente} className="self-start">
        Salvar horários
      </Botao>
    </Cartao>
  );
}
