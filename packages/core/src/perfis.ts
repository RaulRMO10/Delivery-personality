export const PERFIS = ["dona", "cozinha", "entregador", "suporte"] as const;

export type Perfil = (typeof PERFIS)[number];

export const NOME_PERFIL: Record<Perfil, string> = {
  dona: "Administradora",
  cozinha: "Cozinha",
  entregador: "Entregador",
  suporte: "Suporte técnico",
};

/** Perfis com acesso administrativo (gestão de usuários). */
export const PERFIS_ADMIN = ["dona", "suporte"] as const satisfies readonly Perfil[];

/** Perfis que precisam de verificação em duas etapas ativa para usar o painel. */
export const PERFIS_COM_2FA_OBRIGATORIO = ["dona", "suporte"] as const satisfies readonly Perfil[];

export function ehPerfil(valor: unknown): valor is Perfil {
  return typeof valor === "string" && (PERFIS as readonly string[]).includes(valor);
}

export function ehAdmin(perfil: Perfil): boolean {
  return (PERFIS_ADMIN as readonly Perfil[]).includes(perfil);
}

export function exige2fa(perfil: Perfil): boolean {
  return (PERFIS_COM_2FA_OBRIGATORIO as readonly Perfil[]).includes(perfil);
}
