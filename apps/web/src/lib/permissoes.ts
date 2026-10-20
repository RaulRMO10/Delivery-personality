import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

/** Permissões de gestão de usuários usadas pelo plugin admin do better-auth. */
export const controleDeAcesso = createAccessControl(defaultStatements);

const semPermissoes = controleDeAcesso.newRole({ user: [], session: [] });

export const papeis = {
  dona: controleDeAcesso.newRole(adminAc.statements),
  suporte: controleDeAcesso.newRole(adminAc.statements),
  cozinha: semPermissoes,
  entregador: semPermissoes,
};
