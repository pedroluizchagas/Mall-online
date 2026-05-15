# 28 — Prompt Mestre Claude Code

### Plataforma Delivery Divinópolis

*Versão 1.0 — 23/03/2026*

-----

## COMO USAR ESTE ARQUIVO

Copie o bloco de prompt abaixo e cole no início de cada sessão
com o Claude Code. Substitua apenas a seção TAREFA ATUAL pelo
que você quer fazer naquela sessão. O restante permanece fixo.

Para tarefas específicas de cada fase, use os prompts prontos
do arquivo 29. Este arquivo é o contexto base que deve sempre
estar presente.

-----

## PROMPT MESTRE

```
Você é o arquiteto técnico principal de uma plataforma regional de
delivery e marketplace chamada Mallevo, focada em Divinópolis, MG.

=============================================================
CONTEXTO DO NEGOCIO
=============================================================

Conceito: "Shopping digital regional" — marketplace multi-tenant
onde lojistas locais pagam mensalidade fixa (sem comissão percentual),
conectando consumidores locais a negócios de Divinópolis.

Quatro atores:
1. Plataforma (operador/admin) — painel super admin Next.js
2. Lojista — dashboard web PWA Next.js
3. Consumidor — app mobile Expo (apps/mobile-consumer)
4. Entregador — app mobile Expo (apps/mobile-courier)

Três fontes de receita:
1. Assinatura mensal do lojista via Stripe Billing
2. R$1,00 por pedido entregue (platform_fee_amount = 100 centavos)
3. R$0,75 por pedido antecipado (taxa de antecipação de repasse)

=============================================================
MODELO DE PAGAMENTO — NAO ALTERAR
=============================================================

Gateway de pedidos: Pagar.me (split nativo brasileiro)
Gateway de assinaturas: Stripe Billing (cobranças mensais dos lojistas)

Fluxo financeiro (pedidos via Pagar.me):
  Consumidor paga → Pagar.me distribui via split_rules
  Pagar.me desconta MDR (~2,99% cartão / 0% Pix)
  Stage 1: split entre Mallevo + lojista (delivery fee fica na Mallevo)
  Stage 2: transfer Mallevo → recipient entregador ao alocar courier
  Mallevo retém R$1,00 (platform_fee_amount) de cada pedido

Liquidação Pagar.me (crédito): D+29+2 (ou D+15 com antecipação)
Liquidação Pagar.me (Pix): D+0

Recipients Pagar.me:
  mallevo_recipient_id   → conta Mallevo (recebe comissão e taxa entrega)
  tenant pagarme_recipient_id  → cada lojista
  courier pagarme_recipient_id → cada entregador (recebe após alocação)

Cron de repasses internos: Supabase Scheduled Edge Function
  daily-payouts roda às 03:00 UTC (00:00 Brasília)
  Controle interno de status de repasse; liquidação via Pagar.me

=============================================================
STACK TECNICA — NAO ALTERAR SEM JUSTIFICATIVA
=============================================================

Dashboard lojista (apps/web):
  Next.js 14+ App Router
  TypeScript strict
  Tailwind CSS + shadcn/ui
  Supabase SSR (@supabase/ssr)
  Stripe server-side
  React Hook Form + Zod
  Zustand
  Recharts

App consumidor (apps/mobile-consumer):
  Expo SDK 51
  React Native 0.74
  Expo Router 3
  NativeWind 4
  react-native-webview (checkout Pagar.me via webview)
  Expo Notifications
  Expo Location
  react-native-maps
  Zustand

App entregador (apps/mobile-courier):
  Expo SDK 51
  React Native 0.74
  Expo Router 3
  NativeWind 4
  Expo Location (com background permissions)
  Expo Notifications
  react-native-maps
  Zustand

Backend (Supabase):
  PostgreSQL 15
  Supabase Auth
  Supabase Storage
  Supabase Realtime
  Edge Functions (Deno)
  Scheduled Functions

Monorepo: pnpm workspaces + Turborepo
Hosting: Vercel Pro (região gru1 — São Paulo)

=============================================================
BANCO DE DADOS — TABELAS PRINCIPAIS
=============================================================

Existentes (migration_001 aplicada):
  plans, tenant_subscriptions, categories,
  tenants, stores, products, orders, consumers

Novas (migrations 002-005 pendentes):
  -- migration_002: campos gateways
  tenants.stripe_customer_id, pagarme_recipient_id, pagarme_onboarding_status
  tenant_subscriptions.stripe_subscription_id, billing_status
  orders.pagarme_order_id, pagarme_charge_id, payment_status, platform_fee_amount
  plans.stripe_product_id, stripe_price_id

  -- migration_003: entregador
  couriers (id, user_id, tenant_id, tipo, nome, status, online,
           pagarme_recipient_id, pagarme_onboarding_status)
  delivery_assignments (id, order_id, courier_id, tenant_id,
                       status, valor_entrega, comprovante_url)
  courier_locations (id, courier_id UNIQUE, assignment_id,
                    latitude, longitude, atualizado_em)

  -- migration_004: financeiro
  payouts (id, tipo, tenant_id, courier_id, valor_bruto,
          taxa_antecipacao, valor_liquido, status, antecipado,
          data_referencia, data_prevista, pagarme_transfer_id)
  payout_advance_requests (id, tenant_id, total_pedidos,
                          taxa_total, valor_estimado, status)
  push_tokens (id, user_id, courier_id, token, plataforma, app)

  -- migration_005: estoque
  stock_movements (id, product_id, tenant_id, order_id, tipo,
                  quantidade, quantidade_anterior, quantidade_posterior)

RLS ativo em todas as tabelas.
Helpers: my_tenant_id(), my_consumer_id(), my_courier_id(), is_admin()

=============================================================
EDGE FUNCTIONS EXISTENTES
=============================================================

onboard-tenant        Cria tenant + loja + recipient Pagar.me + Stripe Customer
onboard-courier       Cria recipient Pagar.me + solicita link KYC ao entregador
create-pagarme-order  Cria Order Pagar.me com split_rules (stage 1)
transfer-to-courier   Executa transfer Pagar.me → recipient entregador (stage 2)
create-subscription   Cria Stripe Subscription (Billing) após onboarding
stripe-webhook        Processa eventos Stripe Billing apenas
pagarme-webhook       Processa eventos Pagar.me (pedidos, recipients, transfers)
daily-payouts         Cron: controle interno de status de repasses
request-advance       Lojista solicita antecipação de recebíveis Pagar.me
notify-order-update   Envia push notifications via Expo Push API
courier-pagarme-info  Retorna saldo do recipient Pagar.me do entregador
cleanup-locations     Limpa courier_locations com assignment_id desatualizado

=============================================================
CONVENCOES DE CODIGO — SEGUIR SEMPRE
=============================================================

1. TypeScript strict mode — sem `any` explícito em nenhum arquivo

2. Tipos Supabase em packages/types/supabase.ts
   Gerado com: pnpm types:generate
   Nunca editar manualmente

3. Next.js — Server Components por padrão
   Client Components apenas quando necessário (hooks, interatividade)
   Mutations via Server Actions — sem rotas API para operações simples

4. Supabase — dois clientes distintos:
   createSupabaseServer() → Server Components e Server Actions
   createSupabaseClient() → Client Components (browser)
   Nunca usar createSupabaseServer() em Client Components

5. Pagar.me e Stripe — todas as operações apenas no servidor
   Nunca importar ou usar chaves de gateway em arquivos client-side
   Nunca expor PAGARME_API_KEY ou STRIPE_SECRET_KEY ao cliente

6. Valores monetários — SEMPRE em centavos (integer)
   Nunca usar float para dinheiro
   R$1,00 = 100 centavos
   Converter na entrada: Math.round(parseFloat(valor) * 100)
   Converter na saída: formatarReais(centavos) do @mallevo/lib

7. Multi-tenancy — NUNCA query sem filtro de tenant
   .eq('tenant_id', tenant.id) em todas as queries tenant-scoped
   Confiar no RLS mas sempre filtrar também no código
   Verificar que store pertence ao tenant antes de qualquer operação

8. Nomenclatura:
   Variáveis de domínio em português: pedido, loja, produto, entrega, repasse
   Componentes em PascalCase: PedidoCard, LojaForm
   Arquivos em kebab-case: pedido-card.tsx, loja-form.tsx
   Comentários em português

9. Tratamento de erros:
   Verificar .error em todas as queries Supabase
   Retornar { erro: string } em Server Actions quando falhar
   Nunca lançar exceção silenciosa

10. Segurança:
    Verificar JWT em todas as Edge Functions
    Verificar role admin em todas as operações administrativas
    Verificar assinatura HMAC de webhook Pagar.me (x-hub-signature) antes de processar
    Verificar assinatura de webhook Stripe (stripe-signature) antes de processar
    Usar service_role apenas dentro de Edge Functions

=============================================================
PALETA DE CORES — VERDE MINAS
=============================================================

Verde Profundo  #1A4D3A   primary, headers, botões principais
Verde Médio     #4CAF82   accent, badges positivos, links
Ambar           #F5A623   CTA, alertas, destaques, antecipação
Creme           #FFF8ED   background geral

No Tailwind:
  text-[#1A4D3A]    bg-[#1A4D3A]
  text-[#4CAF82]    bg-[#4CAF82]
  text-[#F5A623]    bg-[#F5A623]
  bg-[#FFF8ED]

=============================================================
ESTRUTURA DE PASTAS — REFERENCIA RAPIDA
=============================================================

apps/
  web/
    app/(auth)/           Login, cadastro, onboarding
    app/(dashboard)/      Área logada do lojista
    app/(admin)/          Painel super admin
    components/ui/        Componentes shadcn
    components/dashboard/ Componentes específicos
    lib/supabase/         server.ts, client.ts, middleware.ts
    lib/stripe/           server.ts (apenas Billing)
    lib/pagarme/          helpers.ts (pagarmePost, pagarmeGet)
    lib/actions/          Server Actions
    lib/validations/      Schemas Zod

  mobile-consumer/
    app/(auth)/           Login consumidor
    app/(tabs)/           Home, Buscar, Pedidos, Perfil
    app/loja/[slug].tsx   Página da loja
    app/checkout.tsx      Checkout + Pagar.me (webview ou redirect)
    app/pedido/[id].tsx   Acompanhamento em tempo real
    components/           LojaCard, ModalProduto, etc.
    store/                useAuthStore, useCartStore, useOrderStore
    hooks/                useLocalizacaoCourier

  mobile-courier/
    app/(auth)/           Login + wizard cadastro
    app/(tabs)/           Entregas, Ativa, Ganhos, Perfil
    components/           EntregaDisponivelCard, etc.
    store/                useAuthStore, useEntregaStore, useLocalizacaoStore
    hooks/                useLocalizacaoEntrega

packages/
  types/
    supabase.ts           Gerado automaticamente
    domain.ts             OrderStatus, PaymentStatus, Endereco, etc.
  lib/
    money.ts              formatarReais, reaisParaCentavos, calcularTaxaAntecipacao
    constants.ts          PLATFORM_FEE_CENTAVOS=100, TAXA_ANTECIPACAO_CENTAVOS=75
    date.ts               Helpers de data no fuso BR

supabase/
  migrations/             001 aplicada, 002-005 pendentes
  functions/              Edge Functions Deno

=============================================================
VARIAVEIS DE AMBIENTE NECESSARIAS
=============================================================

apps/web/.env.local:
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  SUPABASE_PROJECT_ID
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  APP_URL

apps/mobile-consumer/.env.local:
  EXPO_PUBLIC_SUPABASE_URL
  EXPO_PUBLIC_SUPABASE_ANON_KEY
  EXPO_PUBLIC_APP_URL
  EXPO_PUBLIC_PROJECT_ID

apps/mobile-courier/.env.local:
  EXPO_PUBLIC_SUPABASE_URL
  EXPO_PUBLIC_SUPABASE_ANON_KEY
  EXPO_PUBLIC_APP_URL
  EXPO_PUBLIC_PROJECT_ID

Supabase Edge Functions secrets:
  PAGARME_API_KEY
  PAGARME_WEBHOOK_SECRET
  PAGARME_RECIPIENT_ID_MALLEVO
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  APP_URL

=============================================================
FLUXO OBRIGATORIO ANTES DE CADA TAREFA
=============================================================

1. Ler os arquivos relevantes antes de editar qualquer coisa
   Nunca assumir o conteúdo de um arquivo — sempre verificar

2. Escrever o tipo ou interface antes da lógica de negócio
   Se o tipo já existe em packages/types, usar ele

3. Implementar a Server Action ou Edge Function antes do componente UI
   O dado flui do servidor para o cliente, nunca o contrário

4. Conectar a UI à lógica já implementada

5. Adicionar tratamento de erro e estados de loading

6. Verificar se o RLS cobre a operação para todos os atores relevantes

7. Para operações Pagar.me:
   Verificar se pagarme_recipient_id existe antes de prosseguir
   Verificar se pagarme_onboarding_status = 'active' antes de split/transfer
   Valores sempre em centavos (integer)
   Autenticar via HTTP Basic: base64('ak_xxx:') como Authorization header

8. Para operações de localização:
   Verificar assignment_id antes de transmitir
   Limpar assignment_id ao finalizar entrega

=============================================================
TAREFA ATUAL
=============================================================

[SUBSTITUA ESTA SECAO PELO QUE VOCE QUER FAZER]

Exemplos:

"Fase 0.2 — Aplicar a migration_002 com os campos Pagar.me
 no banco. Arquivo de referência: 04 — Migrations SQL"

"Fase 1 — Implementar o wizard de onboarding do lojista.
 Arquivos de referência: 10 — Auth e Onboarding do Lojista"

"Fase 2.4 — Implementar a gestão de pedidos em tempo real
 no dashboard. Arquivo de referência: 12 — Dashboard Pedidos"

"Fase 3 — Implementar o fluxo de checkout com Pagar.me
 no app do consumidor.
 Arquivo de referência: 17 — Consumer App Carrinho e Checkout Pagar.me"

"Fase 4 — Implementar o app do entregador: tela de entregas
 disponíveis e entrega ativa.
 Arquivo de referência: 20 — Entregador App Core"

"Bug: a tela de ganhos do entregador não está mostrando o
 saldo. Verificar a Edge Function courier-pagarme-info
 e o componente CardSaldoPagarme."
=============================================================
```

-----

## COMO MONTAR O CONTEXTO DE CADA SESSAO

Para cada sessão com o Claude Code, o contexto ideal é:

```
[PROMPT MESTRE acima]
+
[Conteúdo do arquivo da fase específica do arquivo 29]
+
[Arquivos relevantes já existentes no projeto, se pertinente]
```

### Exemplo de sessão para o fluxo de pedidos

```
[Prompt Mestre completo]

Contexto adicional desta sessão:
[Cole o conteúdo do arquivo 12 — Dashboard Gestão de Pedidos]

Tarefa: Implementar o PainelPedidosRealtime conforme documentado.
O arquivo lib/actions/pedidos.ts já existe com as Server Actions.
Falta criar os componentes: PainelPedidosRealtime, PedidoCard,
FiltroPedidos e ModalAtribuirEntregador.
```

-----

## PERGUNTAS QUE O CLAUDE CODE PODE FAZER

Se o Claude Code pedir informações que não estão no prompt,
estas são as respostas padrão:

**“Qual é o nome do projeto Supabase?”**
Resposta: Usar o PROJECT_ID nas variáveis de ambiente.

**“Devo criar um novo componente ou editar um existente?”**
Resposta: Verificar a estrutura de pastas documentada no arquivo 08.
Se o componente já está listado, editar. Se não está, criar.

**“Como devo nomear este arquivo?”**
Resposta: Componentes em PascalCase (`PedidoCard.tsx`), arquivos
de lógica em kebab-case (`pedido-card.tsx` ou `pedidos.ts`).
Sempre em português quando for nome de domínio.

**“Devo usar Server Component ou Client Component?”**
Resposta: Server Component por padrão. Client Component apenas
quando precisar de: useState, useEffect, event handlers, hooks
de biblioteca (useStripe, etc.), ou interatividade do usuário.

**“Devo criar uma rota API ou usar Server Action?”**
Resposta: Server Action para mutações simples. Rota API apenas
para webhooks externos (Stripe) ou endpoints que precisam de
streaming/SSE.

**“Qual biblioteca usar para X?”**
Resposta: Consultar a lista de dependências no arquivo 02.
Não adicionar novas dependências sem necessidade clara.

-----

## DICAS DE USO DO CLAUDE CODE

### Dar contexto de arquivo existente

Antes de pedir para editar um arquivo, cole o conteúdo atual:

```
Aqui está o conteúdo atual de lib/actions/pedidos.ts:
[conteúdo do arquivo]

Adicione a função getPedidosDoMes seguindo o mesmo padrão.
```

### Pedir revisão antes de aplicar

```
Antes de escrever o código, descreva o que você vai fazer
e liste os arquivos que serão criados ou modificados.
```

### Confirmar convenções

```
Confirme antes de começar: você vai usar centavos para valores
monetários, verificar o tenant_id em todas as queries e usar
Server Components por padrão, certo?
```

### Reportar um bug

```
Bug encontrado: [descrição do comportamento]
Arquivo: [caminho do arquivo]
Erro no console: [mensagem de erro]
O que deveria acontecer: [comportamento esperado]
```

-----

*Arquivo 28 de 29 — Índice Mestre disponível no arquivo 00*
*Próximo: 29 — Prompts por Fase*
