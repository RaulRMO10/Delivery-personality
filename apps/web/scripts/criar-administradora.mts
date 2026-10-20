/**
 * Cria a primeira conta de administradora.
 * Uso: ADMIN_NOME="Maria" ADMIN_EMAIL="maria@exemplo.com" ADMIN_SENHA="..." pnpm criar-administradora
 */
import { criarAuth } from "../src/lib/auth-config";

const nome = process.env.ADMIN_NOME;
const email = process.env.ADMIN_EMAIL?.toLowerCase();
const senha = process.env.ADMIN_SENHA;

if (!nome || !email || !senha) {
  console.error("Defina ADMIN_NOME, ADMIN_EMAIL e ADMIN_SENHA.");
  process.exit(1);
}

try {
  // Chamada no servidor, sem sessão: permitida pelo plugin admin para provisionamento.
  await criarAuth().api.createUser({ body: { name: nome, email, password: senha, role: "dona" } });
  console.log(`Administradora criada: ${email}. No primeiro acesso, ative a verificação em duas etapas.`);
  process.exit(0);
} catch (erro) {
  console.error("Não foi possível criar a administradora:", erro instanceof Error ? erro.message : erro);
  process.exit(1);
}
