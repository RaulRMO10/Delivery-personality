"use client";

import { useActionState, useRef } from "react";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { Aviso } from "@/components/ui/aviso";
import { adicionarDataFechada, type Resultado } from "./acoes";

export function NovaDataFechada() {
  const formulario = useRef<HTMLFormElement>(null);
  const [resultado, enviar, enviando] = useActionState<Resultado, FormData>(async (anterior, dados) => {
    const novo = await adicionarDataFechada(anterior, dados);
    if (novo?.ok) formulario.current?.reset();
    return novo;
  }, null);

  return (
    <form ref={formulario} action={enviar} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
        <Campo rotulo="Data" name="data" type="date" required />
        <Campo rotulo="Motivo (opcional)" name="motivo" maxLength={80} placeholder="Ex.: Feriado" />
        <Botao type="submit" variante="secundario" disabled={enviando}>
          Adicionar
        </Botao>
      </div>
      {resultado && !resultado.ok && <Aviso tipo="erro">{resultado.mensagem}</Aviso>}
    </form>
  );
}
