import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ehPerfil, exige2fa, podeAcessar, type ModuloId, type Perfil } from "@delivery/core";
import { auth } from "./auth";

export interface UsuarioLogado {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  doisFatoresAtivo: boolean;
}

/** Lê a sessão uma vez por requisição. */
export const obterUsuario = cache(async (): Promise<UsuarioLogado | null> => {
  const sessao = await auth.api.getSession({ headers: await headers() });
  if (!sessao) return null;
  const { user } = sessao;
  if (!ehPerfil(user.role) || user.banned) return null;
  return {
    id: user.id,
    nome: user.name,
    email: user.email,
    perfil: user.role,
    doisFatoresAtivo: Boolean(user.twoFactorEnabled),
  };
});

export async function exigirUsuario(): Promise<UsuarioLogado> {
  const usuario = await obterUsuario();
  if (!usuario) redirect("/entrar");
  return usuario;
}

/** Exige sessão, verificação em duas etapas (quando obrigatória) e permissão no módulo. */
export async function exigirModulo(modulo: ModuloId): Promise<UsuarioLogado> {
  const usuario = await exigirUsuario();
  if (exige2fa(usuario.perfil) && !usuario.doisFatoresAtivo) redirect("/painel/seguranca");
  if (!podeAcessar(usuario.perfil, modulo)) redirect("/painel/sem-acesso");
  return usuario;
}
