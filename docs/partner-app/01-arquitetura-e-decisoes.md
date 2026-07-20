# 01 — Arquitetura e Decisões

## 1. O que é isolado vs compartilhado

| Camada | Isolado por superfície | Compartilhado |
|---|---|---|
| Runtime / deploy (build Expo, EAS) | ✅ projeto próprio | — |
| UI / design tokens | ✅ `partner-design.ts` próprio | DNA herdada de courier/consumer |
| Auth provider | — | ✅ Supabase Auth (`auth.users`) |
| Identidade do lojista | — | ✅ `tenants` / `stores` |
| Pedidos, catálogo, estoque, financeiro | — | ✅ mesmas tabelas + RLS do Dashboard |
| Realtime (pedidos, mensagens) | — | ✅ mesma publication (`realtime_orders`) |
| Edge Functions (pagamentos, repasses) | — | ✅ as mesmas do Dashboard |
| Storage de mídia | — | ✅ buckets `product-images`, `store-assets`, `explore-media` |
| Tabela de conteúdo | — | ✅ `store_posts` |
| Feed consumido pelo Explorar | — | ✅ view `public_explore_feed` |
| Regras de negócio (limites de plano, gate do tenant) | — | ✅ `packages/lib` / RLS |

O Partner App **nunca** reimplementa regra de negócio. Limite de produtos/posts
por plano, status do tenant (`pagarme_onboarding_status`), transições de status
de pedido e ownership saem de RLS + `packages/lib` + Edge Functions,
exatamente como o storefront faz com entrega/cobertura.

## 2. Por que app separado e não PWA do Dashboard

O Dashboard (`apps/web`) é Next.js server-rendered, pensado para desktop e
gestão de balcão. O lojista mobile precisa de coisas que a web mobile não
entrega bem:

- **Push notification confiável + som** de pedido novo com o app fechado.
- **Câmera nativa**: captura de foto/vídeo, permissões, compressão, upload
  resumível com app em background.
- **Sessão persistente** sem depender de navegador.

A base de código já assumiu o padrão "uma superfície isolada por público"
(storefront, consumer, courier). O Partner App segue o mesmo padrão — é o
gêmeo do `apps/mobile-courier` para o público lojista.

## 3. Paridade com o Dashboard — princípio e mapa funcional

**Princípio: paridade de capacidade, não clone de tela.** O lojista consegue
fazer no app tudo que faz no web, mas cada fluxo é redesenhado mobile-first
com o design system dos apps (uma mão, listas verticais, bottom sheets,
ações rápidas). A regra de negócio é idêntica porque **vem do mesmo backend**.

Mapa rota web → superfície no app → stage responsável:

| Dashboard web (`apps/web/(dashboard)`) | Partner App | Stage |
|---|---|---|
| `/` (visão geral) | aba **Início** — resumo do dia, atalhos | 3 |
| `/pedidos` + `/pedidos/[id]` | aba **Pedidos** + `pedido/[id]` | 3 |
| `/produtos` (+`novo`, `[id]`) | Menu → **Catálogo** → produtos | 4 |
| `/categorias` | Menu → Catálogo → categorias | 4 |
| `/estoque` (+`[id]`) | Menu → Catálogo → estoque | 4 |
| `/financeiro` | Menu → **Financeiro** | 5 |
| `/relatorios` | Menu → **Relatórios** | 5 |
| `/minha-loja` | Menu → **Minha loja** | 6 |
| `/configuracoes` | Menu → Configurações | 6 |
| `/avaliacoes` | Menu → Avaliações | 6 |
| `/mensagens` (+`[threadId]`) | Menu → Mensagens (chat) | 6 |
| `/agenda` | Menu → Agenda | 6 |
| `/entregadores` | Menu → Entregadores | 6 |
| `/ajuda` | Menu → Ajuda (tickets) | 6 |
| `/minha-conta` | Menu → Minha conta | 6 |
| — (inexistente no web) | aba **Publicar** + aba **Conteúdo** (Reels) | 7–8 |

Exceções de paridade (ficam **web-only** no MVP, com CTA "abrir no
Dashboard"): onboarding/cadastro de tenant, `configuracoes/staff`,
`configuracoes/tipo-de-loja` (troca de template), edição avançada de
variações/modificadores e gestão da assinatura Stripe (o app mostra status e
abre o Customer Portal no browser). Motivo: fluxos raros, densos e sensíveis —
custo mobile alto, valor diário baixo. Registrado como decisão revisável.

## 4. Como o mobile substitui os Server Actions

O Dashboard muta dados via Server Actions (Next.js). O app não tem servidor
próprio — o padrão é o mesmo dos outros apps mobile:

| Operação | No Dashboard | No Partner App |
|---|---|---|
| Leitura | Server Component + RLS | `supabase-js` direto + RLS (mesmas policies) |
| Mutação simples (CRUD produto, status pedido) | Server Action | `supabase-js` `insert/update` + RLS |
| Operação privilegiada (repasse, antecipação, assinatura) | Server Action → API | **Edge Function existente** (`transfer-to-courier`, `request-advance`, …) via `supabase.functions.invoke` |
| Tempo real | Realtime subscribe | Realtime subscribe (mesmo canal) |

Regra: se uma mutação exigir lógica que hoje só existe dentro de um Server
Action (não em RLS/trigger/Edge Function), **a lógica desce para o backend
compartilhado** (Edge Function ou RPC) — nunca é copiada para o app. Isso
mantém Dashboard e app sempre concordando.

## 5. Por que `store_posts` e não estender uma tabela existente

Não existe tabela próxima. O Explorar é 100% mock no consumer. A forma do dado
está implicitamente especificada pelo `interface Reel` em
[`explorar.tsx`](../../apps/mobile-consumer/app/(tabs)/explorar.tsx):

```ts
interface Reel {
  id; loja_slug; loja_nome; loja_inicial;
  video_url; descricao; tags: string[];
  curtidas; comentarios;
  produto?: { nome; preco }
}
```

`loja_slug/loja_nome` derivam de `stores`. `produto` referencia `products`.
A tabela nova guarda só o que é próprio do post e referencia o resto. Com a
expansão de escopo (fotos além de vídeos), a entidade é **post de mídia**, não
"vídeo" — daí `store_posts` com `tipo`:

```
store_posts
  id, store_id (FK stores), tenant_id (FK tenants, denormalizado p/ RLS/índice),
  tipo (video|foto),
  media_path (fonte da verdade), media_url (derivado),
  thumb_path, thumb_url,
  descricao, tags text[], product_id (FK products, nullable),
  status (processing|published|hidden|removed),
  duracao_seg (só vídeo), largura, altura, bytes,
  curtidas int default 0, comentarios int default 0, views int default 0,
  moderacao (pending|approved|flagged|rejected),
  criado_em, atualizado_em, publicado_em
```

Detalhe completo (DDL + RLS + view) no Stage 0.

## 6. Post: por loja, não por tenant

O feed do consumer agrupa por loja (avatar, "Seguir", `router.push('/loja/
${reel.loja_slug}')`). Um tenant multi-loja precisa escolher **em qual loja** o
post aparece. Por isso `store_posts.store_id` é obrigatório; `tenant_id` é
denormalizado só para a policy RLS (`my_tenant_id()`) e índices — nunca como
fonte de verdade de a-qual-loja-pertence.

## 7. Pipeline de mídia — decisão e alternativas

**Decisão MVP (vídeo):** compressão no cliente (`react-native-compressor`),
alvo **≤ 60 s, ≤ 1080p, ~8 Mbps, ≤ ~40 MB**, thumbnail gerado no cliente
(`expo-video-thumbnails`). Upload do `.mp4` + `.jpg` direto pro bucket.
**Foto:** redimensionar/comprimir no cliente (`expo-image-manipulator`, alvo
≤ 1440 px / JPEG q≈0.85, tipicamente < 1 MB); `thumb` = a própria imagem.
`status` nasce `processing` e vira `published` quando os objetos confirmam no
Storage (sem transcode server-side).

| Opção | Prós | Contras | Veredito |
|---|---|---|---|
| **A. Compressão client + sem transcode** | zero infra; rápido de entregar; controla custo | qualidade/codec dependem do device; sem HLS adaptativo | **MVP** |
| B. Transcode server (Edge Function + ffmpeg/serviço) | output uniforme, HLS, moderação automática | infra/custo novos; fila; latência de publicação | pós-MVP, se escala exigir |
| C. Provedor de vídeo (Mux/Cloudflare Stream) | streaming adaptativo, thumbnails, analytics prontos | custo recorrente; novo vendor; dado de mídia sai do Supabase | reavaliar se Explorar virar core |

A escolha A é a única coerente com "entregar a praticidade rápido" e com a
postura de custo do projeto. B/C ficam documentados como caminho de evolução,
não bloqueiam o MVP. **Manter `media_path` como fonte da verdade** garante que
trocar pra B/C depois não exige migração do schema, só do pipeline.

## 8. Upload resumível (TUS)

Vídeo de celular em 4G/5G instável: multipart simples reinicia do zero a cada
queda. `supabase-js` suporta upload resumível (protocolo TUS) — usar isso, com
barra de progresso, retomada automática e a possibilidade de o upload continuar
com o app em foreground. Limite de tamanho e timeout configurados no bucket.
Foto (≤ ~1 MB) pode usar upload simples — TUS é obrigatório só para vídeo.

## 9. Segurança e acesso

- **Escrita**: só `authenticated` cujo `my_tenant_id()` casa com o prefixo do
  objeto (`{tenant_id}/{store_id}/...`) e cuja loja pertence ao tenant. Mesma
  mecânica das policies de `store-assets`/`product-images`.
- **Leitura do arquivo**: bucket público (igual `product-images`) — o consumer
  é anônimo, precisa tocar o vídeo/ver a foto sem sessão.
- **Leitura do metadado**: o consumer **não** lê `store_posts` direto; lê a
  view `public_explore_feed` exposta a `anon` (só linhas `published` +
  `moderacao = approved`). Decisão idêntica à do storefront.
- **Gate de publicação e de gestão**: tenant precisa estar utilizável (mesmo
  predicado do Dashboard — `pagarme_onboarding_status` / billing). Predicado
  centralizado em `packages/lib` (Stage 2), nunca duplicado.
- **Pilar Gestão**: nenhuma policy nova — o app opera sob as RLS que já
  protegem o Dashboard (`my_tenant_id()`). Qualquer SELECT/UPDATE que o app
  precise e a RLS não permita é sinal de erro de design, não de policy
  faltando "para o app".

## 10. Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| Escopo "app inteiro" vira big-bang sem entrega | alto | stages por módulo; pedidos (3) entrega valor sozinho; conteúdo (7–9) independente |
| Explorar é mock — escopo "vira backend inteiro" | alto | Stage 0 bloqueante do pilar Conteúdo, fechado antes de qualquer UI de publicação |
| Regra de negócio divergir entre web e app | alto | decisão §4: lógica compartilhada desce p/ backend; proibido copiar p/ o cliente |
| Vídeo grande / rede móvel ruim | upload falha, lojista desiste | TUS resumível + compressão client + feedback de progresso |
| Conteúdo impróprio publicado direto | reputação | `moderacao` default `approved` + flag + ação no Admin (decisão no 0) |
| Custo de storage/banda cresce | financeiro | limite por plano (trigger `plans.max_posts`), TTL/arquivamento de `removed` |
| Codec incompatível no `expo-video` do consumer | vídeo não toca | padronizar saída H.264/AAC mp4; validar no Stage 7 |
| Divergência do contrato `Reel` | consumer quebra ao sair do mock | Stage 0 publica o contrato; Stage 9 só consome — sem renegociar forma |
| Sessão lojista compartilhada entre superfícies | segurança | storage de sessão isolado por app (AsyncStorage do app), igual courier/consumer |
| Push de pedido não confiável | pedido perdido | Expo Notifications + fallback som/Realtime em foreground + badge (Stage 3) |

## 11. Não-objetivos do MVP

- Edição de vídeo (corte, filtros, música) — só trim básico se o picker nativo
  já oferecer.
- Carrossel de fotos (multi-imagem por post) — 1 foto por post no MVP.
- Comentários/curtidas escrevíveis a partir do Partner App (são do consumer).
- Agendamento de publicação.
- Onboarding/cadastro de tenant no app (fica no web).
- Gestão de staff, troca de template da loja, editor avançado de
  variações/modificadores (web-only no MVP — ver §3).
- Multi-idioma.
- Transcode/HLS server-side (ver §7, opção B).

Esses itens entram no roadmap pós-MVP, não na documentação de stages.
