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

## Fase 3 — Onboarding e edição
**Objetivo:** o lojista escolhe e ajusta o tema sozinho.
- [ ] `minha-loja-editor.tsx`: trocar `market/boutique/artesanal/neon` pelos 6 arquétipos, com cards de preview vivos.
- [ ] `loja-vitrine.ts`: gravar `StoreTheme v2`.
- [ ] Extração de cor da logo + sugestão de paletas ([06 §6.3]).
- [ ] Etapa de tema dentro do fluxo de onboarding ([06 §6.1]).
- [ ] Validação de contraste no save.
- **Saída:** loja nova nasce com tema coerente sem intervenção manual.

## Fase 4 — Refinamento dos presets
**Objetivo:** elevar de "funciona" para "premium".
- [ ] Ajustar hex/fontes/raios de cada arquétipo contra as refs-âncora ([02](02-arquetipos-de-design.md)).
- [ ] Prova de conceito 1:1 com uma ref por arquétipo (ex.: reproduzir o "feel" de Veloria no `heritage`).
- [ ] Paletas adicionais por arquétipo.
- [ ] Mapeamento fino wizard→arquétipo ([06 §6.4]).

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
