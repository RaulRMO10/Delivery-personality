# Visão geral do sistema

Documento de referência do sistema de delivery de doces e salgados. Descreve **o que** o sistema terá; a ordem de construção é definida módulo a módulo.

---

## 1. A ideia

Um sistema próprio, 100% pelo navegador, onde a loja:

- **vende direto** ao cliente (site próprio + WhatsApp), sem comissão;
- **recebe também os pedidos do iFood** (e da 99Food, se houver API) no mesmo painel;
- **controla receitas, custos e preços**, sabendo a margem real de cada produto em cada canal;
- **fideliza o cliente** com cupons, pontos e encomendas para festas.

### Princípios

1. **Simples para quem opera.** Botões grandes, poucas telas, linguagem do dia a dia. Se a dona da loja precisar de ajuda para usar, a tela está errada.
2. **Celular primeiro.** Tudo funciona bem no celular e no tablet; o computador é bônus.
3. **Um lugar só.** Todo pedido, de qualquer canal, aparece no mesmo painel.
4. **Nunca perder pedido.** A integração com o iFood roda num servidor sempre ligado, independente do tablet.
5. **Pronto para homologação.** Código testado, registros de tudo, regras do iFood respeitadas desde o início.
6. **Seguro por padrão.** Preço, cupom e pagamento sempre conferidos no servidor; dados do cliente protegidos (LGPD).

---

## 2. Quem usa o sistema

| Perfil | Quem é | O que pode fazer |
|---|---|---|
| **Cliente** | Quem compra | Ver cardápio, pedir, pagar, acompanhar, ver histórico e pontos |
| **Dona** (administradora) | A responsável pela loja | Tudo: operação, cardápio, preços, relatórios, usuários, integrações |
| **Cozinha** (operador) | Ajudante | Só o painel de pedidos e a agenda; marcar esgotado. Não vê financeiro nem altera preços |
| **Entregador** (opcional) | Motoboy próprio | Ver os pedidos prontos para entrega com endereço e marcar como entregue |
| **Suporte técnico** | Quem desenvolve | Configurações técnicas, registros de erro e integrações |

---

## 3. Mapa do sistema

```
┌─────────────────────────────┐   ┌──────────────────────────────────────┐
│  LOJA ONLINE (pública)      │   │  PAINEL (com login)                  │
│  seudominio.com.br          │   │  seudominio.com.br/painel            │
│  - cardápio, carrinho       │   │  - operação: pedidos, agenda         │
│  - checkout, Pix            │   │  - gestão: cardápio, receitas,       │
│  - acompanhar pedido        │   │    marketing, relatórios, config     │
│  - minha conta              │   │                                      │
└──────────────┬──────────────┘   └───────────────────┬──────────────────┘
               │                                      │
               └──────────────► BANCO DE DADOS ◄──────┘
                                (Supabase/Postgres)
                                       ▲
               ┌───────────────────────┼────────────────────────┐
     Worker de integrações      Webhooks de pagamento     Tarefas agendadas
     (iFood a cada 30s)         (Pix confirmado)          (abrir/fechar loja,
                                                           lembretes, backup)
```

---

## 4. Loja online (cliente)

### Telas

| Tela | O que tem |
|---|---|
| **Início / Cardápio** | Banner da loja (aberta, fechada ou em pausa), tempo estimado, categorias fixas no topo, destaques, busca, cards de produto com foto, preço e selo "Esgotado" |
| **Produto** | Foto grande, descrição, complementos com regras ("escolha 3 sabores": mínimo e máximo), observação, quantidade, botão "Adicionar • R$ X" |
| **Carrinho** | Itens editáveis, cupom, subtotal, aviso de pedido mínimo, sugestões ("leve também") |
| **Checkout** (uma página) | Identificação por telefone e nome; entrega ou retirada; endereço com bairro (calcula taxa e tempo); agora ou agendado (data e hora); pagamento: Pix online, dinheiro (com troco) ou cartão na entrega; resumo e confirmar |
| **Pagamento Pix** | QR Code e "copia e cola", contador de validade; ao pagar, vai sozinho para o acompanhamento |
| **Acompanhar pedido** | Linha do tempo (recebido → confirmado → em preparo → saiu → entregue), previsão, botão de WhatsApp da loja; atualiza em tempo real |
| **Minha conta** | Pedidos anteriores com "Pedir de novo", endereços salvos, cartela de fidelidade, cupons disponíveis |
| **Encomendas** | Página dedicada a festas: kits, centos, antecedência mínima, calendário com dias disponíveis |
| **Loja fechada** | Horários e "encomendar para outro dia" |
| **Páginas legais** | Política de privacidade, termos de uso (LGPD) |

### Comportamentos importantes

- Barra fixa no rodapé com "Ver carrinho • 3 itens • R$ 45,00".
- O carrinho fica salvo no aparelho se o cliente sair e voltar.
- O link de acompanhamento pode ser enviado pelo WhatsApp.
- Produto esgotado aparece, mas não pode ser adicionado (o cliente sabe que existe).

---

## 5. Painel (operação e gestão)

### Navegação

- **Tablet e computador:** menu lateral com ícone e nome.
- **Celular:** barra inferior com **Pedidos · Agenda · Cardápio · Início · Mais** e o restante dentro de "Mais".
- Topo fixo com: status da loja (botão **Aberta / Pausar / Fechar**), indicador de conexão do iFood (verde/vermelho) e sino de notificações.

### Abas do menu

#### Operação

**1. Início (resumo do dia)**
- Pedidos de hoje, faturamento, ticket médio, por canal.
- Pedidos atrasados em destaque.
- Encomendas de hoje e de amanhã.
- Alertas: produto abaixo do custo, iFood desconectado, ingrediente com preço desatualizado.

**2. Pedidos**
- Quadro em colunas: **Novos · Em preparo · Prontos · Saiu para entrega**, mais as abas Concluídos e Cancelados.
- Card do pedido: número, canal (Site/WhatsApp/iFood), cliente, horário, tempo decorrido (fica amarelo e depois vermelho), total, forma de pagamento.
- Detalhe: itens com complementos e observações, endereço e referência, pagamento, troco, descontos (separando o que o iFood banca), código do iFood, histórico de status.
- Ações: Aceitar, Iniciar preparo, Pronto, Despachar, Entregue, Cancelar (com motivo), Imprimir comanda.
- Alerta sonoro repetido até aceitar; opção de aceite automático.
- Pedido de cancelamento do cliente no iFood: aviso com Aceitar/Recusar.
- **Modo cozinha:** tela cheia, fonte grande, alto contraste, tela sempre ligada.
- Lançar pedido manual (pedido que chegou por telefone ou WhatsApp).

**3. Agenda de encomendas**
- Calendário (dia, semana, mês) com as encomendas.
- Lista de produção do dia: "amanhã: 300 brigadeiros, 200 coxinhas".
- Configuração: antecedência mínima, limite por dia, dias bloqueados.

#### Cardápio e produção

**4. Cardápio**
- Categorias (ordem por arrastar).
- Produtos: nome, descrição, foto, preço por canal (site e iFood), categoria, ativo, **esgotado (um toque)**, destaque.
- Grupos de complementos reutilizáveis ("Sabores de brigadeiro" usado em vários kits).
- Indicador de margem em cada produto (vem de Receitas & Custos).
- Sincronização com o iFood: status de cada item (sincronizado, pendente, erro).

**5. Receitas & Custos**
- **Ingredientes:** nome, unidade, embalagem de compra (ex.: 395 g por R$ 6,50), custo por unidade calculado, data do último preço, fornecedor.
- **Receitas (ficha técnica):** ingredientes e quantidades, sub-receitas (massa base), rendimento, perda (%), tempo de preparo, modo de preparo, foto.
- **Embalagens:** forminhas, caixas, sacolas, etiquetas e o custo de cada uma.
- **Custos fixos do mês:** gás, luz, internet, MEI, pró-labore etc., e a estimativa de vendas do mês para fazer o rateio.
- **Taxas por canal:** comissão do iFood, taxa do Pix, taxa do cartão.
- **Precificação:** por produto: custo, preço sugerido por canal para a margem desejada, preço atual, margem real; alerta de prejuízo.
- **Simulador:** "e se o leite condensado subir 10%?" mostra o impacto em todos os produtos.
- Importar planilha de ingredientes e receitas.

**6. Estoque** *(fase posterior, opcional)*
- Saldo de ingredientes, baixa automática por venda (via receita), lista de compras sugerida.

#### Clientes e vendas

**7. Clientes**
- Lista com busca, total gasto, número de pedidos, último pedido, aniversário.
- Detalhe: histórico, endereços, pontos de fidelidade, consentimento de marketing.
- Filtros: "sumiu há 30 dias", "aniversariantes do mês", "melhores clientes".

**8. Marketing**
- **Cupons:** código, tipo (% / valor / frete grátis), valor mínimo, validade, limite total e por cliente, só primeira compra, canal.
- **Fidelidade:** regra ("a cada 10 pedidos, ganha X"), recompensa, validade dos pontos.
- **Promoções:** preço promocional por período, combo do dia.

**9. Avaliações**
- Notas e comentários do site e do iFood, resposta pelo painel.

**10. Relatórios**
- Vendas por período, por canal, por produto, por horário e dia da semana.
- Resultado: faturamento bruto, taxas, custo dos produtos e **lucro estimado** por canal.
- Desempenho dos cupons e da fidelidade.
- Exportar para Excel/CSV.

#### Configurações

**11. Loja**
- Dados (nome, logo, telefone, endereço, CNPJ/MEI), horários por dia da semana, feriados, tempo de preparo padrão, pedido mínimo, mensagens (ex.: aviso no topo do site).

**12. Entrega**
- Bairros com taxa, tempo estimado e ativo; retirada no local (sim/não); frete grátis acima de X.

**13. Pagamentos**
- Formas aceitas, conta Pix (Mercado Pago/Asaas), troco máximo.

**14. Integrações**
- iFood: conectar loja, status, último contato, fila de eventos, registro de erros, botão "testar conexão".
- 99Food (se houver API), WhatsApp, impressora.

**15. Usuários**
- Convidar usuário, definir perfil (Dona, Cozinha, Entregador), desativar, forçar troca de senha.

**16. Anotações do negócio**
- Páginas livres para as dicas do curso, fornecedores, procedimentos ("como embalar o cento").

**17. Registro de atividades** *(só Dona e Suporte)*
- Quem fez o quê e quando: mudou preço, cancelou pedido, aplicou desconto, alterou usuário.

---

## 6. Design

### Identidade visual
- **Tom:** acolhedor e caseiro, mas organizado, como uma confeitaria bem cuidada.
- **Cores (proposta, a definir com a logo):** uma cor principal quente (ex.: rosa-framboesa ou terracota), fundo creme ou branco, texto quase preto, cinzas neutros. Modo escuro no painel.
- **Cores de status fixas em todo o sistema**, sempre acompanhadas de ícone e texto (nunca só cor):
  - Novo = azul · Em preparo = amarelo · Pronto = verde · Saiu = roxo · Cancelado = vermelho · Atrasado = laranja.
- **Tipografia:** uma fonte arredondada e legível (ex.: Nunito ou Inter).
- **Fotos:** grandes e quadradas na loja; padrão de fundo e luz para todos os produtos.

### Regras de interface
- Área de toque mínima de 48 px; botões principais com largura total no celular.
- No máximo uma ação principal por tela.
- Ações destrutivas (cancelar pedido, excluir produto) pedem confirmação; ações frequentes (esgotado, aceitar) são de um toque, com opção de desfazer.
- Feedback imediato: carregando, salvo, erro com explicação do que fazer.
- Textos sem jargão: "Pausar loja por 30 min", não "Interromper merchant".
- Acessibilidade: contraste adequado, navegação por teclado no painel, textos alternativos nas fotos.

### Tecnologia de interface
- Next.js + Tailwind + biblioteca de componentes **shadcn/ui** (padrão visual consistente e acessível).
- PWA: o painel pode ser instalado no tablet como app, com notificações.

---

## 7. Segurança

### Acesso
- **Painel:** login com e-mail e senha forte; **verificação em duas etapas obrigatória** para o perfil Dona; sessão expira por inatividade; bloqueio temporário após várias tentativas erradas.
- **Cliente:** identificação por telefone; código de confirmação por SMS/WhatsApp como evolução.
- **Permissões por perfil** aplicadas no banco de dados (Row Level Security do Postgres), não só na tela. Mesmo que alguém burle a interface, o banco recusa.

### Regras de negócio no servidor
- **Preço, taxa de entrega, cupom e pontos são sempre recalculados no servidor.** O valor enviado pelo navegador é ignorado.
- Pagamento só é considerado confirmado pelo **webhook do provedor com assinatura validada**, nunca pela tela do cliente.
- Toda entrada é validada (formato, tamanho, valores permitidos).

### Segredos e dados
- Chaves do iFood, do Pix e do banco ficam em **variáveis de ambiente do servidor**, nunca no código ou no navegador.
- Tokens de integração guardados criptografados.
- HTTPS em tudo; cabeçalhos de segurança (CSP, HSTS).

### Proteção contra abuso
- Limite de tentativas em login, checkout e validação de cupom.
- Verificação anti-robô (Cloudflare Turnstile) no checkout se houver abuso.
- Idempotência: o mesmo pedido ou evento nunca é processado duas vezes.

### LGPD
- Coletar só o necessário (nome, telefone, endereço).
- Política de privacidade clara; consentimento separado para receber promoções.
- O cliente pode pedir a exclusão dos seus dados.
- Dados de clientes do iFood usados apenas para atender aquele pedido.

### Continuidade
- **Backup diário** do banco, com cópia fora do provedor principal.
- **Monitoramento de erros** (Sentry) e **alerta se o worker do iFood parar** (aviso por WhatsApp ou e-mail).
- Registro de atividades (aba 17) e registro de chamadas às APIs externas.
- Dependências atualizadas automaticamente (Dependabot) e testes rodando a cada alteração (GitHub Actions).

---

## 8. Serviços que rodam por trás

| Serviço | Função |
|---|---|
| **Worker de integrações** | Consulta o iFood a cada 30 s, salva e confirma eventos, envia mudanças de status e do cardápio, renova tokens |
| **Webhooks de pagamento** | Recebe a confirmação do Pix e marca o pedido como pago |
| **Notificações** | Avisa o cliente das mudanças de status (WhatsApp/e-mail) e a loja de novos pedidos |
| **Tarefas agendadas** | Abre e fecha a loja pelo horário, lembra encomendas do dia seguinte, faz backup, expira cupons e pontos |

---

## 9. Fluxos principais

**Pedido pelo site**
Cliente monta o carrinho → checkout → servidor recalcula valores → (Pix) QR Code → webhook confirma → pedido aparece em "Novos" com alerta → aceitar → preparo → pronto → saiu → entregue → pontos de fidelidade creditados.

**Pedido pelo iFood**
Worker recebe o evento → salva e confirma ao iFood → pedido aparece em "Novos" com selo iFood → aceitar (o sistema confirma no iFood) → cada mudança de status é enviada ao iFood → concluído.

**Encomenda**
Cliente escolhe data e hora → sistema verifica antecedência e limite do dia → pagamento (sinal ou total) → entra na agenda → véspera: aparece na lista de produção e lembrete → no dia, entra no quadro de pedidos.

---

## 10. Módulos para construir um a um

| # | Módulo | Depende de |
|---|---|---|
| 0 | Fundação: repositório, banco, login, perfis, layout do painel, CI | — |
| 1 | Receitas & Custos (ingredientes, receitas, embalagens, custos, taxas, precificação) | 0 |
| 2 | Cardápio (categorias, produtos, complementos, esgotado) | 0 (1 para margem) |
| 3 | Configurações da loja e entrega | 0 |
| 4 | Loja online + checkout (pagamento na entrega) | 2, 3 |
| 5 | Painel de pedidos + impressão | 4 |
| 6 | Pix online | 4, 5 |
| 7 | Clientes + Minha conta + repetir pedido | 4 |
| 8 | Marketing: cupons e fidelidade | 7 |
| 9 | Agenda de encomendas | 4, 5 |
| 10 | Relatórios e Início (resumo do dia) | 5 |
| 11 | Integração iFood (sandbox → homologação) | 2, 5 |
| 12 | Avaliações, estoque, anotações, 99Food | — |

### A definir com a dona da loja
- Nome da loja, logo e cores.
- Lista inicial de produtos e as receitas principais.
- Bairros atendidos e taxas.
- Horários de funcionamento.
- Formas de pagamento e conta para o Pix.
