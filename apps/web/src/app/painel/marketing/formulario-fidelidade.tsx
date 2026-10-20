"use client";

import { useActionState, useState } from "react";
import { aoEnviar } from "@/lib/formulario";
import { Botao } from "@/components/ui/botao";
import { Campo, Selecao } from "@/components/ui/campo";
import { Cartao } from "@/components/ui/cartao";
import { Aviso } from "@/components/ui/aviso";
import { salvarFidelidade } from "./acoes";

interface Props {
  ativa: boolean;
  pedidos: string;
  tipo: "valor" | "percentual";
  valor: string;
}

export function FormularioFidelidade({ ativa, pedidos, tipo: tipoInicial, valor }: Props) {
  const [resultado, enviar, enviando] = useActionState(salvarFidelidade, null);
  const [tipo, setTipo] = useState(tipoInicial);
  return (
    <Cartao>
      <h2 className="mb-4 text-lg font-bold">Fidelidade</h2>
      <form onSubmit={aoEnviar(enviar)} className="flex flex-col gap-4">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="fidelidadeAtiva" defaultChecked={ativa} className="size-5 accent-marca-600" />
          Ativar programa de fidelidade
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo rotulo="A cada (pedidos entregues)" name="fidelidadePedidos" defaultValue={pedidos} inputMode="numeric" required />
          <Selecao rotulo="Recompensa" name="fidelidadeTipo" value={tipo} onChange={(e) => setTipo(e.target.value as "valor" | "percentual")}>
            <option value="valor">Desconto em R$</option>
            <option value="percentual">Desconto em %</option>
          </Selecao>
          <Campo rotulo={tipo === "percentual" ? "Desconto (%)" : "Desconto (R$)"} name="fidelidadeValor" defaultValue={valor} inputMode="decimal" />
        </div>
        {resultado && <Aviso tipo={resultado.ok ? "sucesso" : "erro"}>{resultado.mensagem ?? "Salvo."}</Aviso>}
        <Botao type="submit" disabled={enviando} className="self-start">
          Salvar
        </Botao>
      </form>
    </Cartao>
  );
}
