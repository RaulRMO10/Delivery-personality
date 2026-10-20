"use client";

import { useActionState } from "react";
import { aoEnviar } from "@/lib/formulario";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { Cartao } from "@/components/ui/cartao";
import { Aviso } from "@/components/ui/aviso";
import { salvarRegrasAgenda } from "./acoes";

export function FormularioAgenda({ antecedenciaHoras, limitePorDia }: { antecedenciaHoras: string; limitePorDia: string }) {
  const [resultado, enviar, enviando] = useActionState(salvarRegrasAgenda, null);
  return (
    <Cartao>
      <h2 className="mb-4 text-lg font-bold">Regras de encomenda</h2>
      <form onSubmit={aoEnviar(enviar)} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Campo rotulo="Antecedência mínima (horas)" name="antecedenciaHoras" defaultValue={antecedenciaHoras} inputMode="numeric" required />
        <Campo rotulo="Limite por dia" name="limitePorDia" defaultValue={limitePorDia} inputMode="numeric" placeholder="Sem limite" />
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
