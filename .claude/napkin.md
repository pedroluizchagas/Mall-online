# Napkin Runbook

## Curation Rules
- Re-prioritize on every read.
- Keep recurring, high-value notes only.
- Max 10 items per category.
- Each item includes date + "Do instead".

## Execution & Validation (Highest Priority)
1. **[2026-08-08] Typecheck do mobile-consumer: não há `tsc` no root nem script `typecheck`**
   Do instead: `cd apps/mobile-consumer && ./node_modules/typescript/bin/tsc --noEmit`. O `npx tsc` cai no pacote-armadilha "not the tsc command". ESLint tem script `lint` mas o binário não está instalado — não perder tempo com ele.

## Shell & Command Reliability
1. **[2026-08-08] Downloads sequenciais de imagem (Unsplash/picsum) estagnam no sandbox**
   Do instead: paralelizar com subshells + `curl --max-time 15` e `sleep` de coleta; `curl -I` (HEAD) responde rápido para validar URLs antes.

## Domain Behavior Guardrails
1. **[2026-08-08] Transições de ambiente (entrar/sair de loja) têm padrão estabelecido**
   Do instead: entrada = `SplashLoja` (accent do lojista); saída = `TransicaoMallevo` no layout raiz + store `useTransicaoSaida` (a tela que navega desmonta e mata overlays locais — o véu TEM que viver acima do navigator). Curvas compartilhadas: ENTRADA bezier(0.16,1,0.3,1), SAIDA bezier(0.3,0,1,1), SUAVE bezier(0.4,0,0.2,1). Autoplay/parallax devem respeitar `AccessibilityInfo.isReduceMotionEnabled`.
2. **[2026-08-08] Layout por arquétipo no app consumidor**
   Do instead: gate por `design.arquetipo` (StoreDesign, lib/store-theme.tsx) + categoria da loja — nunca por slug de loja. Demo: `vitrine-fashion` (editorial/moda) usa `components/loja/LojaEditorial.tsx`; picsum é aleatório, lojas-demo com cara real usam fotos Unsplash de ID fixo via `catalogo`/`banner` no LojaSpec (lib/mock/dataset.ts).

## User Directives
1. **[2026-08-08] Design das lojas parceiras deve ser premium, não genérico "tipo iFood"**
   Do instead: ao mexer em telas de loja, replicar a linguagem do arquétipo (referências em docs/store-theme/02): foto grande, tipografia com contraste forte, zero chrome nos cards, acento só em micro-momentos.
2. **[2026-08-08] Transições de tela devem ser abstratas — sem wordmark, logo ou texto**
   Do instead: mudança de ambiente = COR + movimento. Direção aprovada: radial — círculo na cor da paleta da loja nasce do ponto do toque, cobre a tela e dissolve no canvas Mallevo (TransicaoMallevo; a tela passa cor/origem via useTransicaoSaida). Rejeitados: véu com marca "mallevo." e cortina dupla neutra. Não reintroduzir branding/texto em transições.
