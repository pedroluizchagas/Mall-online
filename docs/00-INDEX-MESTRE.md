# ÍNDICE MESTRE — Plataforma Delivery Divinópolis

### Versão definitiva — todas as decisões consolidadas

*23/03/2026*

-----

## DECISÕES FECHADAS (referência rápida)

|Tema                  |Decisão                                                   |
|----------------------|----------------------------------------------------------|
|**Nome**              |Mallora ou Mallux — a definir                             |
|**Conceito**          |Shopping digital regional, Divinópolis MG                 |
|**Atores**            |Plataforma · Lojista · Consumidor · Entregador            |
|**Receita 1**         |Assinatura mensal do lojista (Stripe Billing)             |
|**Receita 2**         |R$1,00 por pedido entregue                                |
|**Receita 3**         |R$0,75 por pedido com antecipação de repasse              |
|**Gateway de pedidos**|Pagar.me (Pix, cartão, split com múltiplos recebedores)   |
|**Gateway de assinatura**|Stripe Billing (mensalidade do lojista — inalterado)   |
|**Merchant of Record**|Plataforma                                                |
|**Recebedores**       |Recipients Pagar.me (lojistas + entregadores)             |
|**Liquidação lojista**|Pix D+0 · Cartão D+29+2 · D+15 com antecipação automática |
|**Liquidação entregador**|D+1 (transfer estágio 2 da Mallora para o recipient)   |
|**Repasses operacionais**|Liquidação automática Pagar.me (sem cron próprio)      |
|**Migration 001**     |Aplicada                                                |
|**Migration 006**     |Pendente — cutover Pagar.me (campos + webhook_events_log)|
|**Migration 007**     |Pendente — drop Stripe Connect (pós-cutover)            |
|**Parcelamento**      |1x..12x via `installment_type: 'customer'` (juros pela Pagar.me)|
|**Tokenização cartão**|Client-side via `EXPO_PUBLIC_PAGARME_APPID` (PCI)       |
|**Idempotência webhook**|Tabela `webhook_events_log` (event.id PK)              |
|**Paleta**            |Verde Minas: `#1A4D3A` · `#4CAF82` · `#F5A623` · `#FFF8ED`|

-----

## OS QUATRO ATORES

```
┌──────────────────────────────────────────────────────────────┐
│                     PLATAFORMA (Pedro)                       │
│              Painel Super Admin — Next.js Web                │
└───────────────┬──────────────────────────┬───────────────────┘
                │                          │
     ┌──────────▼──────────┐    ┌──────────▼──────────┐
     │      LOJISTA        │    │     ENTREGADOR       │
     │  Dashboard Web PWA  │    │   App Mobile Expo    │
     │     (Next.js)       │    │  (mobile-courier)    │
     └──────────┬──────────┘    └──────────┬──────────┘
                │                          │
     ┌──────────▼──────────────────────────▼──────────┐
     │                  CONSUMIDOR                     │
     │           App Mobile Expo (mobile-consumer)     │
     └─────────────────────────────────────────────────┘
```

-----

## FLUXO DE DINHEIRO (Pagar.me — split + transfer)

```
Consumidor paga R$60 (R$50 produto + R$10 frete)
                  ↓
     Plataforma recebe R$60 (Merchant of Record)
                  ↓
     Pagar.me debita MDR (~3,5% cartão / ~0,99% Pix — rateado)
                  ↓
     Estágio 1 — split na criação da Order:
        Mallora       R$1,00 (comissão fixa)
        Mallora       R$10,00 (taxa de entrega — temporária)
        Lojista       R$49,00
                  ↓
     Estágio 2 — após o lojista alocar entregador:
        Transfer Mallora → Entregador  R$10,00
                  ↓
     Liquidação automática do Pagar.me:
        Lojista:    Pix D+0 · Cartão D+29+2 (ou D+15 c/ antecipação)
        Entregador: D+1 (configuração padrão do recipient)
        Mallora:    saldo da conta principal
```

-----

## LISTA COMPLETA — 31 ARQUIVOS (00 + 01..30)

-----

### GRUPO 1 — FUNDAÇÃO & VISÃO

**`01` — Visão do Produto & Modelo de Negócio**

- Conceito de shopping digital regional
- Os 4 atores e seus papéis
- As 3 fontes de receita detalhadas (assinatura + R$1,00 + R$0,75)
- Planos de assinatura e limites (lojas, produtos, features)
- Dois tipos de entregador: próprio do lojista vs autônomo da plataforma
- Concorrência local e diferenciais
- Estimativa de receita (simulação com 50 lojistas + volume de pedidos)
- *Tokens est.: ~3.500*

**`02` — Arquitetura Técnica & Stack**

- Diagrama de arquitetura completo (4 atores, 3 apps, 1 backend)
- Stack com versões fixadas: Next.js 14, Expo SDK 51, Supabase, Stripe
- Decisões técnicas e justificativas (por que Pagar.me para pedidos, por que Stripe Billing apenas para assinatura)
- Estrutura do monorepo pnpm (apps/web · apps/mobile-consumer · apps/mobile-courier · packages/types · packages/lib)
- Fluxo de dados entre os 4 atores
- *Tokens est.: ~4.000*

-----

### GRUPO 2 — BANCO DE DADOS & SEGURANÇA

**`03` — Schema Completo do Banco**

- Todas as tabelas com colunas, tipos, constraints e índices
- Tabelas existentes: `plans` · `tenant_subscriptions` · `categories` · `tenants` · `stores` · `products` · `orders` · `order_items` · `consumers`
- Novas tabelas: `couriers` · `delivery_assignments` · `courier_locations` · `payouts` · `payout_advance_requests` · `stock_movements`
- Campos Pagar.me (`pagarme_recipient_id`, `pagarme_order_id`, `pagarme_charge_id`, `pagarme_transfer_id`) e campos Stripe Billing (`stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`, `stripe_product_id`)
- ENUMs de status: pedido · entrega · pagamento · repasse · billing
- Diagrama de relacionamentos (ERD textual)
- *Tokens est.: ~5.000*

**`04` — Migrations SQL**

- `migration_001` — já aplicada (documentada como referência)
- `migration_002` — campos de pagamento (versão aspiracional Pagar.me; em produção foi aplicada com nomes Stripe Connect — corrigido pela `migration_006`)
- `migration_003` — módulo entregador (`couriers`, `delivery_assignments`, `courier_locations`)
- `migration_004` — módulo financeiro (`payouts`, `payout_advance_requests`, `platform_fee_amount`)
- `migration_005` — módulo estoque (`stock_movements`, campos `stock_quantity`, `track_stock`)
- `migration_006` — **cutover Pagar.me**: adiciona `pagarme_recipient_id`, `pagarme_onboarding_status`, `pagarme_order_id`, `pagarme_charge_id`, `pagarme_transfer_id`, `pagarme_anticipation_id` e cria `webhook_events_log` (idempotência de webhook). Mantém os campos Stripe Connect legados durante a janela de cutover.
- `migration_007` — pós-cutover: drop dos campos Stripe Connect (`stripe_account_id`, `stripe_onboarding_ok`, `stripe_payment_intent_id`, `stripe_transfer_id`). Stripe Billing permanece intacto.
- Cada migration com rollback (`down`)
- *Tokens est.: ~5.500*

**`05` — RLS, Policies & Segurança**

- Helpers existentes: `my_tenant_id()` e `my_consumer_id()`
- Novo helper: `my_courier_id()`
- Policies por tabela e por ator (lojista só vê seus dados, entregador só vê suas entregas, consumidor só vê seus pedidos)
- Trigger de limite de lojas e produtos por plano (já existente + documentado)
- Trigger de atualização de `updated_at`
- Regras de visibilidade de `courier_locations` (consumidor vê apenas entregador do seu pedido ativo)
- Segurança das Edge Functions (verificação de JWT, service_role apenas internamente)
- *Tokens est.: ~4.000*

-----

### GRUPO 3 — PAGAMENTOS (PAGAR.ME + STRIPE BILLING)

**`06` — Arquitetura Pagar.me & Modelo Financeiro**

- Pagar.me como gateway de pedidos; Stripe Billing apenas para assinatura
- Estrutura de split (Mallora, lojista, entregador) com `charge_processing_fee` e `liable`
- Modelo de dois estágios para alocação de motoboy após checkout
- Fluxo de dinheiro detalhado com valores reais e taxas Pagar.me Brasil
- Cadastro de recipients (lojistas e entregadores) com KYC para PF
- Stripe Billing para assinatura: produtos, preços, trial, dunning
- Liquidação automática Pagar.me: Pix instantâneo · Cartão D+29+2 · D+15 com antecipação
- Antecipação automática e manual via API Pagar.me
- Tabelas `payouts` e `payout_advance_requests` explicadas
- Tratamento de cancelamentos, estornos e chargebacks com split
- *Tokens est.: ~5.500*

**`07` — Edge Functions de Pagamento (código completo)**

- `onboard-tenant` — cria recipient Pagar.me + Stripe Customer (para Billing)
- `onboard-courier` — cria recipient Pagar.me + gera kyc_link
- `create-pagarme-order` — cria Order com split estágio 1 (Mallora + lojista)
- `transfer-to-courier` — Transfer estágio 2 (taxa de entrega ao entregador)
- `pagarme-webhook` — eventos: `order.paid` · `charge.paid` · `charge.refunded` · `charge.chargeback.created` · `recipient.status.changed` · `transfer.created` / `paid` / `failed`
- `request-advance` — antecipação via API Pagar.me com taxa contratual
- `create-subscription` — cria Stripe Subscription após recipient ativo
- `stripe-webhook` — apenas eventos de Billing: `customer.subscription.*` · `invoice.paid` · `invoice.payment_failed`
- *Tokens est.: ~6.000*

-----

### GRUPO 4 — ESTRUTURA & CONFIGURAÇÃO

**`08` — Estrutura do Monorepo**

- Árvore completa de pastas dos 3 apps + 2 packages
- Configuração `pnpm-workspace.yaml`
- `tsconfig.json` base + por app
- ESLint + Prettier compartilhados
- Scripts de desenvolvimento (`dev:web`, `dev:consumer`, `dev:courier`)
- Convenções de código (português para domínio, PascalCase componentes, etc.)
- *Tokens est.: ~4.000*

**`09` — Variáveis de Ambiente & Secrets**

- Todas as env vars necessárias (Supabase, Pagar.me, Stripe Billing, Expo)
- Template `.env.local` completo
- Onde obter cada chave (Supabase Dashboard, Pagar.me Dashboard, Stripe Dashboard)
- Configuração no Vercel (produção) e localmente (desenvolvimento)
- Separação dev / staging / prod
- Regras: nunca commitar chaves, usar `.env.example` no repositório
- *Tokens est.: ~2.500*

-----

### GRUPO 5 — DASHBOARD DO LOJISTA (Web)

**`10` — Auth & Onboarding do Lojista**

- Páginas `/entrar` e `/cadastro`
- Wizard 4 etapas: dados do negócio → dados da loja → escolha de plano → configurar recebimentos
- Onboarding Pagar.me: criar recipient, coletar dados bancários / chave Pix, gerar `kyc_url`
- Webhook `recipient.status.changed` → marcar `pagarme_onboarding_status = active`
- Criar Stripe Billing Subscription após recipient ativo
- Middleware Next.js de proteção de rotas
- Bloqueio de acesso quando `billing_status = past_due | canceled`
- *Tokens est.: ~4.500*

**`11` — Dashboard — Produtos & Categorias**

- CRUD completo de produtos com Server Actions
- Upload de foto para Supabase Storage (bucket `product-images`)
- Categorias com ícone, emoji e ordem
- Toggle de disponibilidade inline (otimistic UI)
- Barra de progresso de uso do plano (X/Y produtos)
- Aviso e bloqueio ao atingir limite do plano
- *Tokens est.: ~4.000*

**`12` — Dashboard — Gestão de Pedidos**

- Lista de pedidos com Supabase Realtime (subscribe em tempo real)
- Notificação sonora (Web Audio API) para pedido novo
- Transições de status com botões de ação rápida
- Atribuição de entregador: próprio ou da plataforma
- Modal de detalhes: itens · consumidor · endereço · forma de pagamento · mapa
- Visualização da localização do entregador em tempo real (mini-mapa)
- Ao confirmar `entregue`: atualiza `payment_status` e agenda repasse
- Filtros por período e status
- *Tokens est.: ~4.500*

**`13` — Dashboard — Financeiro & Assinatura**

- KPIs: faturamento bruto · líquido · ticket médio · total de pedidos
- Gráfico temporal de faturamento
- Top produtos vendidos
- Seção repasses: saldo a receber, próximo repasse, histórico
- Botão “Antecipar recebimento” → modal com cálculo do desconto (nº pedidos × R$0,75)
- Tabela de `payouts` com status (pendente · processado · falhou)
- Saldo do recipient Pagar.me: disponível · a receber · transferido
- Gestão da assinatura: status · próxima cobrança · link para Customer Portal · histórico de faturas
- *Tokens est.: ~4.500*

**`14` — Dashboard — Configurações da Loja**

- Dados da loja: nome, logo, banner, descrição, telefone, endereço
- Horários de funcionamento (grade semanal com toggle por dia)
- Raio de entrega e taxa de entrega
- Tempo médio estimado de entrega
- Métodos de pagamento aceitos (dinheiro, PIX, cartão na entrega, cartão online)
- Configuração de entrega: entregador próprio cadastrado vs pool de entregadores da plataforma
- Seção “Minha conta Stripe”: status KYC, saldo disponível, link Express Dashboard
- *Tokens est.: ~3.500*

-----

## GRUPO 6 — APP DO CONSUMIDOR (Mobile)

**`15` — Consumer App — Auth & Estrutura**

- Expo Router com grupos `(auth)` e `(tabs)`
- Login com Magic Link ou OTP por email/telefone
- Perfil: nome, foto, telefone, endereço padrão
- Zustand stores: `useCartStore` · `useAuthStore` · `useOrderStore`
- NativeWind setup + tema Verde Minas
- Supabase client para mobile
- *Tokens est.: ~4.000*

**`16` — Consumer App — Home & Exploração**

- Home: banners rotativos · categorias em scroll horizontal · lojas em destaque · perto de você
- Listagem de lojas: cards com logo, nome, tempo estimado, taxa de entrega, avaliação, aberto/fechado
- Filtros: categoria · aberto agora · frete grátis · ordenação
- Skeleton loading em todas as listas
- Página da loja: header com banner/logo · menu com âncoras por categoria (sticky) · cards de produto
- Modal de produto: foto, descrição, adicionais/variações, quantidade, botão adicionar ao carrinho
- *Tokens est.: ~4.500*

**`17` — Consumer App — Carrinho & Checkout Pagar.me**

- Carrinho global via Zustand (`useCartStore`)
- Bottom sheet do carrinho (swipe up)
- Resumo: itens · subtotal · taxa de entrega · total
- Seleção e confirmação de endereço (endereços salvos + novo)
- Seleção de forma de pagamento: cartão online (Pagar.me) · Pix (Pagar.me) · dinheiro na entrega · cartão na entrega
- Tela de Pix com QR code/copia-e-cola e expiração
- Tela de cartão com tokenização **client-side** via `EXPO_PUBLIC_PAGARME_APPID` (PCI — número/CVV nunca passam pelo backend)
- Seletor de parcelas 1x..12x (`installment_type: 'customer'` — juros pela Pagar.me a partir da 2ª parcela)
- Chamada à Edge Function `create-pagarme-order` para criação da Order com split
- Observações do pedido
- Atualização do `payment_status` via webhook Pagar.me (Realtime)
- Tratamento de erros de pagamento
- *Tokens est.: ~5.000*

**`18` — Consumer App — Pedido & Perfil**

- Tela de acompanhamento em tempo real (Supabase Realtime)
- Timeline visual de status do pedido
- Mapa com localização do entregador em tempo real (`courier_locations` via Realtime)
- Estimativa de tempo restante
- Botão de contato via WhatsApp (deeplink com número do lojista)
- Histórico de pedidos com filtro por período
- Repetir pedido (adiciona itens ao carrinho)
- Avaliação do pedido (lojista + entregador)
- Perfil: editar dados pessoais · gerenciar endereços salvos (CRUD)
- *Tokens est.: ~4.000*

-----

### GRUPO 7 — APP DO ENTREGADOR (Mobile)

**`19` — Entregador — Modelo, Auth & Cadastro**

- Dois tipos: **próprio do lojista** (vinculado a um tenant) vs **autônomo da plataforma** (pool geral)
- Tela de cadastro: nome · CPF · telefone · CNH · foto · dados bancários
- Fluxo de aprovação pelo admin (status: `pendente → aprovado | reprovado`)
- Onboarding Pagar.me após aprovação: criação de recipient + KYC com Prova de Vida
- Auth mobile (Supabase Auth, separado dos consumidores)
- Permissões: localização em background (Expo Location), notificações
- *Tokens est.: ~4.500*

**`20` — Entregador — App Core (Entregas)**

- Toggle online/offline na tela principal
- Fila de entregas disponíveis (quando online): loja · endereço consumidor · valor da entrega · distância
- Aceitar ou recusar entrega (com timeout — se recusar 3x, sai da fila)
- Fluxo ativo: ir até a loja → confirmar coleta → ir até o consumidor → confirmar entrega (foto ou código)
- Mapa com rota (loja → consumidor) usando Expo Maps
- Status do pedido atualizado automaticamente em cada etapa
- Notificações push para novo pedido disponível
- Histórico de entregas do dia
- *Tokens est.: ~5.000*

**`21` — Entregador — Localização em Tempo Real**

- Expo Location com `watchPositionAsync` em background
- Transmissão de coordenadas para `courier_locations` via Supabase Realtime
- Atualização a cada 5 segundos quando em entrega ativa
- Parar transmissão quando pedido entregue ou entregador offline
- Consumidor vê localização no mapa (subscribe em `courier_locations` filtrado pelo `delivery_assignment` do pedido)
- Lojista vê localização no mini-mapa do dashboard
- Tratamento de permissão negada e GPS desligado
- *Tokens est.: ~4.500*

**`22` — Entregador — Financeiro & Ganhos**

- Dashboard de ganhos: hoje · semana · mês
- Valor por entrega (definido pelo lojista ou pela plataforma)
- Transfer automático após alocação no pedido (estágio 2 do split)
- Histórico de entregas e valores correspondentes
- Tabela de `payouts` filtrada pelo courier (com `pagarme_transfer_id`)
- Saldo do recipient consultado via API Pagar.me (`/recipients/{id}/balance`)
- Configuração de conta bancária ou chave Pix (atualização via API)
- Notificação quando transfer for liquidado (webhook `transfer.paid`)
- *Tokens est.: ~4.000*

-----

### GRUPO 8 — FUNCIONALIDADES TRANSVERSAIS

**`23` — Push Notifications**

- Expo Notifications nos 3 apps (tokens por ator)
- Tabela `push_tokens` no banco (user_id · courier_id · token · plataforma)
- Supabase Database Webhooks em `orders` (INSERT e UPDATE)
- Edge Function `notify-order-update`
- Eventos por ator:
  - **Consumidor:** pedido confirmado · em preparo · saiu para entrega · entregue · cancelado
  - **Lojista:** novo pedido (com som no dashboard também) · entregador a caminho · entrega confirmada
  - **Entregador:** novo pedido disponível · pedido cancelado · repasse processado
- Fallback: notificação in-app via Supabase Realtime
- *Tokens est.: ~4.000*

**`24` — Módulo de Estoque**

- Campos `stock_quantity` e `track_stock` em `products`
- Decremento automático ao confirmar pedido (trigger ou Edge Function)
- Incremento manual: entrada de estoque (compra/reposição)
- Ajuste de estoque (perda, correção com motivo)
- Tabela `stock_movements` com histórico completo
- Alerta quando estoque abaixo do mínimo configurado
- Disponível apenas em planos superiores (verificação via `max_features` do plano)
- *Tokens est.: ~3.000*

-----

### GRUPO 9 — ADMINISTRAÇÃO & OPERAÇÃO

**`25` — Painel Super Admin**

- Rota protegida `/admin` (role `super_admin` no JWT)
- Gestão de tenants: listar · filtrar por status de assinatura · ativar · suspender
- Gestão de entregadores: listar cadastros pendentes · aprovar · reprovar · ver histórico
- Métricas globais: GMV · pedidos/dia · lojas ativas · entregadores ativos · receita da plataforma
- Receita detalhada: assinaturas (Stripe Billing API) + comissão por pedido (soma `platform_fee_amount`) + taxas de antecipação Pagar.me
- Gestão de planos: CRUD com sincronização Stripe Products/Prices
- Conciliação financeira: repasses Pagar.me (estágio 2 + liquidações automáticas) vs pendentes por período
- Log de webhooks Pagar.me e Stripe Billing (para debug)
- *Tokens est.: ~5.000*

-----

### GRUPO 10 — QUALIDADE & DEPLOY

**`26` — Testes & Qualidade**

- Estratégia geral: unitários para lógica crítica + E2E para fluxos principais
- Testes unitários: Edge Functions (`create-pagarme-order`, `transfer-to-courier`, `request-advance`, cálculo de split)
- Testes E2E com Playwright: fluxo completo (consumidor faz pedido → lojista confirma → entregador entrega → transfer estágio 2 processado)
- Pagar.me sandbox: cartões de teste, forçar confirmação Pix; Stripe Billing test mode para assinatura
- Testes de RLS: garantir que cada ator só acessa seus próprios dados
- *Tokens est.: ~3.500*

**`27` — Deploy & Infraestrutura**

- Supabase Pro ($25/mês): Edge Functions, Realtime, Scheduled Functions
- Vercel Pro ($20/mês): domínio customizado, SSL, variáveis de ambiente por environment
- Pagar.me produção: checklist de ativação (conta empresarial verificada, recipient principal ativo, webhooks registrados, antifraude se aplicável)
- Stripe Billing produção: checklist (Customer Portal habilitado, Products/Prices sincronizados, webhooks registrados)
- Configuração de webhooks Pagar.me e Stripe em produção (URLs das Edge Functions)
- Monitoramento: Vercel Analytics + Supabase Dashboard + Pagar.me Dashboard + Stripe Dashboard
- Checklist completo pré-lançamento (30 itens)
- *Tokens est.: ~4.000*

-----

### GRUPO 11 — PROMPTS CLAUDE CODE

**`28` — Prompt Mestre Claude Code**

- Contexto completo do projeto (4 atores, 3 fontes de receita, modelo Pagar.me + Stripe Billing)
- Stack com versões fixadas
- Convenções de código (TypeScript strict, português para domínio, Server Actions, etc.)
- Regras de multi-tenancy e segurança
- Estrutura de pastas completa
- Campos Pagar.me e Stripe Billing nas tabelas
- Fluxo obrigatório antes de cada tarefa
- Seção `[TAREFA ATUAL]` para preencher a cada sessão
- *Tokens est.: ~3.500*

**`29` — Prompts Específicos por Fase**

- Prompt pronto para cada um dos 29 arquivos deste índice
- Cada prompt inclui: contexto mínimo necessário · arquivos relacionados a consultar · critérios de aceite
- É só copiar o prompt da fase atual e colar no Claude Code
- *Tokens est.: ~4.500*

-----

### GRUPO 12 — INTEGRACAO PAGAR.ME (NOVO)

**`30` — Integração Pagar.me: Split, Recebedores e Liquidação**

- Visão geral da integração Pagar.me e divisão de responsabilidades com Stripe Billing
- Autenticação Basic Auth, ambiente sandbox e produção
- Cadastro de recipients (lojistas PJ/PF e entregadores) com KYC e Prova de Vida
- Estrutura de `split_rules` com 3 recebedores e parâmetros `charge_processing_fee` / `liable`
- Arquitetura de dois estágios para alocação de motoboy após checkout (Estratégia B)
- Webhooks: `order.paid`, `charge.refunded`, `charge.chargeback.created`, `recipient.status.changed`, `transfer.*`
- Antecipação automática (recipient setting) e manual (API por lote)
- Tratamento de chargeback e estorno parcial com split
- Variáveis de ambiente e estrutura de segredos
- Tabela de mapeamento Stripe Connect → Pagar.me (campo a campo)
- Checklist sandbox + produção
- *Tokens est.: ~5.500*

-----

## VISÃO GERAL

|Item                     |Valor                                                         |
|-------------------------|--------------------------------------------------------------|
|Total de arquivos        |30 + este índice = **31**                                     |
|Grupos temáticos         |12                                                            |
|Tokens totais estimados  |~131.000                                                      |
|Tamanho médio por arquivo|~4.200 tokens                                                 |
|Atores cobertos          |Plataforma · Lojista · Consumidor · Entregador                |
|Apps cobertos            |web (Next.js) · mobile-consumer (Expo) · mobile-courier (Expo)|
|Migrations cobertas      |5 (001 já aplicada + 4 pendentes)                             |
|Edge Functions cobertas  |8 (Pagar.me + Stripe Billing)                                 |

-----

## COMO SOLICITAR

> *“Me entregue o arquivo **[NÚMERO]** — [NOME]”*

**Sugestão para começar:**

> *“Me entregue o arquivo 01 — Visão do Produto & Modelo de Negócio”*

-----

## ORDEM DE DESENVOLVIMENTO RECOMENDADA

```
01 → 02              Entender o produto
08 → 09              Configurar o ambiente
03 → 04 → 05         Banco de dados completo
06 → 07 → 30         Pagamentos (Pagar.me) antes de qualquer UI
10                   Onboarding do lojista
11 → 12 → 13 → 14   Dashboard completo
15 → 16 → 17 → 18   App do consumidor
19 → 20 → 21 → 22   App do entregador
23 → 24              Notificações e estoque
25                   Painel admin
26 → 27              Testes e deploy
28 → 29              Usar desde o início como referência
```

-----

*Índice atualizado — 29/04/2026 (substitui Stripe Connect por Pagar.me)*
*Plataforma Delivery Divinópolis — Stack: Next.js + Expo ×2 + Supabase + Pagar.me + Stripe Billing*
