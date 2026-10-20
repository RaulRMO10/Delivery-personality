"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Botao } from "@/components/ui/botao";
import { BotaoEditar } from "@/components/ui/botao-editar";
import { Dialogo } from "@/components/ui/dialogo";
import { Aviso } from "@/components/ui/aviso";
import type { Resultado } from "./acoes";

interface Props {
  titulo: string;
  /** Quando informado, exibe o botão de edição com este rótulo acessível. */
  rotuloEditar?: string;
  acao: (anterior: Resultado, dados: FormData) => Promise<Resultado>;
  children: ReactNode;
}

/** Botão + janela com formulário enviado a uma ação do servidor. */
export function FormularioSimples({ titulo, rotuloEditar, acao, children }: Props) {
  const [aberto, setAberto] = useState(false);
  const [resultado, enviar, enviando] = useActionState<Resultado, FormData>(async (anterior, dados) => {
    const novo = await acao(anterior, dados);
    if (novo?.ok) setAberto(false);
    return novo;
  }, null);

  return (
    <>
      {rotuloEditar ? (
        <BotaoEditar rotulo={rotuloEditar} onClick={() => setAberto(true)} />
      ) : (
        <Botao onClick={() => setAberto(true)}>
          <Plus className="size-5" aria-hidden />
          {titulo}
        </Botao>
      )}
      {aberto && (
        <Dialogo titulo={titulo} aoFechar={() => setAberto(false)}>
          <form action={enviar} className="flex flex-col gap-4">
            {children}
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
