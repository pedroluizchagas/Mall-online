# 01 — Arquitetura e Decisões

## 1. O que é isolado vs compartilhado

| Camada | Isolado por superfície | Compartilhado |
|---|---|---|
| Runtime / deploy (build Expo, EAS) | ✅ projeto próprio | — |
| UI / design tokens | ✅ `partner-design.ts` próprio | padrão herdado do courier |
| Auth provider | — | ✅ Supabase Auth (`auth.users`) |
| Identidade do lojista | — | ✅ `tenants` / `stores` |
| Storage de vídeo | — | ✅ bucket `explore-videos` |
| Tabela de conteúdo | — | ✅ `store_videos` |
| Feed consumido pelo Explorar | — | ✅ view `public_explore_feed` |
| Regras de negócio (limites de plano, status do tenant) | — | ✅ `packages/lib` / RLS |

O Partner App **nunca** reimplementa regra de negócio. Limite de vídeos por
plano, status do tenant (`pagarme_onboarding_status`), e ownership saem de RLS +
`packages/lib`, exatamente como o storefront faz com entrega/cobertura.

## 2. Por que app separado e não tela no Dashboard

O Dashboard (`apps/web`) é Next.js server-rendered, pensado para desktop e
gestão. Captura de vídeo é uma experiência **nativa**: câmera, permissões,
compressão, upload resumível com app em background. Forçar isso na web mobile
reproduz exatamente a fricção que o projeto quer eliminar. A própria base de
código já assumiu o padrão "uma superfície isolada por público" (storefront,
consumer, courier). O Partner App segue o mesmo padrão — é o gêmeo do
`apps/mobile-courier` para o público lojista.

## 3. Por que `store_videos` e não estender uma tabela existente

Não existe tabela próxima. O Explorar é 100% mock no consumer. A forma do dado
já está implicitamente especificada pelo `interface Reel` em
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
Logo a tabela nova guarda só o que é próprio do vídeo e referencia o resto:

```
store_videos
  id, store_id (FK stores), tenant_id (FK tenants, denormalizado p/ RLS/índice),
  storage_path, video_url (derivado), thumb_path, thumb_url,
  descricao, tags text[], product_id (FK products, nullable),
  status (processing|published|hidden|removed),
  duracao_seg, largura, altura, bytes,
  curtidas int default 0, comentarios int default 0, views int default 0,
  moderacao (pending|approved|flagged|rejected),
  criado_em, atualizado_em, publicado_em
```

Detalhe completo (DDL + RLS + view) no Stage 0.

## 4. Vídeo: por loja, não por tenant

O feed do consumer agrupa por loja (avatar, "Seguir", `router.push('/loja/
${reel.loja_slug}')`). Um tenant multi-loja precisa escolher **em qual loja** o
vídeo aparece. Por isso `store_videos.store_id` é obrigatório; `tenant_id` é
denormalizado só para a policy RLS (`my_tenant_id()`) e índices — nunca como
fonte de verdade de a-qual-loja-pertence.

## 5. Pipeline de vídeo — decisão e alternativas

**Decisão MVP:** compressão no cliente (`react-native-compressor` ou
`expo-video` + config), alvo **≤ 60 s, ≤ 1080p, ~8 Mbps, ≤ ~40 MB**, thumbnail
gerado no cliente (`expo-video-thumbnails`). Upload do `.mp4` + `.jpg` direto pro
bucket. `status` nasce `processing` e vira `published` quando os dois objetos
confirmam no Storage (sem transcode server-side).

| Opção | Prós | Contras | Veredito |
|---|---|---|---|
| **A. Compressão client + sem transcode** | zero infra; rápido de entregar; controla custo | qualidade/codec dependem do device; sem HLS adaptativo | **MVP** |
| B. Transcode server (Edge Function + ffmpeg/serviço) | output uniforme, HLS, moderação automática | infra/custo novos; fila; latência de publicação | pós-MVP, se escala exigir |
| C. Provedor de vídeo (Mux/Cloudflare Stream) | streaming adaptativo, thumbnails, analytics prontos | custo recorrente; novo vendor; dado de mídia sai do Supabase | reavaliar se Explorar virar core |

A escolha A é a única coerente com "entregar a praticidade rápido" e com a
postura de custo do projeto. B/C ficam documentados como caminho de evolução,
não bloqueiam o MVP. **Manter `storage_path` como fonte da verdade** garante que
trocar pra B/C depois não exige migração do schema, só do pipeline.

## 6. Upload resumível (TUS)

Vídeo de celular em 4G/5G instável: multipart simples reinicia do zero a cada
queda. `supabase-js` suporta upload resumível (protocolo TUS) — usar isso, com
barra de progresso, retomada automática e a possibilidade de o upload continuar
com o app em foreground. Limite de tamanho e timeout configurados no bucket.

## 7. Segurança e acesso

- **Escrita**: só `authenticated` cujo `my_tenant_id()` casa com o prefixo do
  objeto (`{tenant_id}/{store_id}/...`) e cuja loja pertence ao tenant. Mesma
  mecânica das policies de `store-assets`/`product-images`.
- **Leitura do arquivo**: bucket público (igual `product-images`) — o consumer é
  anônimo, precisa tocar o vídeo sem sessão.
- **Leitura do metadado**: o consumer **não** lê `store_videos` direto; lê a
  view `public_explore_feed` exposta a `anon` (só linhas `published` +
  `moderacao = approved`). Decisão idêntica à #4 do storefront.
- **Gate de publicação**: tenant precisa estar utilizável (alinhar com a regra
  já usada no `create-subscription`/courier: `pagarme_onboarding_status`).
  Definir no Stage 2/0 o predicado exato e centralizá-lo em `packages/lib`.

## 8. Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| Explorar é mock — escopo "vira backend inteiro" | alto | Stage 0 bloqueante e fechado antes de qualquer UI |
| Vídeo grande / rede móvel ruim | upload falha, lojista desiste | TUS resumível + compressão client + feedback de progresso |
| Conteúdo impróprio publicado direto | reputação | `moderacao` default `pending`/`approved` (decidir no 0) + flag + ação no Admin |
| Custo de storage/banda cresce | financeiro | limite por plano (reusar trigger de limite tipo `stores`), TTL/arquivamento de `removed` |
| Codec incompatível no `expo-video` do consumer | vídeo não toca | padronizar saída de compressão em H.264/AAC mp4; validar no Stage 3 |
| Divergência do contrato `Reel` | consumer quebra ao sair do mock | Stage 0 publica o contrato; Stage 5 só consome — sem renegociar forma |
| Sessão lojista compartilhada entre superfícies | segurança | storage de sessão isolado por app (AsyncStorage do app), igual courier/consumer |

## 9. Não-objetivos do MVP

- Edição de vídeo (corte, filtros, música) — só trim básico se o picker nativo
  já oferecer.
- Comentários/curtidas escrevíveis a partir do Partner App (são do consumer).
- Agendamento de publicação.
- Multi-idioma.
- Transcode/HLS server-side (ver §5, opção B).

Esses itens entram no roadmap pós-MVP, não na documentação de stages.
