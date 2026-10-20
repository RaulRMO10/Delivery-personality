# Delivery-personality

Sistema de delivery de doces e salgados: loja online, painel de pedidos, receitas e custos, e integração com o iFood.

Visão completa: [docs/VISAO-GERAL.md](docs/VISAO-GERAL.md).

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `apps/web` | Loja e painel (Next.js 16, Tailwind, better-auth) |
| `packages/core` | Regras de negócio compartilhadas: perfis, permissões, módulos |
| `apps/worker` | Processo sempre ligado da integração com o iFood ([docs/IFOOD.md](docs/IFOOD.md)) |
| `packages/db` | Esquema do banco e migrações (Drizzle + PostgreSQL) |
| `packages/ifood` | Cliente da API do iFood e conversão de pedidos |

## Configuração

Requisitos: Node 22 e pnpm 10.

```bash
pnpm install
cp apps/web/.env.example apps/web/.env       # preencher
cp packages/db/.env.example packages/db/.env # mesma DATABASE_URL
pnpm db:migrate
ADMIN_NOME="Nome" ADMIN_EMAIL="email@exemplo.com" ADMIN_SENHA="senha-forte" pnpm --filter web criar-administradora
pnpm dev
```

O painel fica em `/painel`. No primeiro acesso, a administradora deve ativar a verificação em duas etapas.

## Comandos

| Comando | Ação |
|---|---|
| `pnpm dev` | Servidor de desenvolvimento |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Verificações |
| `pnpm build` | Build de produção |
| `pnpm db:generate` | Gera migração após alterar o esquema |
| `pnpm db:migrate` | Aplica migrações |

## Segurança

- Sem cadastro público: contas são criadas na aba Usuários.
- Verificação em duas etapas obrigatória para Administradora e Suporte.
- Permissões verificadas no servidor em cada página e ação.
- Limite de tentativas em login, verificação e troca de senha.
- Registro de atividades (logins e alterações de usuários).
