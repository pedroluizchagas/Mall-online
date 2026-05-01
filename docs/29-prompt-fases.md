# 29 — Prompts por Fase

### Plataforma Delivery Divinópolis

*Versão 1.0 — 23/03/2026*

-----

## COMO USAR

Cada prompt abaixo é específico para uma fase do desenvolvimento.
Para usar, combine sempre com o Prompt Mestre do arquivo 28:

```
[Cole o Prompt Mestre do arquivo 28]

---

[Cole o prompt específico da fase abaixo]
```

Os prompts já incluem os critérios de aceite — o Claude Code
saberá quando a tarefa está concluída.

-----

## GRUPO 1 — FUNDACAO

-----

### PROMPT — Fase 0.1: Tipos TypeScript

```
Tarefa: Gerar os tipos TypeScript do banco Supabase e configurar
os aliases no monorepo.

Passos:
1. Executar: pnpm types:generate
   (equivale a: supabase gen types typescript --project-id $SUPABASE_PROJECT_ID
   > packages/types/src/supabase.ts)

2. Verificar que packages/types/src/supabase.ts foi gerado corretamente.
   Deve conter as interfaces de todas as tabelas: plans, tenants,
   tenant_subscriptions, stores, products, categories, orders,
   order_items, consumers.

3. Verificar o arquivo packages/types/src/domain.ts.
   Se não existir, criar com os tipos de domínio conforme o
   arquivo 08 da documentação (OrderStatus, PaymentStatus,
   BillingStatus, CourierStatus, PayoutStatus, Endereco,
   ItemCarrinho, HorariosFuncionamento).

4. Verificar que packages/types/index.ts re-exporta tudo.

5. Verificar que o alias @mallora/types está resolvendo corretamente
   em apps/web/tsconfig.json.

Critério de aceite:
- import { type Database } from '@mallora/types' funciona em apps/web
- import { type OrderStatus } from '@mallora/types' funciona
- Nenhum erro TypeScript ao rodar pnpm build em apps/web
```

-----

### PROMPT — Fase 0.2: Migrations Pagar.me e Entregador

```
Tarefa: Aplicar as migrations 002, 003 e 004 no banco Supabase
local para adicionar os campos Pagar.me, o módulo de entregadores
e o módulo financeiro.

Referência: arquivo 04 — Migrations SQL

Passos:
1. Criar o arquivo supabase/migrations/20240102000000_migration_002_gateway_fields.sql
   com o conteúdo da migration_002 do arquivo 04.

2. Criar supabase/migrations/20240103000000_migration_003_couriers.sql
   com o conteúdo da migration_003.

3. Criar supabase/migrations/20240104000000_migration_004_payouts.sql
   com o conteúdo da migration_004.

4. Executar: supabase db push

5. Verificar com: supabase migration list
   Todas as migrations devem aparecer como "applied".

6. Regenerar os tipos TypeScript:
   pnpm types:generate

Critério de aceite:
- supabase migration list mostra migrations 001-004 como applied
- A tabela couriers existe no banco com todos os campos
- A tabela courier_locations existe com UNIQUE em courier_id
- A tabela payouts existe com constraint de owner
- pnpm types:generate gera tipos para as novas tabelas sem erro
```

-----

### PROMPT — Fase 0.3: Edge Function onboard-tenant

```
Tarefa: Criar e deployar a Edge Function onboard-tenant.

Referência: arquivo 07 — Edge Functions de Pagamento
            arquivo 09 — Variáveis de Ambiente

Passos:
1. Criar o arquivo supabase/functions/helpers/auth.ts com as
   funções getSupabaseAdmin, getAuthenticatedUser e corsHeaders.

2. Criar supabase/functions/onboard-tenant/index.ts conforme
   o arquivo 07.

3. Configurar os secrets necessários:
   supabase secrets set PAGARME_API_KEY=ak_test_xxx
   supabase secrets set PAGARME_RECIPIENT_ID_MALLORA=re_xxx
   supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx
   supabase secrets set APP_URL=http://localhost:3000

4. Testar localmente:
   supabase functions serve onboard-tenant

5. Testar com curl:
   curl -X POST http://localhost:54321/functions/v1/onboard-tenant \
     -H "Authorization: Bearer TOKEN_DO_USUARIO" \
     -H "Content-Type: application/json" \
     -d '{"nome_responsavel":"Teste","email":"teste@teste.com",
          "nome_loja":"Loja Teste","plan_id":"UUID_DO_PLANO"}'

Critério de aceite:
- Função responde sem erro 500
- Registro criado em tenants com pagarme_recipient_id preenchido
- Registro criado em tenants com stripe_customer_id preenchido (Billing)
- Registro criado em tenant_subscriptions com billing_status = 'trial'
- Registro criado em stores
- Resposta contém tenant_id, store_id e pagarme_onboarding_status
```

-----

## GRUPO 2 — BANCO E SEGURANCA

-----

### PROMPT — Fase 0.4: Policies RLS

```
Tarefa: Criar todas as políticas RLS conforme o arquivo 05.

Referência: arquivo 05 — RLS, Policies e Segurança

Passos:
1. Criar um novo arquivo de migration:
   supabase/migrations/20240106000000_migration_006_rls_policies.sql

2. Adicionar no arquivo os helpers is_admin() e confirmar que
   my_tenant_id(), my_consumer_id() e my_courier_id() existem.

3. Adicionar as policies para todas as tabelas conforme o arquivo 05:
   plans, tenants, tenant_subscriptions, stores, categories,
   products, consumers, couriers, orders, order_items,
   delivery_assignments, courier_locations, payouts,
   payout_advance_requests, push_tokens, stock_movements

4. Aplicar: supabase db push

5. Testar o isolamento básico:
   - Criar dois usuários de teste com role 'tenant'
   - Verificar que cada um vê apenas seus dados

Critério de aceite:
- Tenant A não consegue ver stores do Tenant B
- Entregador não vê courier_locations de outros entregadores
- Consumidor não vê pedidos de outros consumidores
- Admin consegue ver tudo
```

-----

## GRUPO 3 — PAGAMENTOS

-----

### PROMPT — Fase 3.1: Edge Functions de Pagamento

```
Tarefa: Criar as Edge Functions create-pagarme-order,
transfer-to-courier, create-subscription, stripe-webhook,
pagarme-webhook e daily-payouts.

Referência: arquivo 07 — Edge Functions de Pagamento

Criar nesta ordem (cada uma depende da anterior):
1. supabase/functions/helpers/pagarme.ts (pagarmePost, pagarmeGet)
2. supabase/functions/create-pagarme-order/index.ts
3. supabase/functions/transfer-to-courier/index.ts
4. supabase/functions/create-subscription/index.ts
5. supabase/functions/pagarme-webhook/index.ts
6. supabase/functions/stripe-webhook/index.ts
7. supabase/functions/daily-payouts/index.ts
8. supabase/functions/request-advance/index.ts

Para testar o pagarme-webhook localmente:
  curl -X POST http://localhost:54321/functions/v1/pagarme-webhook \
    -H "Content-Type: application/json" \
    -H "x-hub-signature: sha256=<hmac>" \
    -d '{"type":"order.paid","data":{"id":"or_xxx","status":"paid"}}'

Para testar o stripe-webhook localmente (Billing):
  stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
  stripe trigger customer.subscription.updated

Para testar o daily-payouts:
  supabase functions invoke daily-payouts --no-verify-jwt

Critério de aceite:
- create-pagarme-order cria Order Pagar.me com split_rules corretas
- pagarme-webhook atualiza payment_status ao receber order.paid
- stripe-webhook atualiza billing_status ao receber subscription events
- transfer-to-courier executa transfer após courier ser alocado
- daily-payouts executa sem erro com banco vazio (0 repasses processados)
- request-advance registra solicitação de antecipação corretamente
```

-----

## GRUPO 4 — DASHBOARD DO LOJISTA

-----

### PROMPT — Fase 1: Auth e Onboarding

```
Tarefa: Implementar o fluxo completo de autenticação e
onboarding do lojista no dashboard web.

Referência: arquivo 10 — Auth e Onboarding do Lojista

Criar nesta ordem:
1. lib/supabase/server.ts e lib/supabase/client.ts
2. middleware.ts na raiz de apps/web
3. lib/actions/auth.ts com as Server Actions login, cadastro, logout
4. lib/validations/onboarding.ts com schemas Zod
5. app/(auth)/entrar/page.tsx
6. app/(auth)/cadastro/page.tsx
7. app/(auth)/onboarding/page.tsx (wizard com 4 etapas)
8. app/(auth)/onboarding/stripe/callback/page.tsx
9. app/(auth)/onboarding/stripe/retry/page.tsx
10. app/(dashboard)/layout.tsx com verificação de assinatura

Critério de aceite:
- Usuário consegue criar conta e chegar no wizard
- Wizard valida campos obrigatórios em cada etapa
- Etapa 4 chama onboard-tenant e cria recipient Pagar.me
- Callback faz polling até pagarme_onboarding_status = 'active'
- Dashboard bloqueia acesso com billing_status = 'cancelada'
- Banner de aviso aparece com billing_status = 'em_atraso'
```

-----

### PROMPT — Fase 2.1: Dashboard — Produtos e Categorias

```
Tarefa: Implementar o módulo de gestão de produtos e categorias
no dashboard do lojista.

Referência: arquivo 11 — Dashboard Produtos e Categorias

Criar:
1. lib/actions/produtos.ts com todas as Server Actions
2. lib/actions/categorias.ts com todas as Server Actions
3. app/(dashboard)/produtos/page.tsx (listagem)
4. app/(dashboard)/produtos/novo/page.tsx (formulário de criação)
5. app/(dashboard)/produtos/[id]/page.tsx (formulário de edição)
6. app/(dashboard)/categorias/page.tsx
7. components/dashboard/lista-produtos.tsx
8. components/dashboard/produto-form.tsx
9. components/dashboard/uso-plano-barra.tsx

Antes de começar: criar o bucket product-images no Supabase Storage
com as policies de upload e leitura pública conforme o arquivo 11.

Critério de aceite:
- Lojista consegue criar produto com foto
- Toggle de disponibilidade funciona sem recarregar a página
- Barra de uso mostra X/Y produtos com cor conforme percentual
- Limite do plano bloqueia criação com mensagem de upgrade
- Categorias globais aparecem como somente leitura
- Excluir produto remove também a foto do Storage
```

-----

### PROMPT — Fase 2.2: Dashboard — Gestão de Pedidos

```
Tarefa: Implementar o módulo de gestão de pedidos com
atualização em tempo real via Supabase Realtime.

Referência: arquivo 12 — Dashboard Gestão de Pedidos

Criar:
1. lib/actions/pedidos.ts com Server Actions
2. app/(dashboard)/pedidos/page.tsx (Server Component)
3. app/(dashboard)/pedidos/[id]/page.tsx (detalhes)
4. components/dashboard/painel-pedidos-realtime.tsx (Client Component)
5. components/dashboard/pedido-card.tsx
6. components/dashboard/filtro-pedidos.tsx
7. components/dashboard/modal-atribuir-entregador.tsx
8. components/dashboard/mapa-entregador-mini.tsx

Atenção: Habilitar Realtime para a tabela orders no Supabase Dashboard
(Database → Replication → orders) antes de testar.

Critério de aceite:
- Novo pedido aparece no dashboard sem recarregar a página
- Som de notificação toca quando novo pedido chega
- Transições de status funcionam e são validadas no servidor
- Modal de entregador carrega apenas entregadores disponíveis
- Mini-mapa aparece apenas quando status = 'saiu_para_entrega'
- Pedido com payment_status offline não atualiza para 'pago'
```

-----

### PROMPT — Fase 2.3: Dashboard — Financeiro e Assinatura

```
Tarefa: Implementar os módulos financeiro e de assinatura
no dashboard do lojista.

Referência: arquivo 13 — Dashboard Financeiro e Assinatura

Criar:
1. lib/actions/financeiro.ts com todas as Server Actions
2. lib/actions/assinatura.ts com todas as Server Actions
3. app/(dashboard)/financeiro/page.tsx
4. app/(dashboard)/configuracoes/assinatura/page.tsx
5. components/dashboard/kpis-financeiros.tsx
6. components/dashboard/grafico-faturamento.tsx (Recharts)
7. components/dashboard/card-saldo-pagarme.tsx
8. components/dashboard/card-antecipacao.tsx
9. components/dashboard/lista-repasses.tsx

Critério de aceite:
- KPIs exibem valores do período selecionado
- Gráfico renderiza sem erro com dados vazios
- Card de antecipação mostra cálculo correto (40 pedidos = -R$30,00)
- Botão de antecipação tem confirmação em dois passos
- Saldo Pagar.me carregado via Edge Function (nunca direto do cliente)
- Link para Stripe Customer Portal funciona (Billing)
- Histórico de faturas exibe com link para PDF
```

-----

### PROMPT — Fase 2.4: Dashboard — Configurações da Loja

```
Tarefa: Implementar a página de configurações da loja
com navegação por abas.

Referência: arquivo 14 — Dashboard Configurações da Loja

Criar:
1. lib/actions/lojas.ts com todas as Server Actions
2. app/(dashboard)/configuracoes/page.tsx
3. components/dashboard/configuracoes-abas.tsx
4. components/dashboard/config/aba-geral.tsx
5. components/dashboard/config/aba-horarios.tsx
6. components/dashboard/config/aba-entrega.tsx
7. components/dashboard/config/aba-pagamentos.tsx
8. components/dashboard/config/aba-pagarme.tsx

Critério de aceite:
- Upload de logo e banner com preview antes de salvar
- Grade de horários com toggle por dia e inputs de time
- Seleção de entregadores próprios vs pool da plataforma
- Checkboxes de métodos de pagamento persistem corretamente
- Aba Pagar.me mostra status do recipient e link para completar KYC se pendente
- Cidade padrão pré-preenchida como Divinópolis
```

-----

## GRUPO 5 — APP DO CONSUMIDOR

-----

### PROMPT — Fase 3.1: Consumer App — Auth e Estrutura

```
Tarefa: Configurar o app do consumidor com autenticação
via Magic Link e estrutura de navegação.

Referência: arquivo 15 — Consumer App Auth e Estrutura

Criar:
1. lib/supabase.ts com cliente AsyncStorage
2. app/_layout.tsx com providers e auth listener
4. app/(auth)/_layout.tsx com redirect se autenticado
5. app/(tabs)/_layout.tsx com tab bar
6. app/(auth)/boas-vindas.tsx com três slides
7. app/(auth)/entrar.tsx com Magic Link
8. app/(auth)/verificar.tsx com countdown e polling
9. store/useAuthStore.ts
10. store/useCartStore.ts com lógica de troca de loja
11. store/useOrderStore.ts
12. components/Botao.tsx e components/Skeleton.tsx

Configurar no Supabase Dashboard:
  Authentication → URL Configuration
  → Adicionar: mallora-consumer://auth/callback

Critério de aceite:
- Magic Link enviado ao digitar email válido
- Tela de verificação faz countdown de 60s
- Usuário redirecionado para tabs após confirmar link
- Logout limpa os três stores
- useCartStore rejeita itens de loja diferente com confirmação
```

-----

### PROMPT — Fase 3.2: Consumer App — Home e Exploração

```
Tarefa: Implementar as telas de Home, Busca e Página da Loja
no app do consumidor.

Referência: arquivo 16 — Consumer App Home e Exploração

Criar:
1. app/(tabs)/index.tsx com Home completa
2. app/(tabs)/buscar.tsx com busca global
3. app/loja/[slug].tsx com cardápio agrupado
4. components/BannerCarousel.tsx com auto-play
5. components/CategoriaChip.tsx com estado ativo
6. components/LojaCard.tsx
7. components/ModalProduto.tsx com quantidade e observações

Critério de aceite:
- Home carrega com Skeleton enquanto busca dados
- Filtro por categoria filtra lojas sem recarregar
- Busca com debounce de 400ms retorna lojas e produtos
- Página da loja agrupa produtos por categoria na ordem correta
- Header da loja aparece ao rolar (Animated.interpolate)
- Modal de produto confirma antes de trocar de loja
- Botão flutuante do carrinho aparece ao adicionar item
```

-----

### PROMPT — Fase 3.3: Consumer App — Checkout Pagar.me

```
Tarefa: Implementar o fluxo completo de carrinho e checkout
com Pagar.me (cartão tokenizado ou Pix).

Referência: arquivo 17 — Consumer App Carrinho e Checkout Pagar.me

Criar:
1. app/checkout.tsx com fluxo completo
2. components/ItemCarrinhoCard.tsx com controle de quantidade
3. components/SeletorEndereco.tsx com busca de CEP via ViaCEP
4. components/SeletorPagamento.tsx mostrando apenas métodos aceitos
5. components/CheckoutCartao.tsx com tokenização via Pagar.me.js
6. components/CheckoutPix.tsx com QR code e polling de status

Para pagamentos offline (dinheiro/maquininha), criar pedido diretamente no banco.
Para pagamentos online, chamar create-pagarme-order e processar resposta.

Critério de aceite:
- Carrinho exibe itens com controle de quantidade
- Endereço buscado por CEP preenche automaticamente os campos
- Seletor de pagamento mostra apenas métodos aceitos pela loja
- Pix exibe QR code e faz polling até order.paid
- Cartão tokenizado antes de enviar ao servidor (nunca dados brutos)
- Após confirmação, navega para tela de acompanhamento
- platform_fee_amount = 100 em todos os pedidos criados
```

-----

### PROMPT — Fase 3.4: Consumer App — Pedido e Perfil

```
Tarefa: Implementar acompanhamento em tempo real do pedido
e tela de perfil do consumidor.

Referência: arquivo 18 — Consumer App Pedido e Perfil

Criar:
1. app/pedido/[id].tsx com timeline e mapa
2. app/(tabs)/pedidos.tsx com histórico
3. app/(tabs)/perfil.tsx com menu de opções
4. components/MapaEntregador.tsx com Realtime
5. components/EditarPerfil.tsx inline
6. components/GerenciarEnderecos.tsx com remoção confirmada
7. hooks/useLocalizacaoCourier.ts

Habilitar Realtime para courier_locations no Supabase Dashboard.

Critério de aceite:
- Timeline de status atualiza sem recarregar
- Mapa aparece apenas com status 'saiu_para_entrega'
- Localização do entregador atualiza em tempo real
- Mapa some ao finalizar a entrega (assignment_id limpo)
- Botão WhatsApp abre com número formatado corretamente
- Histórico separa pedidos ativos do histórico
- Logout limpa os três stores e redireciona para auth
```

-----

## GRUPO 6 — APP DO ENTREGADOR

-----

### PROMPT — Fase 4.1: Courier App — Auth e Cadastro

```
Tarefa: Configurar o app do entregador com autenticação
e wizard de cadastro em 3 etapas.

Referência: arquivo 19 — Entregador Modelo Auth e Cadastro

Criar:
1. lib/supabase.ts e store/useAuthStore.ts
2. store/useCadastroStore.ts temporário para o wizard
3. app/_layout.tsx com carregamento do courier
4. app/(auth)/_layout.tsx com redirecionamento por status
5. app/(auth)/entrar.tsx
6. app/(auth)/verificar.tsx
7. app/(auth)/cadastro/index.tsx (dados pessoais)
8. app/(auth)/cadastro/veiculo.tsx (tipo de veículo)
9. app/(auth)/cadastro/documentos.tsx (CNH e foto)
10. app/aguardando-aprovacao.tsx com polling de 15s
11. app/pagarme-onboarding.tsx chamando onboard-courier

Criar bucket courier-docs como privado no Supabase Storage.
Configurar URL de callback mallora-courier://auth/callback.

Critério de aceite:
- Wizard navega corretamente entre as 3 etapas
- Foto de perfil selecionada via expo-image-picker
- Cadastro cria registro em couriers com status 'pendente'
- Tela de aguardando detecta aprovação e redireciona em 15s
- Onboarding Pagar.me abre link KYC no navegador externo via Linking.openURL
- Botão "verificar status" detecta pagarme_onboarding_status = 'active'
```

-----

### PROMPT — Fase 4.2: Courier App — Entregas e Ativa

```
Tarefa: Implementar as telas de entregas disponíveis e
entrega ativa com rastreamento GPS.

Referência: arquivo 20 — Entregador App Core Entregas
            arquivo 21 — Entregador Localização em Tempo Real

Criar:
1. app/(tabs)/_layout.tsx com verificações de status
2. app/(tabs)/index.tsx com toggle online/offline e lista
3. app/(tabs)/ativa.tsx com mapa e fluxo de entrega
4. components/EntregaDisponivelCard.tsx com rota visual
5. components/ModalConfirmacaoEntrega.tsx (código ou foto)
6. components/HistoricoEntregasDia.tsx
7. hooks/useLocalizacaoEntrega.ts para transmissão GPS
8. store/useEntregaStore.ts e store/useLocalizacaoStore.ts

Habilitar Realtime para delivery_assignments e courier_locations.

Critério de aceite:
- Toggle online atualiza couriers.online no banco
- Entrega disponível aparece via Realtime ao ser atribuída
- Aceitar inicia transmissão de GPS (watchPositionAsync)
- UPSERT em courier_locations a cada 5s com assignment_id
- Confirmar coleta muda status para 'coletada'
- Confirmar entrega com código valida contra banco
- Após entrega: GPS para, assignment_id limpo, store limpo
```

-----

### PROMPT — Fase 4.3: Courier App — Ganhos e Perfil

```
Tarefa: Implementar as telas de ganhos financeiros e perfil
do entregador.

Referência: arquivo 22 — Entregador Financeiro e Ganhos

Criar:
1. supabase/functions/courier-pagarme-info/index.ts
2. app/(tabs)/ganhos.tsx com KPIs por período
3. app/(tabs)/perfil.tsx com status Pagar.me e logout
4. components/CardSaldoPagarme.tsx (mobile-courier)
5. components/EntregaHistoricoCard.tsx
6. Seção de histórico de repasses na tela de ganhos

Critério de aceite:
- Seletor de período filtra dados corretamente (hoje/semana/mês)
- Saldo Pagar.me carregado via Edge Function (nunca direto do cliente)
- Status do recipient Pagar.me exibido no perfil
- Logout garante courier.online = false antes de deslogar
- KPIs exibem ganhos brutos, entregas concluídas e média
- Repasses com status 'concluido' aparecem como 'Recebido'
```

-----

## GRUPO 7 — FUNCIONALIDADES TRANSVERSAIS

-----

### PROMPT — Fase 5: Push Notifications

```
Tarefa: Implementar o sistema de push notifications
para os três apps.

Referência: arquivo 23 — Push Notifications

Criar:
1. lib/notificacoes.ts em mobile-consumer e mobile-courier
   (registrarPushToken, desativarPushToken, useNotificacaoListener)
2. supabase/functions/notify-order-update/index.ts
3. Adicionar registrarPushToken no _layout.tsx de cada app
4. Adicionar useNotificacaoListener no _layout.tsx de cada app

Configurar os 5 webhooks no Supabase Dashboard:
  orders INSERT, orders UPDATE,
  delivery_assignments INSERT, delivery_assignments UPDATE,
  payouts UPDATE

Configurar WEBHOOK_SECRET nos secrets da Edge Function.

Critério de aceite:
- Token registrado no banco após autenticação
- Notificação recebida em background quando pedido muda de status
- Toque na notificação navega para a tela correta
- Tokens inválidos são desativados automaticamente
- Entregador recebe push quando nova entrega é atribuída
- Entregador recebe push quando repasse é processado
```

-----

### PROMPT — Fase 6: Módulo de Estoque

```
Tarefa: Implementar o módulo de controle de estoque
para lojistas com planos superiores.

Referência: arquivo 24 — Módulo de Estoque

Criar:
1. Migration 005 com stock_movements, trigger de decremento
   e trigger de disponibilidade automática
2. lib/actions/estoque.ts com todas as Server Actions
3. components/dashboard/painel-estoque.tsx
4. components/dashboard/barra-estoque.tsx
5. components/dashboard/modal-movimentacao.tsx
6. app/(dashboard)/estoque/[id]/page.tsx (histórico)
7. components/dashboard/tela-upgrade-estoque.tsx

Critério de aceite:
- Produto zerado é marcado como indisponível automaticamente
- Produto com estoque reposto volta a ficar disponível
- Entrada de estoque cria movimentação e atualiza quantidade
- Ajuste negativo não cria estoque negativo (Math.max(0, ...))
- Plano sem tem_estoque = true mostra tela de upgrade
- Histórico exibe delta com sinal correto (+/-)
```

-----

## GRUPO 8 — ADMIN E DEPLOY

-----

### PROMPT — Fase 7: Painel Super Admin

```
Tarefa: Implementar o painel super admin para gestão
da plataforma.

Referência: arquivo 25 — Painel Super Admin

Criar:
1. app/(admin)/layout.tsx com sidebar verde e verificação de role
2. lib/actions/admin.ts com todas as Server Actions
3. app/(admin)/admin/page.tsx (visão geral com métricas)
4. app/(admin)/admin/lojistas/page.tsx
5. components/admin/tabela-tenants.tsx
6. app/(admin)/admin/entregadores/page.tsx
7. components/admin/tabela-entregadores.tsx
8. app/(admin)/admin/planos/page.tsx com formulário
9. app/(admin)/admin/financeiro/page.tsx com conciliação

Criar usuário admin no Supabase:
  Authentication → Users → [usuário] → Edit
  user_metadata: { "role": "admin" }

Critério de aceite:
- Apenas usuário com role = 'admin' acessa /admin/*
- Métricas globais carregam com Promise.all (paralelo)
- Lojista pode ser suspenso e reativado
- Aprovação de entregador preenche aprovado_em e aprovado_por
- Criar plano sincroniza com Stripe Products e Prices
- Conciliação financeira filtra por mês corretamente
```

-----

### PROMPT — Fase 8: Deploy em Produção

```
Tarefa: Configurar e executar o deploy completo em produção.

Referência: arquivo 27 — Deploy e Infraestrutura

Executar nesta ordem:

SUPABASE:
1. Fazer upgrade para Pro no Supabase Dashboard
2. Habilitar Realtime para orders, courier_locations, delivery_assignments
3. Configurar Scheduled Function daily-payouts (0 3 * * *)
4. Aplicar todas as migrations: supabase db push
5. Deployar todas as Edge Functions: supabase functions deploy
6. Configurar secrets de produção (chaves sk_live_)
7. Criar backup manual antes de abrir para usuários

PAGARME:
8. Verificar conta Pagar.me para produção (KYC da Mallora concluído)
9. Criar recipient da Mallora e confirmar status active
10. Registrar webhook Pagar.me de produção com todos os eventos
11. Copiar PAGARME_API_KEY, PAGARME_WEBHOOK_SECRET e PAGARME_RECIPIENT_ID_MALLORA para secrets
12. Configurar antifraude (Clearsale ou Konduto)

STRIPE BILLING:
13. Verificar conta Stripe para produção
14. Registrar webhook Stripe de produção (apenas eventos Billing)
15. Copiar STRIPE_WEBHOOK_SECRET para secrets do Supabase
16. Ativar Customer Portal
17. Configurar regras básicas do Radar

VERCEL:
18. Configurar variáveis de ambiente de produção (pk_live_, sk_live_)
19. Adicionar domínio customizado
20. Verificar que APP_URL aponta para o domínio de produção

CONTEUDO:
21. Criar usuário admin com role = 'admin'
22. Inserir categorias globais na tabela categories
23. Inserir planos na tabela plans com stripe_product_id preenchido

VALIDACAO:
24. Fazer um pedido completo em produção com cartão Pagar.me de R$1,00
25. Verificar que webhook order.paid foi recebido nos logs do Supabase
26. Verificar que payment_status foi atualizado para 'pago'
27. Invocar daily-payouts manualmente e verificar logs

Critério de aceite:
- Checklist completo do arquivo 27 executado sem pendências
- Pedido de teste pago via Pagar.me e status atualizado corretamente
- Nenhum erro nos logs do Vercel, Supabase, Pagar.me e Stripe após 1 hora
```

-----

## PROMPTS DE CORRECAO DE BUGS

-----

### PROMPT — Bug: Checkout Pagar.me não processa pagamento

```
Bug: O checkout Pagar.me não está processando o pagamento no app do consumidor.

Verificar nesta ordem:
1. PAGARME_API_KEY está configurada nos secrets das Edge Functions?
2. O token do cartão está sendo gerado via Pagar.me.js antes do envio?
   (nunca enviar dados brutos do cartão ao servidor)
3. A Edge Function create-pagarme-order retornou erro? Verificar logs no Supabase.
4. O campo split_rules está correto? Verificar se todos os recipient_id existem.
5. Para Pix: o QR code está sendo exibido? O polling de status está rodando?
6. Verificar webhook pagarme-webhook: o evento order.paid foi recebido?
7. Verificar a assinatura HMAC do webhook (x-hub-signature header).

Arquivo de referência: 17 — Consumer App Carrinho e Checkout Pagar.me
```

-----

### PROMPT — Bug: Realtime não atualiza pedidos

```
Bug: Novos pedidos não aparecem no dashboard sem recarregar a página.

Verificar nesta ordem:
1. Realtime está habilitado para a tabela orders no Supabase?
   (Database → Replication → Tables → orders deve estar marcado)
2. O canal Realtime usa o tenant_id correto no filtro?
   filter: `tenant_id=eq.${tenant.id}`
3. O método .subscribe() está sendo chamado?
4. O cleanup do useEffect remove o canal corretamente?
   return () => { supabase.removeChannel(canal) }
5. No browser console, há erros de WebSocket?
6. Testar inserindo um pedido diretamente no banco e verificando
   se o evento chega no browser via devtools Network → WS.

Arquivo de referência: 12 — Dashboard Gestão de Pedidos
```

-----

### PROMPT — Bug: Localização não aparece no mapa do consumidor

```
Bug: O mapa do consumidor não mostra a localização do entregador.

Verificar nesta ordem:
1. Realtime está habilitado para courier_locations?
2. assignment_id está preenchido em courier_locations durante a entrega?
   (SELECT * FROM courier_locations WHERE courier_id = 'xxx')
3. A policy RLS de courier_locations permite SELECT ao consumidor?
   Verificar: delivery_assignments.status IN ('aceita', 'coletada')
   e que assignment_id em courier_locations = assignment ativo
4. O hook useLocalizacaoCourier está recebendo o courierId correto?
   (pedido.delivery_assignments[0]?.courier_id)
5. O entregador está transmitindo localização?
   Verificar atualizado_em em courier_locations — deve ser recente.

Arquivo de referência: 21 — Entregador Localização em Tempo Real
```

-----

### PROMPT — Bug: Webhook Stripe não processa

```
Bug: Evento do Stripe não está sendo processado pela Edge Function.

Verificar nesta ordem:
1. O webhook está registrado no Stripe Dashboard com o URL correto?
   URL deve ser: https://[PROJECT_REF].supabase.co/functions/v1/stripe-webhook
2. O STRIPE_WEBHOOK_SECRET nos secrets do Supabase bate com o
   Signing secret mostrado no Stripe Dashboard?
3. Nos logs da Edge Function (Supabase Dashboard → Edge Functions → Logs),
   há algum erro?
4. O evento selecionado no webhook do Stripe inclui o tipo relevante?
5. Para testar localmente:
   stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
   stripe trigger [tipo_do_evento]

Arquivo de referência: 07 — Edge Functions de Pagamento
```

-----

### PROMPT — Bug: Repasse não processado pelo cron

```
Bug: O cron daily-payouts não está processando os repasses.

Verificar nesta ordem:
1. A Scheduled Function está configurada no Supabase?
   Edge Functions → Schedules → daily-payouts deve aparecer
2. Invocar manualmente para testar:
   supabase functions invoke daily-payouts --no-verify-jwt
3. Verificar o retorno — campo 'erros' deve estar vazio
4. Os pedidos têm status = 'entregue' AND payment_status = 'pago'?
5. Os tenants têm pagarme_recipient_id E pagarme_onboarding_status = 'active'?
6. Os couriers autônomos têm pagarme_recipient_id E pagarme_onboarding_status = 'active'?
7. As datas de referência batem? O cron busca pedidos de D-1 (entregadores)
   e D-7 (lojistas) baseado na data de execução.
8. Verificar logs detalhados da Edge Function no Supabase Dashboard.

Arquivo de referência: 07 — Edge Functions de Pagamento (daily-payouts)
```

-----

*Arquivo 29 de 29 — Série completa de documentação*
*Índice Mestre disponível no arquivo 00*

-----

## RESUMO DA SERIE COMPLETA

Todos os 30 arquivos estão disponíveis:

|Faixa|Arquivos     |Conteúdo                                   |
|-----|-------------|-------------------------------------------|
|00   |Índice Mestre|Mapa de navegação                          |
|01-02|Fundação     |Visão de produto e arquitetura             |
|03-05|Banco        |Schema, migrations e RLS                   |
|06-07|Pagamentos   |Stripe Connect e Edge Functions            |
|08-09|Estrutura    |Monorepo e variáveis de ambiente           |
|10-14|Dashboard    |Auth, produtos, pedidos, financeiro, config|
|15-18|Consumer     |Auth, home, checkout, pedido               |
|19-22|Entregador   |Auth, entregas, GPS, ganhos                |
|23-24|Transversais |Notificações e estoque                     |
|25   |Admin        |Painel super admin                         |
|26-27|Qualidade    |Testes e deploy                            |
|28-29|Prompts      |Claude Code — mestre e por fase            |
