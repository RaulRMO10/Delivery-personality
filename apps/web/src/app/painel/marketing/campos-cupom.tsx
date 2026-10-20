"use client";

import { useState } from "react";
import type { TipoCupom } from "@delivery/core";
import { Campo, Selecao } from "@/components/ui/campo";

interface ValoresCupom {
  id: string;
  codigo: string;
  tipo: TipoCupom;
  valor: string;
  pedidoMinimo: string;
  validoDe: string;
  validoAte: string;
  limiteTotal: string;
  limitePorCliente: string;
  somentePrimeiraCompra: boolean;
}

export function CamposCupom({ cupom }: { cupom?: ValoresCupom }) {
  const [tipo, setTipo] = useState<TipoCupom>(cupom?.tipo ?? "percentual");
  return (
    <>
      <input type="hidden" name="id" value={cupom?.id ?? ""} />
      <Campo rotulo="Código" name="codigo" defaultValue={cupom?.codigo} placeholder="Ex.: BEMVINDO" maxLength={20} className="uppercase" autoComplete="off" required />
      <div className="grid grid-cols-2 gap-3">
        <Selecao rotulo="Tipo" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoCupom)}>
          <option value="percentual">Percentual</option>
          <option value="valor">Valor fixo</option>
          <option value="frete">Frete grátis</option>
        </Selecao>
        {tipo !== "frete" ? (
          <Campo rotulo={tipo === "percentual" ? "Desconto (%)" : "Desconto (R$)"} name="valor" defaultValue={cupom?.valor} inputMode="decimal" required />
        ) : (
          <input type="hidden" name="valor" value="0" />
        )}
      </div>
      <Campo rotulo="Pedido mínimo (R$)" name="pedidoMinimo" defaultValue={cupom?.pedidoMinimo} inputMode="decimal" placeholder="Sem mínimo" />
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Válido de" name="validoDe" type="date" defaultValue={cupom?.validoDe} />
        <Campo rotulo="Válido até" name="validoAte" type="date" defaultValue={cupom?.validoAte} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Limite total de usos" name="limiteTotal" defaultValue={cupom?.limiteTotal} inputMode="numeric" placeholder="Sem limite" />
        <Campo rotulo="Usos por cliente" name="limitePorCliente" defaultValue={cupom?.limitePorCliente} inputMode="numeric" placeholder="Sem limite" />
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="somentePrimeiraCompra" defaultChecked={cupom?.somentePrimeiraCompra} className="size-5 accent-marca-600" />
        Somente na primeira compra
      </label>
    </>
  );
}
