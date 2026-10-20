"use client";

import { useState } from "react";
import { formatarNumero, type Unidade } from "@delivery/core";
import { Campo, Selecao } from "@/components/ui/campo";

const OPCOES: Record<Unidade, { valor: string; rotulo: string }[]> = {
  g: [
    { valor: "kg", rotulo: "kg" },
    { valor: "g", rotulo: "g" },
  ],
  ml: [
    { valor: "l", rotulo: "L" },
    { valor: "ml", rotulo: "ml" },
  ],
  un: [{ valor: "un", rotulo: "un" }],
};

function SeletorUnidade({ unidade }: { unidade: Unidade }) {
  return (
    <Selecao rotulo="Unidade" name="unidade" defaultValue={OPCOES[unidade][0]!.valor}>
      {OPCOES[unidade].map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.rotulo}
        </option>
      ))}
    </Selecao>
  );
}

export function CamposMovimento({ insumoId, unidade }: { insumoId: string; unidade: Unidade }) {
  const [tipo, setTipo] = useState("entrada");
  return (
    <>
      <input type="hidden" name="insumoId" value={insumoId} />
      <Selecao rotulo="Tipo" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
        <option value="entrada">Entrada (compra)</option>
        <option value="perda">Perda</option>
        <option value="ajuste">Ajuste de contagem</option>
      </Selecao>
      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <Campo rotulo={tipo === "ajuste" ? "Saldo contado" : "Quantidade"} name="quantidade" inputMode="decimal" required />
        <SeletorUnidade unidade={unidade} />
      </div>
      <Campo rotulo="Observação (opcional)" name="observacao" maxLength={200} />
    </>
  );
}

export function CamposConfiguracao({ insumoId, unidade, controlar, minimo }: { insumoId: string; unidade: Unidade; controlar: boolean; minimo: number }) {
  const unidadePadrao = OPCOES[unidade][0]!.valor;
  const minimoExibido = unidade === "un" ? minimo : minimo / 1000;
  return (
    <>
      <input type="hidden" name="insumoId" value={insumoId} />
      <label className="flex items-center gap-2">
        <input type="checkbox" name="controlarEstoque" defaultChecked={controlar} className="size-5 accent-marca-600" />
        Controlar estoque
      </label>
      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <Campo rotulo="Estoque mínimo" name="minimo" defaultValue={minimo ? formatarNumero(minimoExibido, 3).replace(/\./g, "") : ""} inputMode="decimal" />
        <Selecao rotulo="Unidade" name="unidade" defaultValue={unidadePadrao}>
          {OPCOES[unidade].map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </Selecao>
      </div>
    </>
  );
}
