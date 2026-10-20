import { createAuthClient } from "better-auth/react";
import { adminClient, twoFactorClient } from "better-auth/client/plugins";
import { controleDeAcesso, papeis } from "./permissoes";

export const authClient = createAuthClient({
  plugins: [
    adminClient({ ac: controleDeAcesso, roles: papeis }),
    // O redirecionamento para a verificação é feito no formulário de login.
    twoFactorClient(),
  ],
});
