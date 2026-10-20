"use client";

import { useActionState } from "react";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { Cartao } from "@/components/ui/cartao";
import { Aviso } from "@/components/ui/aviso";
import { salvarParametros } from "../acoes";
import { aoEnviar } from "@/lib/formulario";

export function FormularioParametros({ faturamento, margem }: { faturamento: string; margem: string }) {
  const [resultado, enviar, enviando] = useActionState(salvarParametros, null);

  return (
    <Cartao>
      <h2 className="mb-4 text-lg font-bold">Parâmetros</h2>
      <form onSubmit={aoEnviar(enviar)} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Campo rotulo="Faturamento mensal estimado (R$)" name="faturamento" inputMode="decimal" defaultValue={faturamento} required />
        <Campo rotulo="Margem desejada (%)" name="margem" inputMode="decimal" defaultValue={margem} required />
        <Botao type="submit" disabled={enviando}>
          Salvar
        </Botao>
      </form>
      {resultado && (
        <div className="mt-4">
          <Aviso tipo={resultado.ok ? "sucesso" : "erro"}>{resultado.mensagem}</Aviso>
        </div>
      )}
    </Cartao>
  );
}
