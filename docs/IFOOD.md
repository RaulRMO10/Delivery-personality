# Integração com o iFood

Pedidos do iFood entram no mesmo painel dos pedidos próprios, com o selo **iFood**. As mudanças de etapa feitas no painel são enviadas ao iFood automaticamente.

## Como funciona

```
iFood ──(polling 30 s)──► worker ──► banco ◄── painel (site)
  ▲                         │                    │
  └──── ações do pedido ◄───┴── fila de envios ◄─┘
```

- **`apps/worker`**: processo sempre ligado, separado do site. Busca eventos a cada 30 s, grava cada evento, **confirma o recebimento (acknowledgment) só depois de gravar** e então processa.
- **`packages/ifood`**: cliente da API (token renovado antes de expirar) e conversão do pedido do iFood para o formato interno, com testes.
- **Fila de envios** (`comandos_integracao`): ao aceitar, iniciar preparo, marcar pronto, despachar ou cancelar um pedido do iFood no painel, o comando entra na fila. O worker envia com novas tentativas e espera crescente; após 8 falhas ou erro definitivo, o envio aparece em **Integrações** com o botão "Tentar de novo".

## Configuração

1. No [portal do desenvolvedor](https://developer.ifood.com.br), crie o aplicativo e obtenha `clientId`, `clientSecret` e o `merchantId` da loja.
2. Hospede o worker em um serviço que mantenha processos ligados (Railway, Fly.io, Render etc.) com as variáveis de `apps/worker/.env.example`.
3. Comando: `pnpm --filter worker start`.
4. Em **Painel > Integrações**, o status deve mudar para **Conectado** em até 1 minuto.

## Mapeamento

| iFood | Sistema |
|---|---|
| Evento `PLC` | Pedido criado em "Recebido" |
| Evento `CAN` | Pedido cancelado (motivo: "Cancelado pelo iFood") |
| Evento `DSP` | "Saiu para entrega" (quando a entrega é do iFood) |
| Evento `CON` | "Entregue" |
| Painel: Aceitar | `POST /orders/{id}/confirm` |
| Painel: Iniciar preparo | `POST /orders/{id}/startPreparation` |
| Painel: Marcar pronto | `POST /orders/{id}/readyToPickup` |
| Painel: Saiu para entrega | `POST /orders/{id}/dispatch` (só entrega própria) |
| Painel: Cancelar | `POST /orders/{id}/requestCancellation` |

Pagamento: pago online → "pago"; na entrega → dinheiro (com troco), cartão ou Pix, "pendente". O telefone do cliente vem mascarado; o localizador fica na observação do pedido.

## Antes da homologação: conferir na documentação oficial

A integração segue a Merchant API v1.0 conforme a documentação conhecida. Antes de homologar, confirmar no portal:

- [ ] Endereços e formato de autenticação, polling, acknowledgment e ações do pedido.
- [ ] Nomes dos campos do pedido (`total`, `payments`, `delivery`, `items[].options`) e códigos de evento.
- [ ] Lista de códigos de cancelamento (`/cancellationReasons`) e ajustar `IFOOD_CODIGO_CANCELAMENTO`.
- [ ] Fluxo de pedido de cancelamento feito pelo cliente (eventos de negociação), se exigido.
- [ ] Sincronização de pausa/horários da loja (interruptions) e do cardápio (catálogo), se exigidas.

## Checklist de homologação coberto

- [x] Polling a cada 30 s em processo independente do navegador.
- [x] Acknowledgment de todos os eventos recebidos, após gravação.
- [x] Eventos repetidos não duplicam pedidos (id único por evento e por pedido).
- [x] Token renovado antes de expirar; 401 força nova autenticação.
- [x] Confirmação, preparo, pronto, despacho e cancelamento enviados ao iFood.
- [x] Novas tentativas com espera crescente em falhas temporárias (rede, 429, 5xx).
- [x] Registro de eventos e erros visível no painel.
- [x] Pedidos agendados, retirada e entrega (própria ou iFood) tratados.
