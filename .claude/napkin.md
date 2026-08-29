# Napkin Runbook

## Curation Rules
- Re-prioritize on every read.
- Keep recurring, high-value notes only.
- Max 10 items per category.
- Each item includes date + "Do instead".

## Execution & Validation (Highest Priority)
1. **[2026-08-08] Typecheck do mobile-consumer: não há `tsc` no root nem script `typecheck`**
   Do instead: `cd apps/mobile-consumer && ./node_modules/typescript/bin/tsc --noEmit`. O `npx tsc` cai no pacote-armadilha "not the tsc command". ESLint tem script `lint` mas o binário não está instalado — não perder tempo com ele.
2. **[2026-08-14] `@react-navigation/native` não é importável nos apps mobile (pnpm não faz hoist de dep transitiva)**
   Do instead: usar os re-exports do expo-router (`useFocusEffect`, `useNavigation`, `router`). Para "está em foco?": `useFocusEffect` + estado local — não importar `useIsFocused` direto.

## Shell & Command Reliability
1. **[2026-08-08] Downloads sequenciais de imagem (Unsplash/picsum) estagnam no sandbox**
   Do instead: paralelizar com subshells + `curl --max-time 15` e `sleep` de coleta; `curl -I` (HEAD) responde rápido para validar URLs antes.

## Domain Behavior Guardrails
1. **[2026-08-18] Busca do consumidor = overlay Concierge no Início, não rota**
   Do instead: mexer em busca → `components/home/Concierge.tsx` (recentes em `store/useBuscasRecentes`). Overlay fullscreen na home esconde a tab bar via `useImersao` (mesmo mecanismo do Explorar) e permanece montado ao navegar para a loja — resultados sobrevivem à volta, sem re-focar teclado. A rota `(tabs)/buscar` não existe mais.
2. **[2026-08-08] Transições de ambiente (entrar/sair de loja) têm padrão estabelecido**
   Do instead: entrada = `SplashLoja` (accent do lojista); saída = `TransicaoMallevo` no layout raiz + store `useTransicaoSaida` (a tela que navega desmonta e mata overlays locais — o véu TEM que viver acima do navigator). Curvas compartilhadas: ENTRADA bezier(0.16,1,0.3,1), SAIDA bezier(0.3,0,1,1), SUAVE bezier(0.4,0,0.2,1). Autoplay/parallax devem respeitar `AccessibilityInfo.isReduceMotionEnabled`.
3. **[2026-08-18] Campo em superfície escura → teclado escuro**
   Do instead: todo `TextInput` sobre marquise/surfaceDark/reels leva `keyboardAppearance="dark"` (iOS) + `selectionColor`/`cursorColor` accent. No `<Input>` isso já vem junto de `fundoEscuro`. Caret accent SÓ no escuro (lima é invisível sobre branco). Android: cor do teclado é do sistema, não forçável.
4. **[2026-08-18] IDs Unsplash "de memória" mentem — curar olhando**
   Do instead: antes de usar um ID em mock (banners, dataset), baixar candidatas w=400 pro scratchpad (paralelo + `curl --max-time 15`) e **Read como imagem** para conferir o conteúdo. HTTP 200 não basta: ID válido já rendeu estacionamento e doação de sangue no lugar de "vergalhão" e "entregador".
5. **[2026-08-18] Tipografia, degradê e neutros da marca vêm do painel web**
   Do instead: voz Mallevo = Plus Jakarta Sans (`useFontesMarquee()`: letreiro 700, statement 600, acento 600 itálico) sobre `marquee #18181B` + glow `marqueeGlow #C1F148` (≤22% alpha, só atmosfera — interação segue no `accent #D8FF3E`). Neutros claros = família zinco fumê (`canvas #F1F1F3`, `line #E4E4E7`; tokens TAMBÉM no tailwind.config.js — manter os dois em sincronia). Folha do home leva `VidroFosco` (nuvens SVG estilo iOS: sombra marquee 7%, inkSoft 7%, info 4%, white 55%, marqueeGlow 5% — só tokens). Referência canônica: apps/web (auth)/entrar. Space Grotesk é SÓ voz de lojista (lib/store-fonts.ts).
6. **[2026-08-20] Pisos na home do consumer = diretório + corredores, monocromático**
   Do instead: apresentação dos pisos vive em `components/home/Diretorio.tsx` (placas de wayfinding, scroll ancorado via `posicaoPorPiso`/`folhaY` na TelaHome) + letreiro de corredor em `SecaoLojas`. Ícone de piso = ícone de linha em `ICONE_POR_PISO` (ConsumerIcon) — o emoji de `PISOS` (@mallevo/lib) é fallback web/admin, nunca renderiza no consumer. Placas claras usam o material `ui/Vidro` (BlurView só no iOS; Android simula com `glassStrong` — N blurs dimezis na home custam caro), tokens `glass*` no consumer-design. Sem matiz por piso: identidade é ícone + tipografia, acento segue só em micro-momentos.
7. **[2026-08-08] Layout por arquétipo no app consumidor**
   Do instead: gate por `design.arquetipo` (StoreDesign, lib/store-theme.tsx) + categoria da loja — nunca por slug de loja. Demo: `vitrine-fashion` (editorial/moda) usa `components/loja/LojaEditorial.tsx`; picsum é aleatório, lojas-demo com cara real usam fotos Unsplash de ID fixo via `catalogo`/`banner` no LojaSpec (lib/mock/dataset.ts).

## User Directives
1. **[2026-08-26] Toda loja do consumer mostra a barra de navegação — sem exceção de arquétipo**
   Do instead: vitrine nova = `BarraMenu<Nome>` própria no arquivo (Início/Explorar/Pedidos/Perfil, Início aceso, `sairPara` na cor da casa). Molde A = fixa com fio (`LojaEditorial`); molde B = pílula flutuante quando a página troca de cor por seção (`LojaSmash`/`LojaForno`/`LojaRitual`). Nunca a TabBar de `(tabs)/_layout.tsx` — esse arquivo é intocável. Layout sem vitrine tem `BarraMenuPadrao` em `app/loja/[slug].tsx`. Teste-guarda em `packages/lib/.../store-theme.test.ts` quebra se faltar. Revogou o "sem barra de menu inferior" de ritual/horta/forno nos docs.
2. **[2026-08-08] Design das lojas parceiras deve ser premium, não genérico "tipo iFood"**
   Do instead: ao mexer em telas de loja, replicar a linguagem do arquétipo (referências em docs/store-theme/02): foto grande, tipografia com contraste forte, zero chrome nos cards, acento só em micro-momentos.
3. **[2026-08-08] Transições de tela devem ser abstratas — sem wordmark, logo ou texto**
   Do instead: mudança de ambiente = COR + movimento. Direção aprovada: radial — círculo na cor da paleta da loja nasce do ponto do toque, cobre a tela e dissolve no canvas Mallevo (TransicaoMallevo; a tela passa cor/origem via useTransicaoSaida). Rejeitados: véu com marca "mallevo." e cortina dupla neutra. Não reintroduzir branding/texto em transições.
