"use client";

import { useActionState } from "react";
import { NOME_PAGAMENTO, type FormaPagamento } from "@delivery/core";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { Cartao } from "@/components/ui/cartao";
import { Aviso } from "@/components/ui/aviso";
import { Selo } from "@/components/ui/selo";
import { salvarPagamentos } from "./acoes";
import { aoEnviar } from "@/lib/formulario";

interface Props {
  formas: string[];
  chavePix: string;
  nomeRecebedorPix: string;
  cidadePix: string;
  mercadoPago: boolean;
}

const OPCOES: { forma: FormaPagamento; descricao: string }[] = [
  { forma: "pix", descricao: "QR Code com a chave da loja. Confirmação manual." },
  { forma: "pix_online", descricao: "Mercado Pago. Confirmação automática." },
  { forma: "dinheiro", descricao: "Na entrega ou retirada, com troco." },
  { forma: "cartao", descricao: "Maquininha na entrega ou retirada." },
];

export function FormularioPagamentos({ formas, chavePix, nomeRecebedorPix, cidadePix, mercadoPago }: Props) {
  const [resultado, enviar, enviando] = useActionState(salvarPagamentos, null);
  return (
    <form onSubmit={aoEnviar(enviar)} className="flex flex-col gap-6">
      <Cartao className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Formas aceitas</h2>
        {OPCOES.map(({ forma, descricao }) => {
          const indisponivel = forma === "pix_online" && !mercadoPago;
          return (
            <label key={forma} className="flex items-start gap-3 py-1">
              <input type="checkbox" name="formas" value={forma} defaultChecked={formas.includes(forma)} className="mt-1 size-5 accent-marca-600" />
              <span className="flex-1">
                <span className="flex items-center gap-2 font-semibold">
                  {NOME_PAGAMENTO[forma]}
                  {forma === "pix_online" && (
                    <Selo className={mercadoPago ? "bg-status-pronto/10 text-status-pronto" : undefined}>{mercadoPago ? "Conectado" : "Não configurado"}</Selo>
                  )}
                </span>
                <span className="block text-sm text-texto-suave">{indisponivel ? "Requer credenciais do Mercado Pago no servidor." : descricao}</span>
              </span>
            </label>
          );
        })}
      </Cartao>

      <Cartao className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">Chave Pix</h2>
        <Campo rotulo="Chave (CPF, CNPJ, celular, e-mail ou aleatória)" name="chavePix" defaultValue={chavePix} autoComplete="off" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Nome do recebedor" name="nomeRecebedorPix" defaultValue={nomeRecebedorPix} maxLength={25} />
          <Campo rotulo="Cidade" name="cidadePix" defaultValue={cidadePix} maxLength={15} />
        </div>
      </Cartao>

      {resultado && <Aviso tipo={resultado.ok ? "sucesso" : "erro"}>{resultado.mensagem}</Aviso>}
      <Botao type="submit" disabled={enviando} className="self-start">
        Salvar
      </Botao>
    </form>
  );
}
