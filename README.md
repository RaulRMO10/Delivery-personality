# Delivery-personality

Sistema próprio de delivery de doces e salgados: loja online, painel de operação e gestão, receitas e custos, e integração com o iFood.

- Visão geral: [docs/VISAO-GERAL.md](docs/VISAO-GERAL.md)
- Implantação: [docs/IMPLANTACAO.md](docs/IMPLANTACAO.md)
- Integração iFood: [docs/IFOOD.md](docs/IFOOD.md)

## Funcionalidades

**Loja online** — cardápio com fotos e complementos, carrinho, entrega por bairro ou retirada, pedido agora ou agendado, Pix (QR da loja ou Mercado Pago), dinheiro com troco e cartão, cupons e fidelidade, acompanhamento em tempo real, pedir de novo e avaliação.

**Painel** (perfis Administradora, Cozinha, Entregador e Suporte):

| Área | Abas |
|---|---|
| Operação | Início (resumo do dia e alertas), Pedidos (quadro, alerta sonoro, comanda 80 mm), Agenda (encomendas e produção) |
| Produção | Cardápio (produtos, categorias, complementos, esgotado), Receitas e custos (fichas técnicas, precificação por canal), Estoque (baixa automática e lista de compras) |
| Vendas | Clientes (histórico e LGPD), Marketing (cupons e fidelidade), Avaliações, Relatórios (lucro estimado e CSV) |
| Configurações | Loja, Entrega, Pagamentos, Integrações, Usuários, Anotações, Atividades |

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `apps/web` | Loja e painel (Next.js 16, Tailwind, better-auth) |
| `apps/worker` | Processo sempre ligado da integração com o iFood |
| `packages/core` | Regras de negócio (preços, pedidos, horários, cupons, Pix, receitas), com testes |
| `packages/db` | Esquema do banco e migrações (Drizzle + PostgreSQL) |
| `packages/ifood` | Cliente da API do iFood e conversão de pedidos, com testes |

## Desenvolvimento

Requisitos: Node 22 e pnpm 10.

```bash
pnpm install
cp apps/web/.env.example apps/web/.env       # preencher
cp packages/db/.env.example packages/db/.env # mesma DATABASE_URL
pnpm db:migrate
ADMIN_NOME="Nome" ADMIN_EMAIL="email@exemplo.com" ADMIN_SENHA="senha-forte" pnpm --filter web criar-administradora
pnpm dev
```

| Comando | Ação |
|---|---|
| `pnpm dev` | Servidor de desenvolvimento |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Verificações (também no CI) |
| `pnpm build` | Build de produção |
| `pnpm db:generate` | Gera migração após alterar o esquema |
| `pnpm db:migrate` | Aplica migrações |
| `pnpm --filter worker start` | Worker do iFood |

## Segurança

- Sem cadastro público: contas criadas pela administração; verificação em duas etapas obrigatória para Administradora e Suporte.
- Permissões verificadas no servidor em cada página e ação; preços, descontos e taxas sempre recalculados no servidor.
- Limite de tentativas em login, criação de pedidos e avaliações.
- Webhook de pagamento com assinatura validada e confirmação consultando o provedor.
- Registro de atividades, exclusão de dados de cliente (LGPD) e cabeçalhos de segurança.
