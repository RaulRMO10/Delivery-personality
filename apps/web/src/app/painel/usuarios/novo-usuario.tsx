"use client";

import { useActionState, useState } from "react";
import { Plus, X } from "lucide-react";
import { NOME_PERFIL, PERFIS } from "@delivery/core";
import { Botao } from "@/components/ui/botao";
import { Campo, Selecao } from "@/components/ui/campo";
import { Aviso } from "@/components/ui/aviso";
import { criarUsuario, type ResultadoAcao } from "./acoes";

export function NovoUsuario() {
  const [aberto, setAberto] = useState(false);
  const [resultado, enviar, enviando] = useActionState<ResultadoAcao, FormData>(async (anterior, dados) => {
    const novo = await criarUsuario(anterior, dados);
    if (novo?.ok) setAberto(false);
    return novo;
  }, null);

  return (
    <>
      <Botao onClick={() => setAberto(true)}>
        <Plus className="size-5" aria-hidden />
        Novo
      </Botao>
      {aberto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="titulo-novo-usuario">
          <div className="w-full max-w-md rounded-t-2xl bg-superficie p-5 sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="titulo-novo-usuario" className="text-lg font-bold">
                Novo usuário
              </h2>
              <button type="button" onClick={() => setAberto(false)} className="flex size-11 items-center justify-center rounded-xl hover:bg-fundo" aria-label="Fechar">
                <X className="size-5" />
              </button>
            </div>
            <form action={enviar} className="flex flex-col gap-4">
              <Campo rotulo="Nome" name="nome" autoComplete="off" required />
              <Campo rotulo="E-mail" name="email" type="email" autoComplete="off" required />
              <Selecao rotulo="Perfil" name="perfil" defaultValue="cozinha">
                {PERFIS.map((perfil) => (
                  <option key={perfil} value={perfil}>
                    {NOME_PERFIL[perfil]}
                  </option>
                ))}
              </Selecao>
              <Campo rotulo="Senha provisória" name="senha" type="password" autoComplete="new-password" minLength={10} required />
              {resultado && !resultado.ok && <Aviso tipo="erro">{resultado.mensagem}</Aviso>}
              <Botao type="submit" disabled={enviando}>
                Criar
              </Botao>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
