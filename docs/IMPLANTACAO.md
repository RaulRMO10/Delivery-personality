# Implantação

Três partes: **banco** (Supabase), **site e painel** (Vercel) e **worker do iFood** (Railway, Fly.io ou Render). O worker só é necessário com a integração do iFood.

## 1. Banco (Supabase)

1. Crie o projeto (região São Paulo). Data API pode ficar desativada; o sistema conecta direto no Postgres.
2. Em **Connect > Session pooler**, copie a string de conexão (`postgresql://postgres.<projeto>:<senha>@aws-…pooler.supabase.com:5432/postgres`).
3. Aplique as tabelas: `DATABASE_URL="<string>" pnpm db:migrate`.
4. Crie a administradora:
   `DATABASE_URL="<string>" BETTER_AUTH_SECRET="<segredo>" ADMIN_NOME="…" ADMIN_EMAIL="…" ADMIN_SENHA="…" pnpm --filter web criar-administradora`

## 2. Site e painel (Vercel)

1. Importe o repositório; **Root Directory**: `apps/web`.
2. Variáveis de ambiente:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | String do Session pooler |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` (o mesmo usado no passo 1.4) |
| `BETTER_AUTH_URL` | Endereço público, ex.: `https://www.minhaloja.com.br` |
| `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` | Opcional: Pix online pelo Mercado Pago |

3. No Mercado Pago (se usado), cadastre o webhook `https://<endereço>/api/webhooks/mercadopago` para o evento **Pagamentos** e copie a assinatura secreta para `MP_WEBHOOK_SECRET`.

## 3. Worker do iFood

1. Crie um serviço com o repositório, comando `pnpm install && pnpm --filter worker start`.
2. Variáveis de `apps/worker/.env.example`.
3. Detalhes e checklist de homologação em [IFOOD.md](IFOOD.md).

## Primeiro acesso

1. Entre em `/entrar`, ative a verificação em duas etapas.
2. **Loja**: nome, WhatsApp, horários. **Entrega**: bairros e taxas. **Pagamentos**: formas e chave Pix.
3. **Receitas e custos**: ingredientes, embalagens, receitas, custos fixos, canais.
4. **Cardápio**: categorias, complementos e produtos.
5. **Usuários**: contas da cozinha e de entregadores.
