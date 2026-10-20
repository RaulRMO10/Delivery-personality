"use client";

import { useActionState } from "react";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { Cartao } from "@/components/ui/cartao";
import { Aviso } from "@/components/ui/aviso";
import { salvarDadosLoja } from "./acoes";
import { aoEnviar } from "@/lib/formulario";

interface Valores {
  nome: string;
  telefone: string;
  endereco: string;
  documento: string;
  aviso: string;
  tempoPreparoMin: string;
}

export function FormularioDados({ valores }: { valores: Valores }) {
  const [resultado, enviar, enviando] = useActionState(salvarDadosLoja, null);
  return (
    <Cartao>
      <h2 className="mb-4 text-lg font-bold">Dados</h2>
      <form onSubmit={aoEnviar(enviar)} className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome da loja" name="nome" defaultValue={valores.nome} maxLength={60} autoComplete="off" />
        <Campo rotulo="WhatsApp" name="telefone" defaultValue={valores.telefone} inputMode="tel" placeholder="(11) 99999-9999" />
        <div className="sm:col-span-2">
          <Campo rotulo="Endereço" name="endereco" defaultValue={valores.endereco} maxLength={200} autoComplete="off" />
        </div>
        <Campo rotulo="CNPJ ou CPF" name="documento" defaultValue={valores.documento} maxLength={20} />
        <Campo rotulo="Tempo de preparo (min)" name="tempoPreparoMin" defaultValue={valores.tempoPreparoMin} inputMode="numeric" required />
        <div className="sm:col-span-2">
          <Campo rotulo="Aviso no site (opcional)" name="aviso" defaultValue={valores.aviso} maxLength={200} placeholder="Ex.: Encomendas com 48 h de antecedência" />
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
