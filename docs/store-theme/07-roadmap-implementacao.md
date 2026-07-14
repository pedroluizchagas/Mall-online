# 07 — Roadmap de implementação

> Ordem de implementação do StoreTheme, das fundações compartilhadas até o onboarding. Cada fase é entregável e testável isoladamente. Nada aqui quebra o `DashboardTemplate`.

## Fase 0 — Fundações compartilhadas (`packages/lib`) ✅ IMPLEMENTADA
**Objetivo:** o engine existe e é testado, sem ainda ser consumido.
- [x] `packages/lib/src/store-theme/`: `types.ts`, `presets.ts` (**11 presets** `ARQUETIPOS` — [03 §3.3]), `mapping.ts` (`CATEGORIA_SLUG_TO_ARQUETIPO`, cobertura das 20 categorias), `contrast.ts` (WCAG), `resolve.ts` (`resolveTheme` + `normalizeThemeConfig` migração v1→v2), `to-css-vars.ts`, `provider.tsx`. Exportado via `@mallevo/lib`.
- [x] Testes unitários (15): cobertura de categorias, defaults/overrides, theme nulo, migração v1, validação de contraste. Typecheck limpo.
- [ ] **(Fase 3)** `packages/types/src/domain.ts`: consolidar/depreciar `TemplateVitrine`/`PaletaVitrine`/`StoreTheme` v1 a favor do `StoreThemeConfig` — adiado para não quebrar o `minha-loja-editor.tsx` agora.
- **Saída:** `resolveTheme(raw) → ThemeTokens` confiável e compartilhado, com mapeamento categoria→arquétipo testado.

## Fase 1 — Storefront aplica o tema (web) ✅ IMPLEMENTADA
**Objetivo:** a vitrine web veste a loja. Maior impacto visível, menor superfície (single-tenant por request).
- [x] `components/store/StoreThemeRoot.tsx`: wrapper `<main>` injeta CSS vars via `toCssVars`/`resolveTheme` ([04 §4.3]). Ligado em `app/page.tsx`.
- [x] `tailwind.config.ts`: cores → `var(--token, <fallback Mallevo>)`. `app/globals.css` `:root` redefinido com os nomes de token de `toCssVars` (paleta Mallevo como default).
- [x] `lib/tenant.ts` já expõe `theme` (repassado ao wrapper; tipado `unknown` e resolvido na lib).
- [x] Componentes do catálogo tematizam por classe semântica sem mudança de markup (`StoreHeader`, `ProductCard`, `MenuSection`). `ProductModal`/CTAs: idioma "selecionado/primário" (`bg-ink text-accent`, que quebra em ~9/11 presets) migrado para `bg-accent text-accent-ink`; botões `bg-accent` usam `text-accent-ink`.
- [x] **Guard anti-regressão:** só sobrescreve quando há preset v2 explícito (`hasExplicitPreset`). Lojas sem tema / legado v1 → paleta Mallevo intacta. Build de produção + typecheck OK.
- [ ] **(adiado)** Fonts por arquétipo via `next/font` — tokens `--font-display/--font-body` já emitidos; carregamento dinâmico fica para refinamento (Fase 4).
- **Saída:** loja com `{v:2,preset:'noir'}` e outra com `{v:2,preset:'heritage'}` renderizam visivelmente diferentes; lojas atuais inalteradas.

## Fase 2 — App consumidor aplica o tema (mobile) ✅ IMPLEMENTADA
**Objetivo:** "o app se transforma na loja" ao entrar nela.
- [x] `lib/store-theme.tsx`: adaptador RN — `colorsFromTheme(theme)` mapeia `ThemeTokens`→forma de `consumerDesign.colors` (+`accentInk`); `StoreColorsProvider`/`useStoreColors` (contexto com **default = paleta Mallevo**).
- [x] `app/loja/[slug].tsx`: `select` passa a trazer `theme`; `colors = colorsFromTheme(loja.theme)`; árvore envolvida em `StoreColorsProvider`; FAB usa `accentInk`.
- [x] Componentes migrados de `consumerDesign.colors` (módulo) → `useStoreColors()` por componente: `ProdutoCard` (3), `ModalProduto` (9), `ui/Botao` (shared). Idioma "selecionado/primário" (`bg ink + texto/ícone accent`) → `accent + accentInk` (chips, checkbox, qty, CTA).
- [x] **Fronteira dentro/fora:** como o default do contexto é Mallevo, abas/home/checkout e componentes compartilhados (`Botao`) ficam idênticos fora da loja; só dentro de loja com preset v2 a pele muda. RN `Modal` preserva o contexto (modal tematiza junto).
- [x] **Guard anti-regressão:** `hasExplicitPreset` — loja sem tema / v1 → Mallevo intacto. `tsc --noEmit` limpo (remoção do `colors` de módulo garante que todo componente tem o hook).
- [ ] **(adiado)** Fonts via `expo-font` (Fase 4) e transição de motion ao entrar na loja.
- **Saída:** paridade visual storefront ↔ app para a mesma loja; lojas atuais inalteradas.

## Fase 3 — Editor de tema (lojista escolhe a pele) ✅ IMPLEMENTADA
**Objetivo:** o lojista escolhe e ajusta o tema sozinho.
- [x] `minha-loja-editor.tsx`: substitui `market/boutique/artesanal/neon` + 6 paletas pelos **11 arquétipos**, **sugeridos pela categoria** (`getArquetipoSugestao` → recomendados + outros estilos), com cards de preview (nome, descrição, mood). Preview do "celular" reusa o subsistema existente, agora alimentado por `temaFromTokens(resolveTheme(config))` — a MESMA engine do storefront/app ("o que vejo é o que publico"). Override de **cor de destaque** via color picker (+ restaurar). Tipografia mostra a fonte do arquétipo.
- [x] `loja-vitrine.ts`: grava `StoreThemeConfig v2` (`{v:2, preset, color?:{accent}}`); valida preset (enum dos 11) e accent (hex). `accentInk` é derivado no `resolveTheme` (contraste WCAG) na renderização.
- [x] `minha-loja/page.tsx`: passa `categoriaSlug` (sugere o arquétipo). `packages/types/supabase.ts`: coluna `theme` relaxada para `Json | null` (aceita v1 e v2).
- [x] Init resiliente: lê preset v2 salvo; senão sugere pela categoria. Build de produção web + `tsc` OK.
- [x] **Etapa de tema no onboarding** ([06 §6.1]): passo "Escolha o estilo da sua loja" (etapa 8/12) entre a confirmação da categoria e o nome — cards com mini-preview real (cores+forma via `ARQUETIPOS`/`RADIUS_STEPS_PX`), default sugerido pela categoria com badge "Recomendado". `onboard-tenant` valida o preset (whitelist dos 11) e grava `stores.theme` no INSERT: **toda loja nova nasce vestida**. ⚠️ Deploy da function pendente (ver nota `dados_bancarios` no commit).
- [x] **Extração de cor da logo** ([06 §6.3]) — sem dependência externa: quantização pura em `packages/lib/src/store-theme/logo-palette.ts` (`coresDominantes`: histograma 4 bits/canal → filtra neutras → ranqueia presença×saturação → dedup; logo neutra → `[]`, mantém default do arquétipo) + leitura de pixels via canvas no client (`apps/web/lib/cor-da-logo.ts`). No editor `/minha-loja`, swatches "Da sua logo" sugerem o accent ao subir/trocar a logo — sempre sugestão, `accentInk` validado por contraste no resolve.
- **Saída:** lojista escolhe um dos 11 estilos (sugeridos por nicho) + cor, vê o preview fiel e publica `StoreThemeConfig v2` que o storefront (Fase 1) e o app (Fase 2) renderizam.

## Tipos v1 (`packages/types/domain.ts`) ✅ REMOVIDOS (Fase 4)
`TemplateVitrine`/`PaletaVitrine`/`StoreTheme` removidos — substituídos por `StoreThemeConfig`/`ThemeTokens` em `@mallevo/lib`. Coluna `stores.theme` tipada como `Json | null`.

## Fase 4 — Refinamento (tipografia + limpeza) 🟡 PARCIAL
**Objetivo:** elevar de "funciona" para "premium".
- [x] **Tipografia dinâmica no storefront:** `StoreThemeRoot` resolve as fontes do arquétipo, injeta `<link>` do Google Fonts **só das famílias daquela loja** (eficiente por tenant) e seta `--font-display`/`--font-body`. `tailwind.config` ganha `font-display`/`font-body`; `globals.css :root` faz default = Jakarta (fora da loja inalterado). Títulos (`StoreHeader` nome, `MenuSection`, `ProductModal`) usam `font-display`; corpo herda `font-body`. Build de produção OK — cada arquétipo agora tem sua voz tipográfica (Heritage=Fraunces serif, Raw=Archivo, Noir=Cormorant, etc.).
- [x] **Limpeza dos tipos v1** (`domain.ts`).
- [x] **Forma + densidade + escala tipográfica no storefront (fim dos tokens mortos):** `scales.ts` (@mallevo/lib) define `RADIUS_STEPS_PX` (sharp/soft/round → escala sm–xl+pill), `DENSITY_SPACE_PX` (compact/comfortable → gutter/card/seção/sheet) e `TYPE_SCALE_FACTOR` (compact 0.93 / regular 1 / spacious 1.08). `toCssVars` emite `--radius-*`, `--space-*` e `--type-factor` (substituem os antigos `--type-scale`/`--density`, que nada consumia); `tailwind.config` aponta `borderRadius`/`spacing`/`fontSize` display para essas vars com fallback Mallevo. Dois arquétipos que diferem só em forma/densidade agora renderizam diferentes. Pesos 700 adicionados ao corpo de todos os presets (bold real em preço/CTA). `/produto/[id]` passou a envolver com `StoreThemeRoot` (deep-link vestia Mallevo por engano).
- [x] **Fonts + forma + densidade no mobile:** `expo-font` + `@expo-google-fonts/*` (8 famílias dos presets) instalados; `lib/store-fonts.ts` carrega **só as famílias da loja atual** ao entrar nela (`useThemeFonts`) e resolve peso mais próximo (`fontStyle` → `fontFamily` carregada ou `fontWeight` de sistema). `lib/store-theme.tsx` evoluiu de `StoreColors` para **`StoreDesign`** (colors + radius + spacing + typeFactor + display/body), com default = design Mallevo (zero regressão fora de loja). `loja/[slug]`, `ProdutoCard`, `ModalProduto` e `Botao` consomem raio/densidade/fontes do contexto.
- [x] **Fidelidade do preview do editor:** `temaFromTokens` passa a derivar raio (escala do mockup), família display (carregada via `googleFontsHref`, compartilhado com o storefront) e fator tipográfico; os mini-cards de seleção mostram o DNA de forma de cada arquétipo.
- [x] **Extração de cor da logo** ([06 §6.3]) — ver item na Fase 3 acima (implementada no editor `/minha-loja`).
- [x] **Paletas curadas por arquétipo** ([02 §2.4]) — `palettes.ts` (@mallevo/lib): 2 peles de cor alternativas por arquétipo (22 no total), aplicadas em camada no `resolveTheme` (preset → paleta → overrides). Persistência enxuta: `stores.theme.palette` guarda só o código; hex refináveis centralmente. Editor ganha seção "Paleta do estilo" (chips Original + alternativas); `publicarVitrine` valida contra o catálogo. Autoria garantida por teste: `accentInk`×`accent` e `ink`×`bg` com AA ≥ 4.5 em toda paleta E preset (o teste pegou e corrigiu 3 presets que reprovavam: soft accentInk → #2A2A2A, clinic accent → #0D7A6E, market accent → #22863A).
- [ ] Ajuste fino de raios contra as refs-âncora ([02](02-arquetipos-de-design.md)); mapeamento fino wizard→arquétipo ([06 §6.4]).

## Migração de dados (`stores.theme` v1 → v2)

`resolveTheme` trata em runtime; um backfill opcional normaliza o JSON:

| v1 `template` | → v2 `preset` |
|---|---|
| `market` | `editorial` |
| `boutique` | `editorial` |
| `artesanal` | `artisan` |
| `neon` | `raw` |

Paletas v1 (`midnight/ocean/...`) são descartadas (não tinham aplicação real); a paleta v2 passa a ser derivada da logo/arquétipo. Nenhuma loja perde dado visível, pois nada renderizava o tema antes.

## Critérios de pronto (DoD)

- Duas lojas de presets diferentes são **visivelmente distintas** no storefront **e** no app.
- A **mesma loja** é visualmente equivalente entre storefront e app.
- Nenhuma das duas cópias de `consumer-design.ts` é mais a fonte de cor dentro de loja.
- `theme` nulo nunca quebra a renderização.
- `DashboardTemplate` e `layoutPdp` seguem funcionando sem alteração.
