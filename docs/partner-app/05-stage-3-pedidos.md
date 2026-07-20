# Stage 3 — Pedidos em Tempo Real (+ aba Início)

> O coração do pilar Gestão: o pedido chega no bolso do lojista com push e
> som, e ele opera o ciclo inteiro sem abrir o navegador. Depende dos Stages
> 1–2. Não depende do Stage 0.

## Fonte da verdade das regras

O comportamento é **o mesmo do Dashboard** — a fonte das regras é
[`apps/web/lib/actions/pedidos.ts`](../../apps/web/lib/actions/pedidos.ts)
(`atualizarStatusPedido`, `atribuirEntregador`, `getPedidos`,
`getPedidoPorId`) e o ciclo de status de `migration_001`:

```
novo → confirmado → em_preparo → aguardando_entregador → saiu_para_entrega → entregue
                                      (cancelado a partir dos estados que o Dashboard permite)
```

O app **replica as queries/mutações** dessas actions via `supabase-js` direto
(mesma RLS). Se alguma transição exigir lógica que só existe dentro do Server
Action, a lógica desce para RPC/Edge Function compartilhada (decisão `01` §4)
— nunca é copiada.

## Aba Pedidos (`(tabs)/pedidos.tsx`)

- **Lista** agrupada por estado operacional (Novos / Em andamento /
  Finalizados hoje), filtrada pela loja ativa. Card: nº curto, itens resumo,
  valor, forma de pagamento, tempo desde criação, badge de status (cores de
  status do design system).
- **Realtime**: subscribe em `orders` (INSERT + UPDATE) — a tabela já está na
  publication (`20260606130000_realtime_orders.sql`). Reconciliar com refetch
  no `AppState` active (mobile perde socket em background).
- **Pedido novo**: som (asset local via `expo-audio`, análogo ao Web Audio do
  Dashboard) + haptics + badge na tab (contagem de `novo`). `usePedidosStore`
  (Zustand) guarda lista + contadores.
- **Filtros**: por status e período (hoje / 7 dias / mês), espelhando os
  filtros do Dashboard.

## Detalhe do pedido (`pedido/[id].tsx`)

- Itens (com variações/modificadores como o Dashboard exibe), dados do
  consumidor, endereço, forma de pagamento, `payment_status`, observações.
- **Ações por status** (botão primário grande, thumb-friendly): as mesmas
  transições permitidas no Dashboard, com confirmação para ações destrutivas
  (cancelar). Update otimista + rollback em erro.
- **Atribuição de entregador**: bottom sheet espelhando `atribuirEntregador`
  — entregador próprio do lojista ou pool da plataforma; grava
  `delivery_assignments` + status como no web. Operações financeiras
  vinculadas (transfer estágio 2) permanecem nas Edge Functions existentes —
  o app apenas dispara o mesmo fluxo que o Dashboard dispara.
- **Mini-mapa** com localização do entregador quando `saiu_para_entrega`:
  subscribe em `courier_locations` (já na publication), mesmo contrato usado
  pelo consumer/Dashboard. Se `react-native-maps` não estiver no app, MVP =
  última posição + "abrir no mapa" (deep link) e o mapa nativo entra como
  melhoria — registrar decisão no RESUMO.

## Aba Início (`(tabs)/index.tsx`)

Resumo do dia da loja ativa (espelha a visão geral `/` do Dashboard, versão
compacta):

- Saudação (`saudacaoPorHorario()` — helper igual ao courier) + seletor de loja.
- Cards: pedidos ativos agora · faturamento de hoje · ticket médio do dia
  (mesmas queries da home do Dashboard — `lib/actions/home.ts` como fonte).
- Fila "pedidos aguardando ação" (top 3, tap → detalhe).
- Atalhos: Publicar conteúdo · Ver relatórios · Minha loja.
- Banner de gate quando aplicável (Stage 2).

## Push notification de pedido novo

- Registrar token com `expo-notifications` na tabela `push_tokens` (já
  existe; reusar o padrão de `apps/mobile-courier/lib/notificacoes.ts`),
  associado ao user do lojista.
- O disparo server-side reusa o pipeline de notificação existente
  (`notify-order-update` / Database Webhook em `orders` — docs `23`). Se o
  pipeline atual não cobrir o ator lojista, **estender a Edge Function
  existente**, não criar outra.
- Tap na notificação → deep link `pedido/[id]` (scheme `mallevo-partner`).
- Foreground: suprimir push e usar som+badge in-app (evitar duplicidade).

## Critérios de aceite

- [ ] Pedido criado pelo consumer aparece na lista **sem refresh** (Realtime)
      e toca som + badge.
- [ ] Push chega com app em background/fechado; tap abre o detalhe correto.
- [ ] Todas as transições de status possíveis no Dashboard funcionam no app,
      com os mesmos efeitos no banco (validar campo a campo vs web).
- [ ] Atribuição de entregador (próprio e pool) grava o mesmo estado que o
      Dashboard gravaria.
- [ ] Nenhuma transição/regra existe só no app (diff de regras = zero).
- [ ] Aba Início mostra números consistentes com a home do Dashboard para a
      mesma loja/período.
- [ ] RLS: lojista não lê nem muta pedido de outro tenant (teste negativo).
