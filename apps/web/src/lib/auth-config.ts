import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, twoFactor } from "better-auth/plugins";
import { LOJA } from "@delivery/core";
import { db, schema } from "@delivery/db";
import { controleDeAcesso, papeis } from "./permissoes";
import { registrarAtividade } from "./atividades";

/** Configuração única da autenticação, usada pelo app e pelos scripts. */
export function criarAuth() {
  return betterAuth({
    appName: LOJA.nome,
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: {
      enabled: true,
      // Contas são criadas apenas pela administração, na aba Usuários.
      disableSignUp: true,
      minPasswordLength: 10,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/two-factor/*": { window: 60, max: 5 },
        "/change-password": { window: 60, max: 5 },
      },
    },
    databaseHooks: {
      session: {
        create: {
          after: async (sessao) => {
            await registrarAtividade({
              usuarioId: sessao.userId,
              acao: "login",
              entidade: "sessao",
              ip: sessao.ipAddress ?? null,
            });
          },
        },
      },
    },
    plugins: [
      admin({
        ac: controleDeAcesso,
        roles: papeis,
        adminRoles: ["dona", "suporte"],
        defaultRole: "cozinha",
      }),
      twoFactor({ issuer: LOJA.nome }),
      nextCookies(),
    ],
  });
}
