import type { Metadata } from "next";
import { asc, db, schema } from "@delivery/db";
import { ehPerfil } from "@delivery/core";
import { exigirModulo } from "@/lib/sessao";
import { TituloPagina } from "@/components/titulo-pagina";
import { NovoUsuario } from "./novo-usuario";
import { LinhaUsuario } from "./linha-usuario";

export const metadata: Metadata = { title: "Usuários" };

export default async function PaginaUsuarios() {
  const atual = await exigirModulo("usuarios");
  const usuarios = await db
    .select({
      id: schema.user.id,
      nome: schema.user.name,
      email: schema.user.email,
      perfil: schema.user.role,
      bloqueado: schema.user.banned,
      doisFatores: schema.user.twoFactorEnabled,
    })
    .from(schema.user)
    .orderBy(asc(schema.user.name));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <TituloPagina titulo="Usuários" acoes={<NovoUsuario />} />
      <ul className="flex flex-col gap-3">
        {usuarios.map((u) => (
          <LinhaUsuario
            key={u.id}
            usuario={{
              id: u.id,
              nome: u.nome,
              email: u.email,
              perfil: ehPerfil(u.perfil) ? u.perfil : "cozinha",
              bloqueado: Boolean(u.bloqueado),
              doisFatores: Boolean(u.doisFatores),
            }}
            ehVoce={u.id === atual.id}
          />
        ))}
      </ul>
    </div>
  );
}
