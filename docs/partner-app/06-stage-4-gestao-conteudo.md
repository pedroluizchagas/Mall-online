# Stage 4 — Gestão de Conteúdo e Métricas

> O lojista precisa ver, editar e remover o que publicou — e ter um sinal de
> retorno (views/curtidas) que o faça voltar a postar. Depende dos Stages 0–3.

## Tela "Meus vídeos" (`(tabs)/index.tsx`)

Grade vertical (espelha visualmente a `GaleriaGrid` do Explorar do consumer,
agora com `thumb_url` real no lugar do placeholder de inicial). Fonte:

```ts
supabase.from('store_videos')
  .select('id,thumb_url,descricao,status,moderacao,curtidas,comentarios,views,criado_em,store_id')
  .order('criado_em', { ascending: false })
// RLS store_videos_select_proprio já restringe ao tenant
```

- Filtro por loja (se multi-loja, respeita `lojaAtivaId` ou "todas").
- Badge de estado por card: **Publicado** / **Em análise** (`processing` |
  `moderacao=pending`) / **Sinalizado** (`flagged`) / **Oculto** (`hidden`).
- Empty state: ilustração + CTA "Publicar primeiro vídeo" → Stage 3.
- Detectar **órfãos** (objeto no Storage sem registro — falha pós-upload do
  Stage 3 §6): oferecer "retomar publicação" ou descartar.

## Detalhe / edição (`video/[id].tsx`)

- Player `expo-video` (loop) — preview real.
- Métricas: `views`, `curtidas`, `comentarios` (somente leitura — escrita é do
  consumer). Mostrar `publicado_em`.
- Editável: `descricao`, `tags`, `product_id` (mesma busca do Stage 3),
  visibilidade (`published` ⇄ `hidden`). `UPDATE` coberto por
  `store_videos_update_proprio`. Não permitir editar `storage_path`/mídia
  (trocar vídeo = publicar outro).
- **Remover**: confirmação dupla. Estratégia: `status = 'removed'` (soft) +
  best-effort `storage.remove()` dos dois objetos. Soft preserva integridade de
  métricas/auditoria e o trigger de limite do Stage 0 já ignora `removed`. Hard
  delete físico fica para job de limpeza (roadmap).

> Por que soft delete: a view `public_explore_feed` filtra `status =
> 'published'`, então `removed` some do feed do consumer **imediatamente** sem
> depender da remoção física do arquivo (que é best-effort em rede móvel).

## Métricas — origem dos números

`curtidas`/`comentarios`/`views` são colunas em `store_videos`. **Quem
incrementa é o consumer**, não o Partner App. Isso é dependência do Stage 5 e
deve ser explicitado lá:

- Hoje o Explorar do consumer cura/comenta em estado local (mock), sem persistir
  (ver `toggleCurtida` em `explorar.tsx` — só `setState`).
- Stage 5 decide a persistência mínima: no mínimo `views` (RPC
  `increment_video_view(id)` ao focar o reel) para dar sinal de retorno ao
  lojista no MVP. Curtidas/comentários reais (tabela de likes por consumer) são
  evolução pós-MVP — até lá esses campos podem ficar 0 e a UI do Partner App
  não deve prometer o que não existe.

Definir no Stage 5 e **não** simular números no Partner App.

## Notificações (leve, opcional no MVP)

`expo-notifications` já está no stack (courier usa). Push "seu vídeo foi
sinalizado/aprovado" reusa a tabela `push_tokens` (já existe,
`migration_011`/`013`) com `tipo` próprio. Marcar como **nice-to-have** — não
bloqueia o MVP; só implementar se sobrar no stage.

## Critérios de aceite

- [ ] Grade lista só vídeos do tenant, mais novos primeiro, com thumb real e
      badge de estado correto.
- [ ] Editar descrição/tags/produto/visibilidade persiste (UPDATE via RLS).
- [ ] Ocultar tira do feed do consumer (`public_explore_feed`) na hora.
- [ ] Remover faz soft delete (`status='removed'`) + tenta apagar objetos;
      some do feed imediatamente; some da contagem de limite do plano.
- [ ] Métricas exibidas vêm de `store_videos` (sem número fabricado no app).
- [ ] Órfão de upload é detectável e resolvível pela UI.
