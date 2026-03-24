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
|**Mecanismo Stripe**  |Separate Charges and Transfers                            |
|**Merchant of Record**|Plataforma                                                |
|**Conta conectada**   |Express Accounts (lojistas + entregadores)                |
|**Repasse lojista**   |D+7 padrão · D+2 com taxa de R$0,75/pedido                |
|**Repasse entregador**|D+1 automático                                            |
|**Cron de repasses**  |Supabase Scheduled Edge Function — meia-noite             |
|**Migration 001**     |Aplicada                                                |
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

## FLUXO DE DINHEIRO (Separate Charges and Transfers)

```
Consumidor paga R$60 (R$50 produto + R$10 frete)
                  ↓
     Plataforma recebe R$60 (Merchant of Record)
                  ↓
     Stripe desconta taxa (~R$2,28 no Brasil)
                  ↓
     Plataforma retém R$1,00 (comissão por pedido)
                  ↓
     Saldo a distribuir: ~R$56,72
          ↓                    ↓
   Transfer ao LOJISTA    Transfer ao ENTREGADOR
   R$46,72 (D+7)          R$10,00 (D+1)
   ou D+2 pagando R$0,75

   Antecipação lojista:
   R$46,72 - (nº pedidos × R$0,75) = valor líquido D+2
```

-----

## LISTA COMPLETA — 30 ARQUIVOS

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
- Decisões técnicas e justificativas (por que Separate Charges, por que Express)
- Estrutura do monorepo pnpm (apps/web · apps/mobile-consumer · apps/mobile-courier · packages/types · packages/lib)
- Fluxo de dados entre os 4 atores
- *Tokens est.: ~4.000*

-----

### GRUPO 2 — BANCO DE DADOS & SEGURANÇA

**`03` — Schema Completo do Banco**

- Todas as tabelas com colunas, tipos, constraints e índices
- Tabelas existentes: `plans` · `tenant_subscriptions` · `categories` · `tenants` · `stores` · `products` · `orders` · `order_items` · `consumers`
- Novas tabelas: `couriers` · `delivery_assignments` · `courier_locations` · `payouts` · `payout_advance_requests` · `stock_movements`
- Campos Stripe em todas as tabelas relevantes
- ENUMs de status: pedido · entrega · pagamento · repasse · billing
- Diagrama de relacionamentos (ERD textual)
- *Tokens est.: ~5.000*

**`04` — Migrations SQL**

- `migration_001` — já aplicada (documentada como referência)
- `migration_002` — campos Stripe (`stripe_account_id`, `stripe_customer_id`, `billing_status`, `payment_status`, etc.)
- `migration_003` — módulo entregador (`couriers`, `delivery_assignments`, `courier_locations`)
- `migration_004` — módulo financeiro (`payouts`, `payout_advance_requests`, `platform_fee_amount`)
- `migration_005` — módulo estoque (`stock_movements`, campos `stock_quantity`, `track_stock`)
- Cada migration com rollback (`down`)
- *Tokens est.: ~5.000*

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

### GRUPO 3 — PAGAMENTOS STRIPE

**`06` — Arquitetura Stripe Connect & Modelo Financeiro**

- Separate Charges and Transfers explicado com exemplos de código
- Por que não Destination Charges puro (múltiplos destinatários)
- Fluxo de dinheiro detalhado com valores reais e taxas Stripe Brasil
- Express Accounts para lojistas: onboarding, KYC, Express Dashboard
- Express Accounts para entregadores: onboarding simplificado, saque
- Stripe Billing para assinatura: produtos, preços, trial, dunning
- Lógica de repasse D+7 (lojista) e D+1 (entregador)
- Lógica de antecipação D+2 com desconto R$0,75 por pedido
- Tabela `payouts` e `payout_advance_requests` explicadas
- Cron job `daily-payouts`: como funciona e quando dispara
- Tratamento de cancelamentos e estornos (tudo na plataforma)
- *Tokens est.: ~5.000*

**`07` — Edge Functions de Pagamento (código completo)**

- `onboard-tenant` — cria tenant + store + Stripe Customer + inicia onboarding Express
- `onboard-courier` — cria courier + inicia onboarding Express do entregador
- `create-payment-intent` — cria PaymentIntent com currency BRL
- `stripe-webhook` — todos os eventos: `payment_intent.succeeded` · `payment_intent.payment_failed` · `account.updated` · `customer.subscription.updated` · `customer.subscription.deleted` · `invoice.paid` · `invoice.payment_failed`
- `daily-payouts` — cron meia-noite: processa repasses D+1 (entregadores) e D+7 (lojistas), executa antecipações aprovadas D+2 com desconto de R$0,75
- `request-advance` — lojista solicita antecipação, valida elegibilidade, calcula desconto
- `create-subscription` — cria Stripe Subscription após onboarding
- *Tokens est.: ~5.000*

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

- Todas as env vars necessárias (Supabase, Stripe, Expo)
- Template `.env.local` completo
- Onde obter cada chave (Supabase Dashboard, Stripe Dashboard)
- Configuração no Vercel (produção) e localmente (desenvolvimento)
- Separação dev / staging / prod
- Regras: nunca commitar chaves, usar `.env.example` no repositório
- *Tokens est.: ~2.500*

-----

### GRUPO 5 — DASHBOARD DO LOJISTA (Web)

**`10` — Auth & Onboarding do Lojista**

- Páginas `/entrar` e `/cadastro`
- Wizard 4 etapas: dados do negócio → dados da loja → escolha de plano → configurar recebimentos
- Stripe Connect Express Onboarding: criar conta, gerar link, callback `/onboarding/stripe/callback`
- Webhook `account.updated` → marcar KYC completo
- Criar Stripe Subscription após KYC
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
- Link para Stripe Express Dashboard (saldos e saques)
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

**`17` — Consumer App — Carrinho & Checkout Stripe**

- Carrinho global via Zustand (`useCartStore`)
- Bottom sheet do carrinho (swipe up)
- Resumo: itens · subtotal · taxa de entrega · total
- Seleção e confirmação de endereço (endereços salvos + novo)
- Seleção de forma de pagamento: cartão online (Stripe) · PIX (Stripe) · dinheiro na entrega · cartão na entrega
- Stripe Payment Sheet (`@stripe/stripe-react-native`): fluxo completo cartão + PIX
- Chamada à Edge Function `create-payment-intent` antes de abrir o Payment Sheet
- Observações do pedido
- Criação do pedido em `orders` após confirmação do pagamento
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
- Onboarding Stripe Express após aprovação (KYC para receber pagamentos)
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
- Repasse automático D+1 (cron `daily-payouts`)
- Histórico de entregas e valores correspondentes
- Tabela de `payouts` filtrada pelo courier
- Saldo disponível na conta Stripe Express via API
- Link para Stripe Express Dashboard (sacar para conta bancária)
- Notificação quando repasse for processado
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
- Receita detalhada: assinaturas (Stripe Billing API) + comissão por pedido (soma `platform_fee_amount`) + taxas de antecipação
- Gestão de planos: CRUD com sincronização Stripe Products/Prices
- Conciliação financeira: repasses processados vs pendentes por período
- Log de webhooks Stripe (para debug)
- *Tokens est.: ~5.000*

-----

### GRUPO 10 — QUALIDADE & DEPLOY

**`26` — Testes & Qualidade**

- Estratégia geral: unitários para lógica crítica + E2E para fluxos principais
- Testes unitários: Edge Functions (`daily-payouts`, `create-payment-intent`, cálculo de antecipação)
- Testes E2E com Playwright: fluxo completo (consumidor faz pedido → lojista confirma → entregador entrega → repasse processado)
- Stripe test mode: como usar cartões de teste, simular webhooks localmente (`stripe listen`)
- Testes de RLS: garantir que cada ator só acessa seus próprios dados
- *Tokens est.: ~3.500*

**`27` — Deploy & Infraestrutura**

- Supabase Pro ($25/mês): habilitar PIX no Stripe, configurar Scheduled Functions
- Vercel Pro ($20/mês): domínio customizado, SSL, variáveis de ambiente por environment
- Stripe produção: checklist de ativação (conta verificada, PIX ativo, webhooks registrados, Radar configurado)
- Configuração de webhooks Stripe em produção (URL da Edge Function)
- Monitoramento: Vercel Analytics + Supabase Dashboard + Stripe Dashboard
- Checklist completo pré-lançamento (30 itens)
- *Tokens est.: ~4.000*

-----

### GRUPO 11 — PROMPTS CLAUDE CODE

**`28` — Prompt Mestre Claude Code**

- Contexto completo do projeto (4 atores, 3 fontes de receita, modelo Stripe)
- Stack com versões fixadas
- Convenções de código (TypeScript strict, português para domínio, Server Actions, etc.)
- Regras de multi-tenancy e segurança
- Estrutura de pastas completa
- Campos Stripe nas tabelas
- Fluxo obrigatório antes de cada tarefa
- Seção `[TAREFA ATUAL]` para preencher a cada sessão
- *Tokens est.: ~3.500*

**`29` — Prompts Específicos por Fase**

- Prompt pronto para cada um dos 29 arquivos deste índice
- Cada prompt inclui: contexto mínimo necessário · arquivos relacionados a consultar · critérios de aceite
- É só copiar o prompt da fase atual e colar no Claude Code
- *Tokens est.: ~4.500*

-----

## VISÃO GERAL

|Item                     |Valor                                                         |
|-------------------------|--------------------------------------------------------------|
|Total de arquivos        |29 + este índice = **30**                                     |
|Grupos temáticos         |11                                                            |
|Tokens totais estimados  |~125.000                                                      |
|Tamanho médio por arquivo|~4.200 tokens                                                 |
|Atores cobertos          |Plataforma · Lojista · Consumidor · Entregador                |
|Apps cobertos            |web (Next.js) · mobile-consumer (Expo) · mobile-courier (Expo)|
|Migrations cobertas      |5 (001 já aplicada + 4 pendentes)                             |
|Edge Functions cobertas  |7                                                             |

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
06 → 07              Stripe (antes de qualquer UI)
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

*Índice definitivo — 23/03/2026*
*Plataforma Delivery Divinópolis — Stack: Next.js + Expo ×2 + Supabase + Stripe Connect*
