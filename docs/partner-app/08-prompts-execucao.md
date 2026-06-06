# 08 — Prompts de Execução

Prompts profissionais, **auto-contidos e copiáveis**, para o agente executor
implementar o Partner App de ponta a ponta, na ordem correta. Cada prompt é uma
unidade fechada: contexto, leitura obrigatória, escopo, restrições, armadilhas
conhecidas, autoverificação e formato de entrega.

O tech lead entrega **um prompt por vez**. O executor implementa só aquele
stage, commita na branch da feature e devolve o RESUMO. O tech lead valida
contra os critérios de aceite do doc do stage antes de liberar o próximo.

---

## Convenção de branch e sequência

- **Branch única da feature**: `claude/partner-app-explore-studio` (criada a
  partir de `main` pelo tech lead no início do Stage 0). Todos os stages
  commitam nela; **não** mergear em `main` até o Stage 5 aprovado (mesmo modelo
  do storefront).
- **Gate de sequência**: o stage `N` só começa quando o `N-1` foi aprovado pelo
  tech lead. O executor confirma no início do prompt que o stage anterior está
  na branch (typecheck/lint verdes) antes de codar.
- **Commits**: pequenos, descritivos, em PT, escopados ao stage. Rodapé de
  commit conforme política do repo.
- **Ordem imutável**: `0 → 1 → 2 → 3 → 4 → 5`. O Stage 0 é bloqueante. O Stage
  5 é o único que toca `apps/mobile-consumer`.

## Regras globais do executor (valem em todos os prompts)

1. Ler os docs referenciados **antes** de codar — são a fonte da verdade,
   acima de qualquer suposição.
2. Não expandir escopo além do stage. Ambiguidade não resolvida →
   **registrar como pendência no RESUMO, nunca chutar**.
3. Espelhar o que já existe: `apps/mobile-courier` é o gabarito estrutural do
   app; migrations seguem as convenções do repo (nomes, PT, `IF NOT EXISTS`,
   helpers `my_tenant_id()`/`is_admin()`).
4. Nenhuma regra de negócio (gate, limite de plano, ownership) duplicada no
   cliente — vive em RLS / `packages/lib`.
5. Não tocar `apps/web`, `apps/mobile-courier`, `apps/mobile-consumer` (exceto
   o Stage 5, e só onde ele autoriza).
6. Validar typecheck/lint dos apps afetados **antes** de commitar.
7. Terminar todo stage com o bloco RESUMO (formato em
   `09-workflow-tech-lead.md`).

---

## Prompt — Stage 0 · Backend do Explorar (BLOQUEANTE)

```
Você é um engenheiro sênior no monorepo Mallevo (pnpm + Turborepo, Supabase,
Expo). Implemente APENAS o Stage 0 do Partner App, na branch
claude/partner-app-explore-studio (criar a partir de main se não existir).

CONTEXTO CRÍTICO
O Explorar do consumer (apps/mobile-consumer/app/(tabs)/explorar.tsx) é 100%
mock: uma const REELS: Reel[] = [...]. Não existe tabela, bucket nem view de
vídeo no projeto. Este stage cria toda a fundação de dados — sem ele não há
onde publicar nem o que consumir. NÃO crie nenhuma UI neste stage.

LEIA PRIMEIRO (fonte da verdade, nesta ordem)
- docs/partner-app/01-arquitetura-e-decisoes.md  (decisões 3,4,5,7,8)
- docs/partner-app/02-stage-0-backend.md          (especificação completa)
- supabase/migrations/20240106000000_migration_006_rls_policies.sql
  (helpers my_tenant_id() / is_admin())
- supabase/migrations/20260509000001_store_theme_and_assets_bucket.sql
  (padrão de bucket + policies de storage)
- docs/03-schema-completo-de-banco-de-dados.md (CREATE TABLE reais de
  tenants/stores/products — confirme nomes e o TIPO de products.preco)

ENTREGÁVEIS (exatamente como em 02-stage-0-backend.md)
1. Migration YYYYMMDDHHMMSS_partner_01_store_videos.sql — tabela store_videos
   (colunas, CHECKs, índices parciais, RLS: select/insert/update/delete do
   próprio tenant + policy admin). Use os nomes de coluna REAIS.
2. Migration ..._partner_02_explore_videos_bucket.sql — bucket explore-videos
   (public=true, file_size_limit 50MB, mime allowlist) + policies de
   storage.objects no prefixo {tenant_id}/{store_id}/ (espelhe store-assets).
3. Migration ..._partner_03_store_videos_plan_limit.sql — coluna plans.max_videos
   (nullable, NULL = ilimitado) + função check_store_videos_limit() + trigger
   BEFORE INSERT, no-op quando sem teto. Espelhe o trigger de limite de stores.
4. Migration ..._partner_04_public_explore_feed.sql — VIEW public_explore_feed
   (security_invoker=false), colunas isomórficas ao interface Reel do consumer
   (ver 02 §6), filtro status='published' AND moderacao='approved',
   GRANT SELECT TO anon, authenticated.
5. Regenerar @mallevo/types (mesmo processo já usado no repo) cobrindo
   store_videos e public_explore_feed em Database.

RESTRIÇÕES
- Migrations idempotentes (IF NOT EXISTS / ON CONFLICT DO NOTHING).
- NÃO abrir store_videos ao papel anon (só a view). NÃO alterar policies de
  outras tabelas.
- moderacao DEFAULT: use 'approved' SE o tech lead não instruiu o contrário;
  registre no RESUMO como decisão tomada + alternativa (fila 'pending').

AUTOVERIFICAÇÃO ANTES DE CONCLUIR
- Com a anon key: SELECT em public_explore_feed funciona; SELECT em
  store_videos é negado.
- INSERT em store_videos com store_id de OUTRO tenant é rejeitado pela RLS.
- supabase db reset/lint local sem erro; @mallevo/types compila.

Finalize com o RESUMO (formato em docs/partner-app/09-workflow-tech-lead.md),
incluindo a seção Migrations/schema (rollback + idempotência).
```

---

## Prompt — Stage 1 · Scaffold `apps/mobile-partner`

```
Engenheiro sênior, monorepo Mallevo, branch claude/partner-app-explore-studio.
Pré-condição: Stage 0 aprovado e na branch. Implemente APENAS o Stage 1.

LEIA PRIMEIRO
- docs/partner-app/03-stage-1-scaffold.md (especificação)
- docs/partner-app/01-arquitetura-e-decisoes.md (decisões 1,2)
- apps/mobile-courier/ inteiro como GABARITO (package.json, app.json,
  babel/metro/tailwind/nativewind configs, global.css, lib/supabase.ts,
  app/_layout.tsx, app/index.tsx) — copie a FORMA, não invente.

ENTREGÁVEIS (conforme 03-stage-1-scaffold.md)
- apps/mobile-partner com a estrutura de pastas descrita.
- package.json derivado do courier (mesmas versões), name "mobile-partner",
  deps extras instaladas via `npx expo install` (expo-camera,
  expo-image-picker, expo-video, expo-video-thumbnails, react-native-compressor,
  expo-file-system). NÃO fixar versões à mão.
- app.json: name "Mallevo Parceiro", slug/scheme/bundleId/package "partner",
  permissões câmera/microfone/galeria, novo eas.projectId.
- Configs (babel/metro/tailwind/nativewind/global.css) e lib/supabase.ts
  copiados verbatim do courier.
- _layout.tsx + index.tsx espelhando o bootstrap de sessão do courier
  (getSession + onAuthStateChange + SplashScreen). Telas (auth)/entrar,
  (tabs)/index, (tabs)/publicar, (tabs)/perfil, video/[id] como STUB.
- lib/partner-design.ts derivado de courier-design/consumer-design (sem paleta
  nova; respeitar a marca Mallevo já padronizada).

RESTRIÇÕES
- Não tocar mobile-courier nem mobile-consumer. Não alterar pnpm-workspace
  (glob apps/* já cobre). Não criar pipeline turbo divergente das outras apps.
- Se eas.projectId não foi fornecido pelo tech lead, use placeholder e
  registre como pendência.

AUTOVERIFICAÇÃO
- `pnpm --filter mobile-partner start` sobe o Metro sem erro.
- App abre → splash → cai em (auth)/entrar (sem sessão), sem crash.
- tsc + eslint do app passam.

Finalize com o RESUMO.
```

---

## Prompt — Stage 2 · Auth do Lojista + Gate

```
Engenheiro sênior, branch claude/partner-app-explore-studio. Pré-condição:
Stage 1 aprovado. Implemente APENAS o Stage 2.

LEIA PRIMEIRO
- docs/partner-app/04-stage-2-auth-gate.md
- apps/mobile-courier/app/(auth)/entrar.tsx (padrão de login)
- apps/mobile-courier/app/_layout.tsx (carregarCourier → adaptar p/ tenant)
- apps/mobile-courier/store/useAuthStore.ts (forma do store)
- Gate atual de assinatura: localize o predicado pagarme_onboarding_status
  usado hoje (referência: commit e172f80 "migrar gate para
  pagarme_onboarding_status"; supabase/functions/create-subscription).

ENTREGÁVEIS (conforme 04)
- Tela (auth)/entrar: supabase.auth.signInWithPassword, tratamento de erro e
  sucesso via onAuthStateChange (sem router.replace manual), espelhando o
  courier. Link "cadastrar loja" abre EXPO_PUBLIC_APP_URL (web), sem
  reimplementar onboarding.
- useAuthStore: user, tenant, lojas[], lojaAtivaId (persistido em
  AsyncStorage), carregando, setters, setLojaAtiva, limpar.
- carregarTenant(userId) no _layout: select tenant por user_id → select stores
  ativas do tenant → resolver lojaAtivaId (persistido ou lojas[0]).
- Telas de gate: sem tenant / gate reprovado / sem loja (CTA p/ Dashboard).
- Seletor de loja para tenant multi-loja (persiste lojaAtivaId).
- packages/lib: função tenantPodePublicar(tenant) REPLICANDO o predicado de
  gate atual (não inventar). Importada pelo app.

RESTRIÇÕES
- Sessão isolada deste app (AsyncStorage próprio); não vazar p/ courier/consumer.
- Se o valor exato do predicado de gate não estiver inequívoco no código atual,
  implemente a estrutura e registre o predicado como PENDÊNCIA do tech lead.

AUTOVERIFICAÇÃO
- Login com credencial de lojista válida entra; inválida mostra erro correto.
- Reabrir o app mantém a sessão (AsyncStorage).
- Tenant que reprova no gate vê tela de bloqueio e NÃO acessa "Publicar".
- Multi-loja: troca de loja persiste.
- Nenhuma regra de gate duplicada no app (só em packages/lib).

Finalize com o RESUMO.
```

---

## Prompt — Stage 3 · Captura, Compressão e Upload

```
Engenheiro sênior, branch claude/partner-app-explore-studio. Pré-condição:
Stage 2 aprovado. Implemente APENAS o Stage 3 — o núcleo do produto.

LEIA PRIMEIRO
- docs/partner-app/05-stage-3-captura-upload.md (fluxo completo)
- docs/partner-app/02-stage-0-backend.md §6 (contrato store_videos)
- docs/partner-app/04-stage-2-auth-gate.md (lojaAtivaId, tenant)
- apps/mobile-consumer/app/(tabs)/explorar.tsx — ReelItem, para o preview
  espelhar "como vai aparecer".

ENTREGÁVEIS (conforme 05, em (tabs)/publicar.tsx + lib/store)
- Permissões (câmera/mic/galeria) com fallback p/ ajustes.
- Captura: gravar vertical (expo-camera, corte aos 60s) OU escolher
  (expo-image-picker, videoMaxDuration 60). Saída: uri local.
- Compressão (react-native-compressor): mp4 H.264/AAC, ~1080p, < 50MB,
  com progresso. Thumbnail .jpg via expo-video-thumbnails.
- Preview (expo-video, loop/mute) + detalhes: descricao (≤600, contador),
  tags (chips normalizadas, máx ~5), produto opcional (busca em products da
  loja ativa, RLS filtra). store_id = lojaAtivaId.
- Upload RESUMÍVEL (TUS via supabase-js, NÃO multipart) nos caminhos
  explore-videos/{tenant_id}/{store_id}/{uuid}.mp4 e .jpg. useUploadStore
  (Zustand): estado, progress 0-1, cancelar, retomar do offset, bloquear
  navegação com upload ativo, retomar ao voltar de background.
- Após os DOIS objetos confirmados: insert store_videos (RLS valida
  tenant+loja) com status conforme a decisão de moderação do Stage 0
  (NÃO redecidir). Tela de sucesso com atalhos.

RESTRIÇÕES
- Sem transcode server-side (decisão fixa). H.264/AAC é OBRIGATÓRIO no output.
- 1 upload robusto por vez (fila multi-item é pós-MVP).
- Se insert falhar após upload, não deixar UX quebrada: registrar o caso
  (órfão) para o Stage 4 tratar.

AUTOVERIFICAÇÃO (gate de codec é mandatório)
- Gravar 60s e escolher da galeria produzem upload concluído.
- Matar a rede no meio do upload e voltar: retoma sem reiniciar do zero.
- INSERT com prefixo de outro tenant é rejeitado (teste negativo).
- O vídeo publicado TOCA em apps/mobile-consumer via expo-video, iOS e
  Android. Se não tocar, o defeito é a compressão deste stage — corrigir aqui.

Finalize com o RESUMO.
```

---

## Prompt — Stage 4 · Gestão de Conteúdo e Métricas

```
Engenheiro sênior, branch claude/partner-app-explore-studio. Pré-condição:
Stage 3 aprovado. Implemente APENAS o Stage 4.

LEIA PRIMEIRO
- docs/partner-app/06-stage-4-gestao-conteudo.md
- apps/mobile-consumer/app/(tabs)/explorar.tsx — GaleriaGrid (referência
  visual da grade).
- docs/partner-app/02-stage-0-backend.md (colunas/estados de store_videos).

ENTREGÁVEIS (conforme 06)
- (tabs)/index.tsx "Meus vídeos": grade vertical com thumb_url real, badge de
  estado (Publicado / Em análise / Sinalizado / Oculto), filtro por loja,
  empty state com CTA p/ publicar, detecção de órfão (objeto sem registro do
  Stage 3) com ação resolver/descartar. Fonte: store_videos via RLS.
- video/[id].tsx: player expo-video; métricas views/curtidas/comentarios
  SOMENTE LEITURA; editar descricao/tags/product_id/visibilidade
  (published⇄hidden) via UPDATE (RLS); remover = soft delete
  status='removed' + best-effort storage.remove dos 2 objetos, com
  confirmação dupla.

RESTRIÇÕES
- NÃO fabricar métricas: exibir só o que está em store_videos. Quem incrementa
  é o consumer (Stage 5). Tratar 0 com naturalidade.
- Soft delete (não apagar registro); a view do feed já filtra published.
- Notificações (push) são nice-to-have — só se sobrar tempo, sem bloquear.

AUTOVERIFICAÇÃO
- Grade lista só vídeos do tenant, mais novos primeiro, badges corretos.
- Editar persiste via RLS; ocultar/remover some do feed (public_explore_feed)
  imediatamente; removed sai da contagem de limite do plano.
- Órfão é detectável e resolvível pela UI.

Finalize com o RESUMO.
```

---

## Prompt — Stage 5 · Integração do Feed Real no Consumer

```
Engenheiro sênior, branch claude/partner-app-explore-studio. Pré-condição:
Stage 4 aprovado. Implemente APENAS o Stage 5 — o payoff. Este é o ÚNICO
stage que toca apps/mobile-consumer.

LEIA PRIMEIRO
- docs/partner-app/07-stage-5-integracao-consumer.md
- docs/partner-app/02-stage-0-backend.md §6 (contrato — diferenças tabeladas)
- apps/mobile-consumer/app/(tabs)/explorar.tsx (a tela inteira; entender
  Reel, ReelItem, GaleriaGrid, onViewableItemsChanged, FlatList)
- docs/system-design/consumer/08-roadmap.md (Fase 9 — coordenar se ativa)

ENTREGÁVEIS (conforme 07)
- Em explorar.tsx: remover o mock REELS; carregar de public_explore_feed via
  supabase anon, paginação keyset por publicado_em (onEndReached, limit 20).
- Adaptar interface Reel à view (thumb_url novo; produto com id). GaleriaGrid
  usa thumb_url real.
- Estados loading/erro/vazio sobre colors.ink (reusar o empty existente).
- RPC increment_video_view(video_id) (SECURITY DEFINER, GRANT anon) via
  migration; chamar no onViewableItemsChanged já existente, com debounce/dedupe
  por sessão.

RESTRIÇÕES — INEGOCIÁVEIS
- NÃO redesenhar a tela. NÃO alterar ReelItem/GaleriaGrid/animações/gestos/
  FlatList. Mudança é SÓ fonte de dados + estados de carga + view-count.
- NÃO acessar store_videos direto (anon usa só a view).
- Like/comentário reais ficam pós-MVP: manter comportamento visual atual e
  registrar como pendência; não exibir contagem não persistida como se fosse.
- Se a Fase 9 do redesign consumer estiver ativa no mesmo arquivo, PARAR e
  registrar conflito de coordenação no RESUMO antes de prosseguir.

AUTOVERIFICAÇÃO
- Explorar renderiza vídeos reais; scroll infinito pagina por publicado_em.
- Vídeo publicado no Partner App aparece no Explorar em <1 min e toca em iOS
  e Android.
- Ocultar/remover no Partner App some do feed.
- views incrementa e o número aparece no Stage 4 (alça fechada).
- Diff visual zero (animações/UX idênticas ao mock).

Finalize com o RESUMO e a checklist da Definition of Done do MVP
(docs/partner-app/09-workflow-tech-lead.md).
```

---

## Pós-Stage 5 — Fechamento

Após o Stage 5 aprovado, o tech lead:

1. Roda a **Definition of Done do MVP** (`09-workflow-tech-lead.md`) ponta a
   ponta num device real.
2. Atualiza a tabela "Status dos stages" em `00-INDEX.md` (todos ✅) e registra
   as decisões fechadas (moderação, predicado de gate, teto de plano).
3. Decide o merge da branch `claude/partner-app-explore-studio` em `main` e a
   primeira build EAS do `apps/mobile-partner`.
4. Move para o backlog os itens **pós-MVP** explicitados nos docs: transcode/
   HLS (`01` §5), fila multi-upload, like/comentário persistidos, push de
   moderação, job de limpeza de órfãos.
