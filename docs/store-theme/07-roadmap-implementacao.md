# 07 — Roadmap de implementação

> Ordem de implementação do StoreTheme, das fundações compartilhadas até o onboarding. Cada fase é entregável e testável isoladamente. Nada aqui quebra o `DashboardTemplate`.

## Fase 0 — Fundações compartilhadas (`packages/lib`) ✅ IMPLEMENTADA
**Objetivo:** o engine existe e é testado, sem ainda ser consumido.
- [x] `packages/lib/src/store-theme/`: `types.ts`, `presets.ts` (**11 presets** `ARQUETIPOS` — [03 §3.3]), `mapping.ts` (`CATEGORIA_SLUG_TO_ARQUETIPO`, cobertura das 20 categorias), `contrast.ts` (WCAG), `resolve.ts` (`resolveTheme` + `normalizeThemeConfig` migração v1→v2), `to-css-vars.ts`, `provider.tsx`. Exportado via `@mallevo/lib`.
- [x] Testes unitários (15): cobertura de categorias, defaults/overrides, theme nulo, migração v1, validação de contraste. Typecheck limpo.
- [ ] **(Fase 3)** `packages/types/src/domain.ts`: consolidar/depreciar `TemplateVitrine`/`PaletaVitrine`/`StoreTheme` v1 a favor do `StoreThemeConfig` — adiado para não quebrar o `minha-loja-editor.tsx` agora.
- **Saída:** `resolveTheme(raw) → ThemeTokens` confiável e compartilhado, com mapeamento categoria→arquétipo testado.

## Fase 1 — Storefront aplica o tema (web)
**Objetivo:** a vitrine web veste a loja. Maior impacto visível, menor superfície (single-tenant por request).
- [ ] Layout raiz injeta CSS vars via `toCssVars` ([04 §4.3]).
- [ ] `tailwind.config.ts`: cores fixas → `var(--*)`.
- [ ] `apps/storefront/lib/tenant.ts`: tipar `theme` corretamente (hoje `unknown`) e repassar.
- [ ] Tematizar `StoreHeader`, `ProductCard`, `ProductModal`, `MenuSection` ([05 §5.1]).
- [ ] Fonts por arquétipo via `next/font`.
- **Saída:** duas lojas com presets diferentes renderizam visivelmente diferentes no storefront.

## Fase 2 — App consumidor aplica o tema (mobile)
**Objetivo:** "o app se transforma na loja" ao entrar nela.
- [ ] `app/loja/[slug].tsx`: carregar `theme`, envolver com `StoreThemeProvider` ([04 §4.4]).
- [ ] Migrar componentes de loja de `consumerDesign.colors` → `useStoreTheme()`.
- [ ] Manter tema Mallevo nas abas/home (fronteira dentro/fora — [05 §5.2]).
- [ ] Fonts via `expo-font` (conjunto fechado).
- [ ] (Opcional) transição de motion ao entrar na loja.
- **Saída:** paridade visual storefront ↔ app para a mesma loja.

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
