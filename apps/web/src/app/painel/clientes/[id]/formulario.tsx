"use client";

import { useActionState } from "react";
import { aoEnviar } from "@/lib/formulario";
import { Botao } from "@/components/ui/botao";
import { AreaTexto, Campo } from "@/components/ui/campo";
import { Cartao } from "@/components/ui/cartao";
import { Aviso } from "@/components/ui/aviso";
import { salvarCliente } from "../acoes";

interface Props {
  cliente: { id: string; nome: string; email: string; dataNascimento: string; aceitaMarketing: boolean; observacoes: string };
}

export function FormularioCliente({ cliente }: Props) {
  const [resultado, enviar, enviando] = useActionState(salvarCliente, null);
  return (
    <Cartao>
      <h2 className="mb-4 text-lg font-bold">Dados</h2>
      <form onSubmit={aoEnviar(enviar)} className="grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="id" value={cliente.id} />
        <Campo rotulo="Nome" name="nome" defaultValue={cliente.nome} required />
        <Campo rotulo="E-mail" name="email" type="email" defaultValue={cliente.email} />
        <Campo rotulo="Aniversário" name="dataNascimento" type="date" defaultValue={cliente.dataNascimento} />
        <label className="flex items-center gap-2 self-end pb-3">
          <input type="checkbox" name="aceitaMarketing" defaultChecked={cliente.aceitaMarketing} className="size-5 accent-marca-600" />
          Aceita receber promoções
        </label>
        <div className="sm:col-span-2">
          <AreaTexto rotulo="Observações" name="observacoes" defaultValue={cliente.observacoes} maxLength={500} className="min-h-20" />
        </div>
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
