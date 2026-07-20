# Stage 1 — Scaffold `apps/mobile-partner`

> Gêmeo estrutural de `apps/mobile-courier`. Copiar a forma, não inventar.
> Pode rodar em paralelo ao Stage 0 (os tipos de `store_posts` só são
> necessários a partir do Stage 7).

## Navegação do app (visão completa)

Cinco tabs, com **Publicar** central destacada (padrão Instagram/TikTok).
Módulos de gestão menos frequentes ficam atrás da tab **Menu** como rotas
stack — mesmo modelo dos apps de parceiro de mercado (iFood, Shopee):

```
┌─────────────────────────────────────────────────┐
│  Início   Pedidos   [ + Publicar ]   Conteúdo   Menu  │
└─────────────────────────────────────────────────┘
   │          │            │             │         │
   resumo     lista        câmera        grade     catálogo, financeiro,
   do dia     realtime     foto/vídeo    de posts  relatórios, minha loja,
   + atalhos  + detalhe    (Stage 7)     (Stage 8) avaliações, mensagens,
   (Stage 3)  (Stage 3)                            agenda, entregadores,
                                                   config, conta, ajuda
                                                   (Stages 4–6)
```

## Estrutura alvo

```
apps/mobile-partner/
  app.json
  package.json
  babel.config.js
  metro.config.js
  tsconfig.json
  tailwind.config.js
  nativewind-env.d.ts
  global.css
  assets/                 (icon, splash, adaptive-icon, lottie)
  app/
    _layout.tsx           bootstrap de sessão (espelha courier)
    index.tsx             redireciona p/ (tabs) ou (auth) conforme sessão
    (auth)/
      _layout.tsx
      entrar.tsx          login lojista (Stage 2)
    (tabs)/
      _layout.tsx         tab bar (5 tabs, Publicar central)
      index.tsx           "Início" — resumo do dia (Stage 3)
      pedidos.tsx         lista realtime de pedidos (Stage 3)
      publicar.tsx        captura foto/vídeo + upload (Stage 7)
      conteudo.tsx        "Meu conteúdo" (grade de posts) (Stage 8)
      menu.tsx            hub dos módulos de gestão (Stages 4–6)
    pedido/[id].tsx       detalhe do pedido (Stage 3)
    produtos/
      index.tsx           lista de produtos (Stage 4)
      novo.tsx            criar produto (Stage 4)
      [id].tsx            editar produto (Stage 4)
    categorias.tsx        gestão de categorias (Stage 4)
    estoque/
      index.tsx           visão de estoque (Stage 4)
      [id].tsx            movimentações do produto (Stage 4)
    financeiro.tsx        KPIs + repasses + antecipação (Stage 5)
    relatorios.tsx        relatórios (Stage 5)
    minha-loja.tsx        dados da loja + horários (Stage 6)
    avaliacoes.tsx        avaliações + resposta (Stage 6)
    mensagens/
      index.tsx           threads (Stage 6)
      [threadId].tsx      chat (Stage 6)
    agenda.tsx            agenda (Stage 6)
    entregadores.tsx      entregadores + convites (Stage 6)
    configuracoes.tsx     configurações (Stage 6)
    minha-conta.tsx       conta + assinatura (Stage 6)
    ajuda.tsx             tickets de suporte (Stage 6)
    post/[id].tsx         detalhe/edição de um post (Stage 8)
  components/
    PartnerIcon.tsx       espelha CourierIcon/ConsumerIcon
  lib/
    supabase.ts           idêntico ao courier
    partner-design.ts     tokens (mesma DNA de courier/consumer-design)
    notificacoes.ts       registro de push token (espelha courier)
  store/
    useAuthStore.ts       user + tenant + loja ativa
    usePedidosStore.ts    pedidos realtime + badge (Stage 3)
    useUploadStore.ts     fila/progresso de upload (Stage 7)
```

Neste stage **todas as telas nascem stub** (título + placeholder no design
system). Os stages seguintes preenchem cada grupo. Rotas stack de gestão podem
nascer num único grupo `(gestao)/` se o executor preferir — a forma final deve
espelhar como o courier organiza rotas fora de `(tabs)`.

## package.json

Partir do `apps/mobile-courier/package.json` (mesmas versões — Expo SDK 54,
expo-router ~6, RN 0.81, React 19.1, nativewind ^4.2.3, zustand ^4.5,
`@supabase/supabase-js`, `@mallevo/lib`, `@mallevo/types`, AsyncStorage).

Trocar `name` → `mobile-partner`. **Adicionar** (instalar com versão compatível
do SDK 54 via `npx expo install`):

- `expo-camera` — gravação/captura in-app
- `expo-image-picker` — escolher foto/vídeo da galeria (courier já usa, alinhar versão)
- `expo-video` — preview/playback (mesma do consumer, `~3.0.16`)
- `expo-video-thumbnails` — thumbnail no cliente
- `expo-image-manipulator` — redimensionar/comprimir fotos
- `react-native-compressor` — compressão de vídeo client-side
- `expo-file-system` — ler bytes/tamanho p/ upload TUS
- `expo-notifications` — push de pedido novo (mesma versão do courier)
- `expo-media-library` *(opcional)* — salvar/abrir da galeria

> Não fixar versões à mão: usar `npx expo install <pkg>` para casar com o SDK
> 54, como o resto do monorepo.

## app.json

Copiar de `apps/mobile-courier/app.json` e ajustar:

```jsonc
{
  "expo": {
    "name": "Mallevo Parceiro",
    "slug": "mallevo-partner",
    "scheme": "mallevo-partner",
    "ios": {
      "bundleIdentifier": "com.mallevo.partner",
      "infoPlist": {
        "NSCameraUsageDescription": "Para fotografar e gravar vídeos da sua loja para o Explorar.",
        "NSMicrophoneUsageDescription": "Para capturar o áudio dos seus vídeos.",
        "NSPhotoLibraryUsageDescription": "Para escolher fotos e vídeos já salvos."
      }
    },
    "android": {
      "package": "com.mallevo.partner",
      "permissions": ["CAMERA","RECORD_AUDIO","READ_MEDIA_VIDEO","READ_MEDIA_IMAGES"]
    },
    "plugins": [
      "expo-router",
      "expo-notifications",
      ["expo-camera", { "cameraPermission": "Para fotografar e gravar vídeos da sua loja." }]
    ],
    "extra": { "eas": { "projectId": "<NOVO_PROJECT_ID_EAS>" } },
    "owner": "pedrochagas"
  }
}
```

> `eas.projectId` é **novo** (criar projeto EAS próprio, igual courier tem o
> seu). Não reaproveitar o do courier. `EXPO_PUBLIC_PROJECT_ID` correspondente
> entra no `.env`/`.env.example` (já há precedente p/ as outras apps Expo).

## Workspace / build

- `apps/mobile-partner` é detectado pelo `pnpm-workspace.yaml` (glob `apps/*`)
  — confirmar, não duplicar config.
- `turbo.json`: alinhar com o que courier/consumer expõem (geralmente só
  `lint`; Expo `start` não passa pelo turbo). Não adicionar pipeline nova sem
  paralelo nas outras apps mobile.
- `metro.config.js` / `babel.config.js` / `tailwind.config.js` /
  `nativewind-env.d.ts` / `global.css`: copiar verbatim do courier (NativeWind
  4 já configurado lá).
- `lib/supabase.ts`: cópia exata do courier (mesmo client, AsyncStorage,
  `EXPO_PUBLIC_SUPABASE_URL/ANON_KEY`).

## `_layout.tsx` e `index.tsx`

Espelhar o bootstrap do courier
([`apps/mobile-courier/app/_layout.tsx`](../../apps/mobile-courier/app/_layout.tsx)):
`SplashScreen.preventAutoHideAsync()`, `supabase.auth.getSession()` +
`onAuthStateChange`, carregar entidade do banco e popular o store. A diferença
é a entidade carregada — em vez de `carregarCourier(userId)` →
`carregarTenant(userId)` (detalhe no Stage 2). `index.tsx` decide a rota
inicial pela sessão + estado do gate.

## Design system (`partner-design.ts`)

Mesma DNA de `courier-design.ts` / `consumer-design.ts` — **é o mesmo design
system dos apps mobile**, documentado em
`docs/system-design/consumer/01-tokens.md`:

- `colors`: canvas `#F3F3F1`, surface `#FFFFFF`, surfaceDark `#2F3034`, ink
  `#111216`, accent `#D8FF3E`, warning/success/danger idênticos. **Nenhum hex
  novo**; nenhum hex literal em código de UI fora deste arquivo.
- `radius`: 14/20/28/34/pill. `spacing`/`typography`/`motion`: copiar do
  consumer (superset do courier).
- Telas de captura e preview de conteúdo usam base dark/fullscreen como o
  Explorar do consumer (`colors.ink`); telas de gestão usam base clara
  (`canvas`) como o courier.

## Critérios de aceite

- [ ] `pnpm --filter mobile-partner start` sobe o Expo.
- [ ] App abre, mostra splash, cai na `(auth)/entrar` (sem sessão) — telas
      ainda stub.
- [ ] Tab bar com 5 tabs renderiza; todas as rotas stub navegáveis com sessão
      mockada em dev.
- [ ] `lib/supabase.ts` conecta (log de sessão nula sem erro).
- [ ] `partner-design.ts` presente com a DNA compartilhada (sem hex novo).
- [ ] `tsc`/`eslint` do app passam (mesma config do courier).
- [ ] Nenhuma mudança em `apps/mobile-courier` / `apps/mobile-consumer`.
