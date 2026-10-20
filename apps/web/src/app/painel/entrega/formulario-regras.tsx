"use client";

import { useActionState } from "react";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { Cartao } from "@/components/ui/cartao";
import { Aviso } from "@/components/ui/aviso";
import { salvarRegrasEntrega } from "../loja/acoes";

interface Props {
  pedidoMinimo: string;
  freteGratisAcima: string;
  aceitaRetirada: boolean;
}

export function FormularioRegras({ pedidoMinimo, freteGratisAcima, aceitaRetirada }: Props) {
  const [resultado, enviar, enviando] = useActionState(salvarRegrasEntrega, null);
  return (
    <Cartao>
      <h2 className="mb-4 text-lg font-bold">Regras</h2>
      <form action={enviar} className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Pedido mínimo (R$)" name="pedidoMinimo" defaultValue={pedidoMinimo} inputMode="decimal" placeholder="Sem mínimo" />
        <Campo rotulo="Frete grátis acima de (R$)" name="freteGratisAcima" defaultValue={freteGratisAcima} inputMode="decimal" placeholder="Não oferecer" />
        <label className="flex items-center gap-2 sm:col-span-2">
          <input type="checkbox" name="aceitaRetirada" defaultChecked={aceitaRetirada} className="size-5 accent-marca-600" />
          Aceitar retirada no local
        </label>
        {resultado && (
          <div className="sm:col-span-2">
            <Aviso tipo={resultado.ok ? "sucesso" : "erro"}>{resultado.mensagem}</Aviso>
          </div>
        )}
        <div className="sm:col-span-2">
          <Botao type="submit" disabled={enviando}>
            Salvar
          </Botao>
        </div>
      </form>
    </Cartao>
  );
}
