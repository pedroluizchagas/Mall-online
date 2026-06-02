# Stage 5 — Integração do Feed Real no Consumer

> O payoff. Trocar o mock `REELS` de
> [`apps/mobile-consumer/app/(tabs)/explorar.tsx`](../../apps/mobile-consumer/app/(tabs)/explorar.tsx)
> pelo dado real. Mexe **só** na fonte de dados — a UI/animação ficam intactas
> (a tela está plenamente desenhada, ~1050 linhas, e fora de escopo de
> redesign). Depende dos Stages 0–4.

## Princípio

A view `public_explore_feed` (Stage 0 §6) foi desenhada **isomórfica** ao
`interface Reel` existente. Logo a mudança é cirúrgica:

1. Trocar a constante `const REELS: Reel[] = [...]` por estado carregado da
   view.
2. Adaptar `interface Reel` aos nomes/forma da view (diferenças tabeladas no
   Stage 0 §6 — principalmente `thumb_url` novo e `produto` com `id`).
3. Manter `ReelItem`, `GaleriaGrid`, animações, gestos, `FlatList` — **sem
   alteração estrutural**.

## Carga de dados

```ts
const { data } = await supabase
  .from('public_explore_feed')
  .select('*')
  .limit(20)            // paginação por publicado_em (keyset) — incremental
```

- `supabase` do consumer já usa `createClient<Database>` com anon key →
  `public_explore_feed` foi `GRANT SELECT TO anon` no Stage 0; **não** acessar
  `store_videos` direto (RLS bloquearia anon de qualquer forma).
- Estados: loading (skeleton/spinner sobre base `colors.ink`), erro (retry),
  vazio (reusar o empty já existente — a tela já tem "Nenhum vídeo
  encontrado").
- Paginação keyset por `publicado_em` ao chegar perto do fim do `FlatList`
  (`onEndReached`); manter a UX de scroll infinito vertical atual.
- `GaleriaGrid`: usar `thumb_url` real onde hoje há a inicial gigante
  placeholder.

## Métricas — fechar a alça com o Stage 4

O Stage 4 expõe `views/curtidas/comentarios` ao lojista mas **quem incrementa
é aqui**. Decisão mínima do MVP (registrar no `00-INDEX` status):

- **`views`**: RPC `increment_video_view(video_id uuid)`
  (`SECURITY DEFINER`, `GRANT EXECUTE TO anon`) chamada quando um reel fica
  ativo (`onViewableItemsChanged` já existe na tela — só plugar a chamada,
  com debounce/dedupe por sessão para não inflar).
- **`curtidas`**: hoje `toggleCurtida` é só estado local. MVP: manter visual
  local **ou** RPC `toggle_video_like` com tabela `video_likes(consumer_id,
  video_id)` se o consumer estiver autenticado. Recomendado deixar like real
  como **pós-MVP** (precisa de identidade do consumer + dedupe) e **não**
  exibir contagem que não persiste como se persistisse.
- **`comentarios`**: fora do MVP (sistema de comentários é feature própria).

> Regra: o Partner App (Stage 4) só mostra número que existe de verdade. Este
> stage define o que existe. Se `views` é o único real no MVP, curtidas/
> comentários ficam 0 e a UI do lojista trata 0 com naturalidade.

## Cuidados

- **Codec**: validar com vídeos reais publicados pelo Partner App que o
  `expo-video`/`VideoView` toca em iOS e Android (gate herdado do Stage 3). Se
  falhar, o problema é a compressão do Stage 3, não esta tela.
- **Não** redesenhar o Explorar aqui. Existe um plano de redesign próprio
  (`docs/system-design/consumer/07-telas.md §5`, Fase 9 do roadmap consumer)
  com escopo e ordenação próprios. Este stage é troca de fonte de dados,
  ortogonal àquele redesign. Coordenar ordem com o tech lead se ambos estiverem
  ativos (evitar conflito no mesmo arquivo).
- Performance: pré-carregar só o próximo reel (o componente já faz
  play/pause por `isActive`); não instanciar 20 players de uma vez — manter o
  comportamento atual de `FlatList` + `isActive`.

## Critérios de aceite

- [ ] Explorar do consumer renderiza vídeos reais de `public_explore_feed`
      (mock removido).
- [ ] Scroll vertical infinito pagina por `publicado_em`.
- [ ] `GaleriaGrid` mostra `thumb_url` real.
- [ ] Vídeo publicado no Partner App aparece no Explorar em < 1 min e toca em
      iOS e Android.
- [ ] Ocultar/remover no Partner App (Stage 4) some do feed.
- [ ] `views` incrementa e o número aparece pro lojista no Stage 4 (alça
      fechada).
- [ ] Nenhuma regressão visual/animação na tela (UI inalterada).
