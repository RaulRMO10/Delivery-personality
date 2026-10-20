"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { APIError } from "better-auth/api";
import { z } from "zod";
import { PERFIS, type Perfil } from "@delivery/core";
import { auth } from "@/lib/auth";
import { registrarAtividade } from "@/lib/atividades";
import { exigirModulo } from "@/lib/sessao";

export type ResultadoAcao = { ok: true; mensagem: string } | { ok: false; mensagem: string } | null;

const senha = z.string().min(10, "A senha deve ter ao menos 10 caracteres.").max(128);

const esquemaNovoUsuario = z.object({
  nome: z.string().trim().min(2, "Informe o nome.").max(100),
  email: z.email("E-mail inválido.").trim().toLowerCase(),
  perfil: z.enum(PERFIS, "Perfil inválido."),
  senha,
});

function primeiroErro(erro: z.ZodError) {
  return erro.issues[0]?.message ?? "Dados inválidos.";
}

function mensagemDeErro(erro: unknown, padrao: string) {
  if (erro instanceof APIError && erro.body?.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
    return "Já existe um usuário com este e-mail.";
  }
  console.error(erro);
  return padrao;
}

async function exigirOutroUsuario(usuarioId: string) {
  const usuario = await exigirModulo("usuarios");
  if (usuario.id === usuarioId) throw new Error("Não é possível alterar o próprio usuário por aqui.");
  return usuario;
}

export async function criarUsuario(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const usuario = await exigirModulo("usuarios");
  const validacao = esquemaNovoUsuario.safeParse(Object.fromEntries(dados));
  if (!validacao.success) return { ok: false, mensagem: primeiroErro(validacao.error) };
  const { nome, email, perfil, senha } = validacao.data;

  try {
    const { user } = await auth.api.createUser({
      body: { name: nome, email, password: senha, role: perfil },
      headers: await headers(),
    });
    await registrarAtividade({
      usuarioId: usuario.id,
      acao: "usuario.criado",
      entidade: "usuario",
      entidadeId: user.id,
      detalhes: { email, perfil },
    });
  } catch (erro) {
    return { ok: false, mensagem: mensagemDeErro(erro, "Não foi possível criar o usuário.") };
  }

  revalidatePath("/painel/usuarios");
  return { ok: true, mensagem: "Usuário criado." };
}

export async function alterarPerfil(usuarioId: string, perfil: Perfil) {
  const usuario = await exigirOutroUsuario(usuarioId);
  z.enum(PERFIS).parse(perfil);
  await auth.api.setRole({ body: { userId: usuarioId, role: perfil }, headers: await headers() });
  await registrarAtividade({
    usuarioId: usuario.id,
    acao: "usuario.perfil_alterado",
    entidade: "usuario",
    entidadeId: usuarioId,
    detalhes: { perfil },
  });
  revalidatePath("/painel/usuarios");
}

export async function alterarBloqueio(usuarioId: string, bloquear: boolean) {
  const usuario = await exigirOutroUsuario(usuarioId);
  const cabecalhos = await headers();
  if (bloquear) {
    await auth.api.banUser({ body: { userId: usuarioId }, headers: cabecalhos });
  } else {
    await auth.api.unbanUser({ body: { userId: usuarioId }, headers: cabecalhos });
  }
  await registrarAtividade({
    usuarioId: usuario.id,
    acao: bloquear ? "usuario.bloqueado" : "usuario.desbloqueado",
    entidade: "usuario",
    entidadeId: usuarioId,
  });
  revalidatePath("/painel/usuarios");
}

export async function redefinirSenha(_anterior: ResultadoAcao, dados: FormData): Promise<ResultadoAcao> {
  const usuarioId = String(dados.get("usuarioId"));
  const usuario = await exigirOutroUsuario(usuarioId);
  const validacao = senha.safeParse(dados.get("senha"));
  if (!validacao.success) return { ok: false, mensagem: primeiroErro(validacao.error) };

  const cabecalhos = await headers();
  await auth.api.setUserPassword({ body: { userId: usuarioId, newPassword: validacao.data }, headers: cabecalhos });
  await auth.api.revokeUserSessions({ body: { userId: usuarioId }, headers: cabecalhos });
  await registrarAtividade({
    usuarioId: usuario.id,
    acao: "usuario.senha_redefinida",
    entidade: "usuario",
    entidadeId: usuarioId,
  });
  return { ok: true, mensagem: "Senha redefinida." };
}
