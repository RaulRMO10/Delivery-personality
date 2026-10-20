"use client";

import { useActionState, useState, useTransition } from "react";
import { NOME_PERFIL, PERFIS, type Perfil } from "@delivery/core";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { Cartao } from "@/components/ui/cartao";
import { Aviso } from "@/components/ui/aviso";
import { Selo } from "@/components/ui/selo";
import { alterarBloqueio, alterarPerfil, redefinirSenha } from "./acoes";
import { aoEnviar } from "@/lib/formulario";

export interface UsuarioLista {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  bloqueado: boolean;
  doisFatores: boolean;
}

export function LinhaUsuario({ usuario, ehVoce }: { usuario: UsuarioLista; ehVoce: boolean }) {
  const [pendente, iniciar] = useTransition();
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [resultadoSenha, enviarSenha, enviandoSenha] = useActionState(redefinirSenha, null);

  function bloquear() {
    if (!usuario.bloqueado && !confirm(`Bloquear ${usuario.nome}? O acesso será encerrado.`)) return;
    iniciar(() => alterarBloqueio(usuario.id, !usuario.bloqueado));
  }

  return (
    <li>
      <Cartao className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold">
              {usuario.nome} {ehVoce && <span className="font-normal text-texto-suave">(você)</span>}
            </p>
            <p className="truncate text-sm text-texto-suave">{usuario.email}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Selo>{NOME_PERFIL[usuario.perfil]}</Selo>
            {usuario.doisFatores && <Selo className="bg-status-pronto/10 text-status-pronto">2 etapas</Selo>}
            {usuario.bloqueado && <Selo className="bg-status-cancelado/10 text-status-cancelado">Bloqueado</Selo>}
          </div>
        </div>

        {!ehVoce && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Perfil"
              defaultValue={usuario.perfil}
              disabled={pendente}
              onChange={(e) => iniciar(() => alterarPerfil(usuario.id, e.target.value as Perfil))}
              className="min-h-11 rounded-xl border border-borda bg-superficie px-3"
            >
              {PERFIS.map((perfil) => (
                <option key={perfil} value={perfil}>
                  {NOME_PERFIL[perfil]}
                </option>
              ))}
            </select>
            <Botao variante="secundario" className="min-h-11" onClick={() => setMostrarSenha(!mostrarSenha)}>
              Redefinir senha
            </Botao>
            <Botao variante={usuario.bloqueado ? "secundario" : "fantasma"} className="min-h-11" disabled={pendente} onClick={bloquear}>
              {usuario.bloqueado ? "Desbloquear" : "Bloquear"}
            </Botao>
          </div>
        )}

        {mostrarSenha && (
          <form onSubmit={aoEnviar(enviarSenha)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <input type="hidden" name="usuarioId" value={usuario.id} />
            <div className="flex-1">
              <Campo rotulo="Nova senha provisória" name="senha" type="password" autoComplete="new-password" minLength={10} required />
            </div>
            <Botao type="submit" disabled={enviandoSenha}>
              Salvar
            </Botao>
          </form>
        )}
        {resultadoSenha && <Aviso tipo={resultadoSenha.ok ? "sucesso" : "erro"}>{resultadoSenha.mensagem}</Aviso>}
      </Cartao>
    </li>
  );
}
