# Stage 9 — Integração do Feed Real no Consumer

> O payoff. Trocar o mock `REELS` de
> [`apps/mobile-consumer/app/(tabs)/explorar.tsx`](../../apps/mobile-consumer/app/(tabs)/explorar.tsx)
> pelo dado real (fotos e vídeos). Mexe na fonte de dados e no render de mídia
> do `ReelItem` — animações/gestos/estrutura ficam intactos (a tela está
> plenamente desenhada, ~1050 linhas, e fora de escopo de redesign). Depende
> dos Stages 0–8. **Único stage que toca `apps/mobile-consumer`.**

## Princípio

A view `public_explore_feed` (Stage 0 §6) foi desenhada para cobrir o
`interface Reel` existente e estendê-lo com `tipo`/`media_url`/`thumb_url`.
A mudança é cirúrgica:

1. Trocar a constante `const REELS: Reel[] = [...]` por estado carregado da
   view.
2. Adaptar `interface Reel` aos nomes/forma da view (diferenças tabeladas no
   Stage 0 §6 — `video_url`→`media_url`, `tipo` e `thumb_url` novos, `produto`
   com `id`).
3. No `ReelItem`, ramificar o render de mídia: `tipo='video'` → `VideoView`
   (comportamento atual); `tipo='foto'` → `Image` fullscreen (mesmo
   overlay/gestos; avanço automático após ~5 s é opcional — se adicionar,
   manter o padrão de animação existente).
4. Manter `GaleriaGrid`, animações, gestos, `FlatList` — **sem alteração
   estrutural**.

## Carga de dados

```ts
const { data } = await supabase
  .from('public_explore_feed')
  .select('*')
  .limit(20)            // paginação por publicado_em (keyset) — incremental
```

- `supabase` do consumer já usa `createClient<Database>` com anon key →
  `public_explore_feed` foi `GRANT SELECT TO anon` no Stage 0; **não** acessar
  `store_posts` direto (RLS bloquearia anon de qualquer forma).
- Estados: loading (skeleton/spinner sobre base `colors.ink`), erro (retry),
  vazio (reusar o empty já existente — a tela já tem "Nenhum vídeo
  encontrado").
- Paginação keyset por `publicado_em` ao chegar perto do fim do `FlatList`
  (`onEndReached`); manter a UX de scroll infinito vertical atual.
- `GaleriaGrid`: usar `thumb_url` real onde hoje há a inicial gigante
  placeholder; badge ▶ + duração para vídeos.

## Métricas — fechar a alça com o Stage 8

O Stage 8 expõe `views/curtidas/comentarios` ao lojista mas **quem incrementa
é aqui**. Decisão mínima do MVP (registrar no `00-INDEX` status):

- **`views`**: RPC `increment_post_view(post_id uuid)`
  (`SECURITY DEFINER`, `GRANT EXECUTE TO anon`) chamada quando um post fica
  ativo (`onViewableItemsChanged` já existe na tela — só plugar a chamada,
  com debounce/dedupe por sessão para não inflar).
- **`curtidas`**: hoje `toggleCurtida` é só estado local. MVP: manter visual
  local **ou** RPC `toggle_post_like` com tabela `post_likes(consumer_id,
  post_id)` se o consumer estiver autenticado. Recomendado deixar like real
  como **pós-MVP** (precisa de identidade do consumer + dedupe) e **não**
  exibir contagem que não persiste como se persistisse.
- **`comentarios`**: fora do MVP (sistema de comentários é feature própria).

> Regra: o Partner App (Stage 8) só mostra número que existe de verdade. Este
> stage define o que existe. Se `views` é o único real no MVP, curtidas/
> comentários ficam 0 e a UI do lojista trata 0 com naturalidade.

## Cuidados

- **Codec**: validar com vídeos reais publicados pelo Partner App que o
  `expo-video`/`VideoView` toca em iOS e Android (gate herdado do Stage 7). Se
  falhar, o problema é a compressão do Stage 7, não esta tela.
- **Foto**: `expo-image`/`Image` com `contentFit: 'cover'`; sem download de
  original acima do necessário (a mídia já vem comprimida do Stage 7).
- **Não** redesenhar o Explorar aqui. Existe um plano de redesign próprio
  (`docs/system-design/consumer/07-telas.md §5`, Fase 9 do roadmap consumer)
  com escopo e ordenação próprios. Este stage é troca de fonte de dados +
  ramo de mídia, ortogonal àquele redesign. Coordenar ordem com o tech lead
  se ambos estiverem ativos (evitar conflito no mesmo arquivo).
- Performance: pré-carregar só o próximo item (o componente já faz
  play/pause por `isActive`); não instanciar 20 players de uma vez — manter o
  comportamento atual de `FlatList` + `isActive`.

## Critérios de aceite

- [ ] Explorar do consumer renderiza posts reais de `public_explore_feed`
      (mock removido) — vídeos tocam, fotos renderizam.
- [ ] Scroll vertical infinito pagina por `publicado_em`.
- [ ] `GaleriaGrid` mostra `thumb_url` real (com ▶/duração para vídeo).
- [ ] Post publicado no Partner App aparece no Explorar em < 1 min; vídeo
      toca em iOS e Android.
- [ ] Ocultar/remover no Partner App (Stage 8) some do feed.
- [ ] `views` incrementa e o número aparece pro lojista no Stage 8 (alça
      fechada).
- [ ] Nenhuma regressão visual/animação na tela (estrutura inalterada).
