# Stage 1 — Scaffold `apps/mobile-partner`

> Gêmeo estrutural de `apps/mobile-courier`. Copiar a forma, não inventar.
> Depende do Stage 0 mergeado (tipos já incluem `store_videos`).

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
      _layout.tsx         tab bar
      index.tsx           "Meus vídeos" (galeria) — Stage 4
      publicar.tsx        captura/upload — Stage 3
      perfil.tsx          loja ativa + sair
    video/[id].tsx        detalhe/edição de um vídeo — Stage 4
  components/
    PartnerIcon.tsx       espelha CourierIcon/ConsumerIcon
  lib/
    supabase.ts           idêntico ao courier
    partner-design.ts     tokens (derivar do courier/consumer design)
  store/
    useAuthStore.ts       user + tenant + loja ativa
    useUploadStore.ts     fila/progresso de upload (Stage 3)
```

## package.json

Partir do `apps/mobile-courier/package.json` (mesmas versões — Expo SDK 54,
expo-router ~6, RN 0.81, React 19.1, nativewind ^4.2.3, zustand ^4.5,
`@supabase/supabase-js`, `@mallevo/lib`, `@mallevo/types`, AsyncStorage).

Trocar `name` → `mobile-partner`. **Adicionar** (instalar com versão compatível
do SDK 54 via `npx expo install`):

- `expo-camera` — gravação in-app
- `expo-image-picker` — escolher vídeo já gravado (courier já usa, alinhar versão)
- `expo-video` — preview/playback (mesma do consumer, `~3.0.16`)
- `expo-video-thumbnails` — thumbnail no cliente
- `react-native-compressor` — compressão de vídeo client-side
- `expo-file-system` — ler bytes/tamanho p/ upload TUS
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
        "NSCameraUsageDescription": "Para gravar vídeos da sua loja para o Explorar.",
        "NSMicrophoneUsageDescription": "Para capturar o áudio dos seus vídeos.",
        "NSPhotoLibraryUsageDescription": "Para escolher um vídeo já gravado."
      }
    },
    "android": {
      "package": "com.mallevo.partner",
      "permissions": ["CAMERA","RECORD_AUDIO","READ_MEDIA_VIDEO"]
    },
    "plugins": [
      "expo-router",
      "expo-notifications",
      ["expo-camera", { "cameraPermission": "Para gravar vídeos da sua loja." }]
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

`partner-design.ts`: derivar dos tokens já existentes (`courier-design.ts` /
`consumer-design.ts`). Não criar paleta nova — alinhar com a marca Mallevo
(memória do projeto: paleta já padronizada). Tela de captura usa base
dark/fullscreen como o Explorar do consumer.

## Critérios de aceite

- [ ] `pnpm --filter mobile-partner start` sobe o Expo.
- [ ] App abre, mostra splash, cai na `(auth)/entrar` (sem sessão) — telas
      ainda stub.
- [ ] `lib/supabase.ts` conecta (log de sessão nula sem erro).
- [ ] `tsc`/`eslint` do app passam (mesma config do courier).
- [ ] Nenhuma mudança em `apps/mobile-courier` / `apps/mobile-consumer`.
