import "server-only";
import { criarAuth } from "./auth-config";

export const auth = criarAuth();

export type Sessao = typeof auth.$Infer.Session;
