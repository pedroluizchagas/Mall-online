# 12 — Prompts de Execução

Prompts profissionais, **auto-contidos e copiáveis**, para o agente executor
implementar o Partner App de ponta a ponta, na ordem correta. Cada prompt é uma
unidade fechada: contexto, leitura obrigatória, escopo, restrições, armadilhas
conhecidas, autoverificação e formato de entrega.

O tech lead entrega **um prompt por vez**. O executor implementa só aquele
stage, commita na branch da feature e devolve o RESUMO. O tech lead valida
contra os critérios de aceite do doc do stage antes de liberar o próximo.

---

## Convenção de branch e sequência

- **Branch única da feature**: `claude/partner-app` (criada a partir de `main`
  pelo tech lead no início do Stage 0). Todos os stages commitam nela; **não**
  mergear em `main` até o marco combinado (mínimo: Stage 3 aprovado para o
  primeiro merge de valor, ou Stage 9 para o programa completo — decisão do
  tech lead, mesmo modelo do storefront).
- **Gate de sequência**: o stage `N` só começa quando o anterior da sua trilha
  foi aprovado pelo tech lead. Trilhas (ver `00-INDEX`): Gestão = 1→2→3→4→5→6;
  Conteúdo = 0 → (1–2) → 7→8→9. O executor confirma no início do prompt que o
  pré-requisito está na branch (typecheck/lint verdes) antes de codar.
- **Commits**: pequenos, descritivos, em PT, escopados ao stage. Rodapé de
  commit conforme política do repo.
- **Stage 9 é o único que toca `apps/mobile-consumer`.**

## Regras globais do executor (valem em todos os prompts)

1. Ler os docs referenciados **antes** de codar — são a fonte da verdade,
   acima de qualquer suposição.
2. Não expandir escopo além do stage. Ambiguidade não resolvida →
   **registrar como pendência no RESUMO, nunca chutar**.
3. Espelhar o que já existe: `apps/mobile-courier` é o gabarito estrutural do
   app; as actions de `apps/web/lib/actions/*` são a fonte das regras de
   gestão; migrations seguem as convenções do repo (nomes, PT,
   `IF NOT EXISTS`, helpers `my_tenant_id()`/`is_admin()`).
4. Nenhuma regra de negócio (gate, limite de plano, transição de status,
   ownership) duplicada no cliente — vive em RLS / triggers / Edge Functions /
   `packages/lib`. Se uma regra só existir dentro de um Server Action do web,
   ela DESCE para o backend compartilhado; nunca é copiada.
5. Não tocar `apps/web`, `apps/mobile-courier`, `apps/mobile-consumer`
   (exceto o Stage 9, e só onde ele autoriza; exceto extrações explícitas
   para `packages/lib` autorizadas pelo prompt).
6. Design system: usar apenas os tokens de `partner-design.ts` (mesma DNA de
   courier/consumer). Nenhum hex literal em UI.
7. Validar typecheck/lint dos apps afetados **antes** de commitar.
8. Terminar todo stage com o bloco RESUMO (formato em
   `13-workflow-tech-lead.md`).

---

## Prompt — Stage 0 · Backend do Explorar (BLOQUEANTE do pilar Conteúdo)

```
Você é um engenheiro sênior no monorepo Mallevo (pnpm + Turborepo, Supabase,
Expo). Implemente APENAS o Stage 0 do Partner App, na branch
claude/partner-app (criar a partir de main se não existir).

CONTEXTO CRÍTICO
O Explorar do consumer (apps/mobile-consumer/app/(tabs)/explorar.tsx) é 100%
mock: uma const REELS: Reel[] = [...]. Não existe tabela, bucket nem view de
posts no projeto. Este stage cria toda a fundação de dados do feed (fotos e
vídeos) — sem ele não há onde publicar nem o que consumir. NÃO crie nenhuma
UI neste stage.

LEIA PRIMEIRO (fonte da verdade, nesta ordem)
- docs/partner-app/01-arquitetura-e-decisoes.md  (decisões 5,6,7,9,10)
- docs/partner-app/02-stage-0-backend.md          (especificação completa)
- supabase/migrations/20240106000000_migration_006_rls_policies.sql
  (helpers my_tenant_id() / is_admin())
- supabase/migrations/20260509000001_store_theme_and_assets_bucket.sql
  (padrão de bucket + policies de storage)
- docs/03-schema-completo-de-banco-de-dados.md (CREATE TABLE reais de
  tenants/stores/products — confirme nomes e o TIPO de products.preco)

ENTREGÁVEIS (exatamente como em 02-stage-0-backend.md)
1. Migration YYYYMMDDHHMMSS_partner_01_store_posts.sql — tabela store_posts
   (tipo video|foto, colunas, CHECKs — inclusive duracao só p/ vídeo —,
   índices parciais, RLS: select/insert/update/delete do próprio tenant +
   policy admin). Use os nomes de coluna REAIS.
2. Migration ..._partner_02_explore_media_bucket.sql — bucket explore-media
   (public=true, file_size_limit 50MB, mime allowlist vídeo+imagem) +
   policies de storage.objects no prefixo {tenant_id}/{store_id}/ (espelhe
   store-assets).
3. Migration ..._partner_03_store_posts_plan_limit.sql — coluna plans.max_posts
   (nullable, NULL = ilimitado) + função check_store_posts_limit() + trigger
   BEFORE INSERT, no-op quando sem teto. Espelhe o trigger de limite de stores.
4. Migration ..._partner_04_public_explore_feed.sql — VIEW public_explore_feed
   (security_invoker=false), colunas conforme 02 §6 (inclui tipo, media_url,
   thumb_url, duracao_seg), filtro status='published' AND moderacao='approved',
   GRANT SELECT TO anon, authenticated.
5. Regenerar @mallevo/types (mesmo processo já usado no repo) cobrindo
   store_posts e public_explore_feed em Database.

RESTRIÇÕES
- Migrations idempotentes (IF NOT EXISTS / ON CONFLICT DO NOTHING).
- NÃO abrir store_posts ao papel anon (só a view). NÃO alterar policies de
  outras tabelas.
- moderacao DEFAULT: use 'approved' SE o tech lead não instruiu o contrário;
  registre no RESUMO como decisão tomada + alternativa (fila 'pending').

AUTOVERIFICAÇÃO ANTES DE CONCLUIR
- Com a anon key: SELECT em public_explore_feed funciona; SELECT em
  store_posts é negado.
- INSERT em store_posts com store_id de OUTRO tenant é rejeitado pela RLS.
- INSERT tipo='foto' com duracao_seg preenchida é rejeitado (constraint).
- supabase db reset/lint local sem erro; @mallevo/types compila.

Finalize com o RESUMO (formato em docs/partner-app/13-workflow-tech-lead.md),
incluindo a seção Migrations/schema (rollback + idempotência).
```

---

## Prompt — Stage 1 · Scaffold `apps/mobile-partner`

```
Engenheiro sênior, monorepo Mallevo, branch claude/partner-app.
Implemente APENAS o Stage 1 (pode rodar em paralelo ao Stage 0).

LEIA PRIMEIRO
- docs/partner-app/03-stage-1-scaffold.md (especificação, inclusive o mapa
  de navegação completo: 5 tabs + rotas stack de gestão)
- docs/partner-app/01-arquitetura-e-decisoes.md (decisões 1,2,3)
- docs/system-design/consumer/01-tokens.md (design system)
- apps/mobile-courier/ inteiro como GABARITO (package.json, app.json,
  babel/metro/tailwind/nativewind configs, global.css, lib/supabase.ts,
  app/_layout.tsx, app/index.tsx) — copie a FORMA, não invente.

ENTREGÁVEIS (conforme 03-stage-1-scaffold.md)
- apps/mobile-partner com a estrutura de pastas descrita (5 tabs: index/
  pedidos/publicar/conteudo/menu + rotas stack de gestão como STUB).
- package.json derivado do courier (mesmas versões), name "mobile-partner",
  deps extras instaladas via `npx expo install` (expo-camera,
  expo-image-picker, expo-video, expo-video-thumbnails, expo-image-manipulator,
  react-native-compressor, expo-file-system, expo-notifications). NÃO fixar
  versões à mão.
- app.json: name "Mallevo Parceiro", slug/scheme/bundleId/package "partner",
  permissões câmera/microfone/galeria (foto+vídeo), novo eas.projectId.
- Configs (babel/metro/tailwind/nativewind/global.css) e lib/supabase.ts
  copiados verbatim do courier.
- _layout.tsx + index.tsx espelhando o bootstrap de sessão do courier
  (getSession + onAuthStateChange + SplashScreen). Todas as telas como STUB.
- lib/partner-design.ts com a MESMA DNA de courier-design/consumer-design
  (sem paleta nova, nenhum hex fora do arquivo de tokens).

RESTRIÇÕES
- Não tocar mobile-courier nem mobile-consumer. Não alterar pnpm-workspace
  (glob apps/* já cobre). Não criar pipeline turbo divergente das outras apps.
- Se eas.projectId não foi fornecido pelo tech lead, use placeholder e
  registre como pendência.

AUTOVERIFICAÇÃO
- `pnpm --filter mobile-partner start` sobe o Metro sem erro.
- App abre → splash → cai em (auth)/entrar (sem sessão), sem crash; tab bar
  com 5 tabs navegável em dev.
- tsc + eslint do app passam.

Finalize com o RESUMO.
```

---

## Prompt — Stage 2 · Auth do Lojista + Gate

```
Engenheiro sênior, branch claude/partner-app. Pré-condição: Stage 1 aprovado.
Implemente APENAS o Stage 2.

LEIA PRIMEIRO
- docs/partner-app/04-stage-2-auth-gate.md
- apps/mobile-courier/app/(auth)/entrar.tsx (padrão de login)
- apps/mobile-courier/app/_layout.tsx (carregarCourier → adaptar p/ tenant)
- apps/mobile-courier/store/useAuthStore.ts (forma do store)
- Gate atual: localize o predicado pagarme_onboarding_status usado hoje
  (referência: commit e172f80 "migrar gate para pagarme_onboarding_status";
  middleware do Dashboard; supabase/functions/create-subscription).

ENTREGÁVEIS (conforme 04)
- Tela (auth)/entrar: supabase.auth.signInWithPassword, tratamento de erro e
  sucesso via onAuthStateChange (sem router.replace manual), espelhando o
  courier. Link "cadastrar loja" abre EXPO_PUBLIC_APP_URL (web), sem
  reimplementar onboarding.
- useAuthStore: user, tenant, lojas[], lojaAtivaId (persistido em
  AsyncStorage), carregando, setters, setLojaAtiva, limpar.
- carregarTenant(userId) no _layout: select tenant por user_id → select stores
  ativas do tenant → resolver lojaAtivaId (persistido ou lojas[0]).
- Gate em DOIS níveis (operação e publicação) conforme 04: telas/banners de
  bloqueio com CTA p/ Dashboard; publicação bloqueia só Publicar/Conteúdo.
- Seletor de loja para tenant multi-loja (persiste lojaAtivaId).
- packages/lib: tenantPodeOperar(tenant) e tenantPodePublicar(tenant)
  REPLICANDO os predicados atuais (não inventar). Importadas pelo app.

RESTRIÇÕES
- Sessão isolada deste app (AsyncStorage próprio); não vazar p/ courier/consumer.
- Se o valor exato de algum predicado não estiver inequívoco no código atual,
  implemente a estrutura e registre o predicado como PENDÊNCIA do tech lead.

AUTOVERIFICAÇÃO
- Login com credencial de lojista válida entra; inválida mostra erro correto.
- Reabrir o app mantém a sessão (AsyncStorage).
- Tenant reprovado no gate de operação vê app read-only; reprovado só na
  publicação navega na gestão mas NÃO acessa Publicar/Conteúdo.
- Multi-loja: troca de loja persiste.
- Nenhuma regra de gate duplicada no app (só em packages/lib).

Finalize com o RESUMO.
```

---

## Prompt — Stage 3 · Pedidos em Tempo Real (+ aba Início)

```
Engenheiro sênior, branch claude/partner-app. Pré-condição: Stage 2 aprovado.
Implemente APENAS o Stage 3 — o coração do pilar Gestão.

LEIA PRIMEIRO
- docs/partner-app/05-stage-3-pedidos.md (especificação completa)
- apps/web/lib/actions/pedidos.ts — FONTE DAS REGRAS (atualizarStatusPedido,
  atribuirEntregador, getPedidos, getPedidoPorId): replique queries/mutações
  campo a campo
- apps/web/lib/actions/home.ts (números da aba Início)
- supabase/migrations/20260606130000_realtime_orders.sql (orders na publication)
- apps/mobile-courier/lib/notificacoes.ts (padrão push_tokens)
- docs/23-push-notifications.md (pipeline notify-order-update)

ENTREGÁVEIS (conforme 05)
- (tabs)/pedidos.tsx: lista agrupada (Novos / Em andamento / Finalizados
  hoje) da loja ativa; Realtime em orders (INSERT+UPDATE) + refetch no
  AppState active; som (expo-audio) + haptics + badge de novos; filtros por
  status/período; usePedidosStore (Zustand).
- pedido/[id].tsx: detalhe completo (itens c/ variações, consumidor,
  endereço, pagamento, observações); ações de transição por status IGUAIS ao
  Dashboard (otimista + rollback); bottom sheet de atribuição de entregador
  (próprio/pool) espelhando atribuirEntregador; localização do entregador em
  saiu_para_entrega (subscribe courier_locations; mini-mapa OU última posição
  + deep link — registrar decisão).
- (tabs)/index.tsx "Início": saudação + seletor de loja, cards do dia
  (pedidos ativos, faturamento hoje, ticket médio — mesmas queries da home
  web), fila "aguardando ação" (top 3), atalhos, banner de gate.
- Push de pedido novo: registro de token em push_tokens (padrão courier);
  disparo server-side REUSANDO o pipeline existente (estender a Edge Function
  atual ao ator lojista se necessário — não criar outra); tap → deep link
  pedido/[id]; suprimir push em foreground (som/badge in-app no lugar).

RESTRIÇÕES
- NENHUMA transição/regra de pedido inventada no app: diff de regras vs
  pedidos.ts = zero. Lógica que só existir no Server Action DESCE p/ backend
  compartilhado (registrar no RESUMO o que desceu e por quê).
- Não tocar apps/web (exceto se uma extração p/ packages/lib for
  imprescindível — registrar).

AUTOVERIFICAÇÃO
- Pedido criado pelo consumer aparece sem refresh + som + badge.
- Push chega em background/fechado; tap abre o pedido certo.
- Cada transição produz o MESMO estado no banco que o Dashboard produziria.
- Atribuição (próprio e pool) grava delivery_assignments igual ao web.
- RLS: pedido de outro tenant invisível/imutável (teste negativo).

Finalize com o RESUMO.
```

---

## Prompt — Stage 4 · Catálogo: Produtos, Categorias e Estoque

```
Engenheiro sênior, branch claude/partner-app. Pré-condição: Stage 3 aprovado.
Implemente APENAS o Stage 4.

LEIA PRIMEIRO
- docs/partner-app/06-stage-4-catalogo.md
- apps/web/lib/actions/produtos.ts, categorias.ts, estoque.ts — FONTE DAS
  REGRAS (campos, buckets, paths de upload, movimentações)
- docs/11-dashboard-produtos-e-categorias.md e docs/24-modulo-estoque.md
- Migrations 014 (slug), 015–018 (variações/modificadores/estoque), 019
  (metadados de produto)

ENTREGÁVEIS (conforme 06)
- produtos/index.tsx: busca, filtros, toggle de disponibilidade inline
  (otimista), barra de uso do plano.
- produtos/novo.tsx + produtos/[id].tsx: CRUD completo com foto (câmera/
  galeria → expo-image-manipulator → bucket product-images, MESMO
  path-pattern do Dashboard), preço em centavos (@mallevo/lib), categoria,
  disponibilidade, estoque inicial. Variações: exibir + editar preço/
  disponibilidade; estruturar grupos = CTA "abrir no Dashboard".
- categorias.tsx: CRUD + reordenar (drag ou setas), respeitando
  imutabilidade de slug.
- estoque/index.tsx + estoque/[id].tsx: visão com alertas de mínimo,
  entrada/ajuste com motivo gravando stock_movements IGUAL ao Dashboard
  (inclusive variantes), histórico.

RESTRIÇÕES
- Limite de plano é o trigger do banco: NÃO checar no cliente; tratar o erro
  com a mesma UX do Dashboard.
- Verificação de feature de estoque vem do plano (não hardcode).
- Não tocar apps/web.

AUTOVERIFICAÇÃO
- Produto criado no app aparece correto no Dashboard, consumer e storefront.
- Toggle de disponibilidade reflete no consumer imediatamente.
- INSERT acima do limite do plano falha pelo trigger com UX tratada.
- stock_movements do app são indistinguíveis dos do Dashboard.
- RLS: catálogo de outro tenant inacessível (teste negativo).

Finalize com o RESUMO.
```

---

## Prompt — Stage 5 · Financeiro e Relatórios

```
Engenheiro sênior, branch claude/partner-app. Pré-condição: Stage 4 aprovado.
Implemente APENAS o Stage 5.

LEIA PRIMEIRO
- docs/partner-app/07-stage-5-financeiro-relatorios.md
- apps/web/lib/actions/financeiro.ts e assinatura.ts — FONTE DAS REGRAS
- apps/web/app/(dashboard)/relatorios/_lib (agregações das 5 abas)
- docs/13-dashboard-financeiro-e-assinatura.md e docs/30 (modelo Pagar.me)
- supabase/functions/request-advance (contrato da antecipação)

ENTREGÁVEIS (conforme 07)
- financeiro.tsx: KPIs (bruto/líquido/ticket/pedidos) com seletor de período,
  gráfico compacto, repasses (payouts com status), antecipação via
  supabase.functions.invoke('request-advance') com o mesmo cálculo de
  desconto EXIBIDO (nunca calculado no cliente — vem do backend/Edge).
- relatorios.tsx: seções compactas com os MESMOS agregados do web. Se a
  agregação estiver acoplada ao server do Next, extrair o miolo p/
  packages/lib (ou RPC) e fazer web + app consumirem a mesma fonte —
  extração autorizada, registrar no RESUMO.
- Regras de assinatura p/ minha-conta (Stage 6): status/plano/próxima
  cobrança + abertura do Stripe Customer Portal no browser pelo MESMO fluxo
  do Dashboard.

RESTRIÇÕES
- App NUNCA fala com Pagar.me/Stripe direto; só Edge Functions existentes.
- Nenhum número financeiro derivado no cliente além de formatação.

AUTOVERIFICAÇÃO
- KPIs batem com o Dashboard centavo a centavo (mesma loja/período).
- Antecipação dispara request-advance; sucesso e erro tratados.
- Relatórios = mesmos números do web (fonte única).
- RLS: financeiro de outro tenant inacessível (teste negativo).

Finalize com o RESUMO.
```

---

## Prompt — Stage 6 · Operação da Loja

```
Engenheiro sênior, branch claude/partner-app. Pré-condição: Stage 5 aprovado.
Implemente APENAS o Stage 6 (módulos independentes — pode fatiar em sub-PRs
na ordem do doc).

LEIA PRIMEIRO
- docs/partner-app/08-stage-6-operacao-loja.md (ordem interna e diretrizes)
- apps/web/lib/actions/lojas.ts, loja-vitrine.ts, agenda.ts, auth.ts
- Telas web correspondentes em apps/web/app/(dashboard)/ (minha-loja,
  avaliacoes, mensagens, agenda, entregadores, configuracoes, minha-conta,
  ajuda) — paridade de capacidade, não clone de layout
- Tabelas: store_reviews, message_threads/messages (Realtime), courier_invites,
  support_tickets, agenda (migration_020)

ENTREGÁVEIS (conforme 08, nesta ordem)
1. minha-loja.tsx (dados, logo/banner via store-assets, grade semanal de
   horários, entrega, métodos de pagamento, pausar loja)
2. avaliacoes.tsx (listar + responder)
3. mensagens/ (threads + chat Realtime)
4. entregadores.tsx (lista + convite courier_invites via Share)
5. agenda.tsx
6. configuracoes.tsx (staff e tipo-de-loja = CTA web-only)
7. minha-conta.tsx (dados, assinatura conforme Stage 5, trocar loja, sair)
8. ajuda.tsx (support_tickets)
- (tabs)/menu.tsx vira o hub definitivo com todas as entradas + badges.

RESTRIÇÕES
- Validações espelham o web (compartilhar schema via packages/lib quando já
  exportável; senão igualar e registrar unificação como pendência).
- Lacuna de RLS descoberta = bug de backend (propor migration), nunca
  contornar no app.
- Não tocar apps/web.

AUTOVERIFICAÇÃO
- Edições de loja/horários refletem no consumer e storefront igual ao web.
- Pausar loja fecha nas superfícies públicas imediatamente.
- Chat funciona em tempo real nos dois lados.
- Convite gerado no app funciona no fluxo atual do courier.
- Sair limpa só a sessão deste app.
- RLS: teste negativo por módulo.

Finalize com o RESUMO.
```

---

## Prompt — Stage 7 · Captura, Compressão e Upload (Fotos e Vídeos)

```
Engenheiro sênior, branch claude/partner-app. Pré-condições: Stages 0 e 2
aprovados. Implemente APENAS o Stage 7 — o núcleo do pilar Conteúdo.

LEIA PRIMEIRO
- docs/partner-app/09-stage-7-captura-upload.md (fluxo completo)
- docs/partner-app/02-stage-0-backend.md §6 (contrato store_posts)
- docs/partner-app/04-stage-2-auth-gate.md (lojaAtivaId, tenant, gate de
  publicação)
- apps/mobile-consumer/app/(tabs)/explorar.tsx — ReelItem, para o preview
  espelhar "como vai aparecer".

ENTREGÁVEIS (conforme 09, em (tabs)/publicar.tsx + lib/store)
- Permissões (câmera/mic/galeria) com fallback p/ ajustes.
- Captura: FOTO (tap) e VÍDEO vertical (expo-camera, corte aos 60s) OU
  galeria (expo-image-picker, mediaTypes All, videoMaxDuration 60). Saída:
  uri + tipo.
- Vídeo: compressão (react-native-compressor) mp4 H.264/AAC ~1080p < 50MB
  com progresso + thumbnail .jpg (expo-video-thumbnails). Foto:
  expo-image-manipulator ≤1440px JPEG ~0.85 + thumb ~720p.
- Preview (expo-video loop/mute p/ vídeo; fullscreen p/ foto) + detalhes:
  descricao (≤600, contador), tags (chips normalizadas, máx ~5), produto
  opcional (busca em products da loja ativa). store_id = lojaAtivaId.
- Upload: vídeo RESUMÍVEL (TUS via supabase-js, NÃO multipart) nos caminhos
  explore-media/{tenant_id}/{store_id}/{uuid}.mp4 e .jpg; foto pode ser
  upload simples. useUploadStore (Zustand): estado, progress 0-1, cancelar,
  retomar do offset, bloquear navegação com upload ativo, retomar ao voltar
  de background.
- Após objetos confirmados: insert store_posts (tipo, media_path/url,
  thumb_path/url, duracao_seg só vídeo) com status conforme a decisão de
  moderação do Stage 0 (NÃO redecidir). Tela de sucesso com atalhos.

RESTRIÇÕES
- Sem transcode server-side (decisão fixa). H.264/AAC OBRIGATÓRIO no vídeo.
- 1 publicação robusta por vez (fila multi-item é pós-MVP).
- Se insert falhar após upload, não deixar UX quebrada: registrar o caso
  (órfão) para o Stage 8 tratar.

AUTOVERIFICAÇÃO (gate de codec é mandatório)
- Foto, vídeo 60s e galeria concluem publicação.
- Matar a rede no meio do upload de vídeo e voltar: retoma sem reiniciar.
- INSERT com prefixo de outro tenant é rejeitado (teste negativo).
- O vídeo publicado TOCA em apps/mobile-consumer via expo-video, iOS e
  Android. Se não tocar, o defeito é a compressão deste stage — corrigir aqui.

Finalize com o RESUMO.
```

---

## Prompt — Stage 8 · Gestão de Conteúdo e Métricas

```
Engenheiro sênior, branch claude/partner-app. Pré-condição: Stage 7 aprovado.
Implemente APENAS o Stage 8.

LEIA PRIMEIRO
- docs/partner-app/10-stage-8-gestao-conteudo.md
- apps/mobile-consumer/app/(tabs)/explorar.tsx — GaleriaGrid (referência
  visual da grade).
- docs/partner-app/02-stage-0-backend.md (colunas/estados de store_posts).

ENTREGÁVEIS (conforme 10)
- (tabs)/conteudo.tsx "Meu conteúdo": grade vertical com thumb_url real,
  distinção foto/vídeo (▶ + duração), badge de estado (Publicado / Em análise
  / Sinalizado / Oculto), filtros por loja e tipo, empty state com CTA p/
  publicar, detecção de órfão (objeto sem registro do Stage 7) com ação
  resolver/descartar. Fonte: store_posts via RLS.
- post/[id].tsx: player expo-video (vídeo) ou imagem (foto); métricas
  views/curtidas/comentarios SOMENTE LEITURA; editar descricao/tags/
  product_id/visibilidade (published⇄hidden) via UPDATE (RLS); remover =
  soft delete status='removed' + best-effort storage.remove dos objetos,
  com confirmação dupla.

RESTRIÇÕES
- NÃO fabricar métricas: exibir só o que está em store_posts. Quem incrementa
  é o consumer (Stage 9). Tratar 0 com naturalidade.
- Soft delete (não apagar registro); a view do feed já filtra published.
- Notificações (push) são nice-to-have — só se sobrar tempo, sem bloquear.

AUTOVERIFICAÇÃO
- Grade lista só posts do tenant, mais novos primeiro, badges corretos.
- Editar persiste via RLS; ocultar/remover some do feed (public_explore_feed)
  imediatamente; removed sai da contagem de limite do plano.
- Órfão é detectável e resolvível pela UI.

Finalize com o RESUMO.
```

---

## Prompt — Stage 9 · Integração do Feed Real no Consumer

```
Engenheiro sênior, branch claude/partner-app. Pré-condição: Stage 8 aprovado.
Implemente APENAS o Stage 9 — o payoff. Este é o ÚNICO stage que toca
apps/mobile-consumer.

LEIA PRIMEIRO
- docs/partner-app/11-stage-9-integracao-consumer.md
- docs/partner-app/02-stage-0-backend.md §6 (contrato — diferenças tabeladas)
- apps/mobile-consumer/app/(tabs)/explorar.tsx (a tela inteira; entender
  Reel, ReelItem, GaleriaGrid, onViewableItemsChanged, FlatList)
- docs/system-design/consumer/08-roadmap.md (Fase 9 — coordenar se ativa)

ENTREGÁVEIS (conforme 11)
- Em explorar.tsx: remover o mock REELS; carregar de public_explore_feed via
  supabase anon, paginação keyset por publicado_em (onEndReached, limit 20).
- Adaptar interface Reel à view (tipo e thumb_url novos; video_url →
  media_url; produto com id). ReelItem ramifica mídia: video → VideoView
  (comportamento atual); foto → Image fullscreen (mesmos overlay/gestos).
- GaleriaGrid usa thumb_url real (badge ▶ + duração p/ vídeo).
- Estados loading/erro/vazio sobre colors.ink (reusar o empty existente).
- RPC increment_post_view(post_id) (SECURITY DEFINER, GRANT anon) via
  migration; chamar no onViewableItemsChanged já existente, com debounce/
  dedupe por sessão.

RESTRIÇÕES — INEGOCIÁVEIS
- NÃO redesenhar a tela. NÃO alterar animações/gestos/FlatList além do ramo
  de mídia autorizado no ReelItem. Mudança é fonte de dados + ramo foto +
  estados de carga + view-count.
- NÃO acessar store_posts direto (anon usa só a view).
- Like/comentário reais ficam pós-MVP: manter comportamento visual atual e
  registrar como pendência; não exibir contagem não persistida como se fosse.
- Se a Fase 9 do redesign consumer estiver ativa no mesmo arquivo, PARAR e
  registrar conflito de coordenação no RESUMO antes de prosseguir.

AUTOVERIFICAÇÃO
- Explorar renderiza posts reais (vídeo toca, foto renderiza); scroll
  infinito pagina por publicado_em.
- Post publicado no Partner App aparece no Explorar em <1 min.
- Ocultar/remover no Partner App some do feed.
- views incrementa e o número aparece no Stage 8 (alça fechada).
- Diff visual zero fora do ramo de foto (animações/UX idênticas ao mock).

Finalize com o RESUMO e a checklist da Definition of Done do MVP
(docs/partner-app/13-workflow-tech-lead.md).
```

---

## Pós-Stage 9 — Fechamento

Após o Stage 9 aprovado, o tech lead:

1. Roda a **Definition of Done do MVP** (`13-workflow-tech-lead.md`) ponta a
   ponta num device real.
2. Atualiza a tabela "Status dos stages" em `00-INDEX.md` (todos ✅) e registra
   as decisões fechadas (moderação, predicados de gate, teto de plano,
   web-only list).
3. Decide o merge da branch `claude/partner-app` em `main` (se ainda não
   houve merges intermediários por marco) e a primeira build EAS do
   `apps/mobile-partner`.
4. Move para o backlog os itens **pós-MVP** explicitados nos docs: transcode/
   HLS (`01` §7), carrossel de fotos, fila multi-upload, like/comentário
   persistidos, push de moderação, job de limpeza de órfãos, editor de
   modificadores mobile, staff/tipo-de-loja mobile.
