"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { UNIDADES_ENTRADA, formatarNumero, type Insumo, type TipoInsumo } from "@delivery/core";
import { Botao } from "@/components/ui/botao";
import { BotaoEditar } from "@/components/ui/botao-editar";
import { Campo, Selecao } from "@/components/ui/campo";
import { Dialogo } from "@/components/ui/dialogo";
import { Aviso } from "@/components/ui/aviso";
import { salvarInsumo, type Resultado } from "./acoes";
import { aoEnviar } from "@/lib/formulario";

interface Props {
  tipo: TipoInsumo;
  titulo: string;
  insumo?: Insumo & { nome: string; fornecedor: string | null };
}

export function FormularioInsumo({ tipo, titulo, insumo }: Props) {
  const [aberto, setAberto] = useState(false);
  const [resultado, enviar, enviando] = useActionState<Resultado, FormData>(async (anterior, dados) => {
    const novo = await salvarInsumo(anterior, dados);
    if (novo?.ok) setAberto(false);
    return novo;
  }, null);

  const unidadePadrao = insumo?.unidade ?? (tipo === "embalagem" ? "un" : "g");

  return (
    <>
      {insumo ? (
        <BotaoEditar rotulo={`Editar ${insumo.nome}`} onClick={() => setAberto(true)} />
      ) : (
        <Botao onClick={() => setAberto(true)}>
          <Plus className="size-5" aria-hidden />
          {titulo}
        </Botao>
      )}
      {aberto && (
        <Dialogo titulo={titulo} aoFechar={() => setAberto(false)}>
          <form onSubmit={aoEnviar(enviar)} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={insumo?.id ?? ""} />
            <input type="hidden" name="tipo" value={tipo} />
            <Campo rotulo="Nome" name="nome" defaultValue={insumo?.nome} autoComplete="off" required />
            <div className="grid grid-cols-[1fr_7rem] gap-3">
              <Campo
                rotulo="Quantidade na embalagem"
                name="quantidade"
                inputMode="decimal"
                defaultValue={insumo ? formatarNumero(insumo.quantidadeEmbalagem).replace(/\./g, "") : undefined}
                required
              />
              <Selecao rotulo="Unidade" name="unidadeEntrada" defaultValue={unidadePadrao}>
                {Object.keys(UNIDADES_ENTRADA).map((u) => (
                  <option key={u} value={u}>
                    {u === "l" ? "L" : u}
                  </option>
                ))}
              </Selecao>
            </div>
            <Campo
              rotulo="Preço da embalagem (R$)"
              name="preco"
              inputMode="decimal"
              defaultValue={insumo ? (insumo.precoEmbalagem / 100).toFixed(2).replace(".", ",") : undefined}
              required
            />
            <Campo rotulo="Fornecedor (opcional)" name="fornecedor" defaultValue={insumo?.fornecedor ?? ""} autoComplete="off" />
            {resultado && !resultado.ok && <Aviso tipo="erro">{resultado.mensagem}</Aviso>}
            <Botao type="submit" disabled={enviando}>
              Salvar
            </Botao>
          </form>
        </Dialogo>
      )}
    </>
  );
}
