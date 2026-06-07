# 04 — Theme engine

> Como o `StoreTheme` salvo vira **estilo aplicado** no storefront (web) e no app consumidor (mobile), a partir de **um único pacote compartilhado** — acabando com as duas cópias hardcoded de `consumer-design.ts`.

## 4.1 Princípio

Uma só fonte de verdade de tokens, dois adaptadores de saída:

```
stores.theme (JSONB)
      │
      ▼
resolveTheme(theme)  ──►  ThemeTokens completos   [packages/lib/src/store-theme/]
      │                         │
      ├──────────────┐          │
      ▼              ▼          ▼
   web: CSS vars   mobile: RN context
   (:root style)   (ThemeProvider)
```

`resolveTheme` aplica os defaults do preset ([03 §3.3](03-design-tokens-e-schema.md)) e sobrepõe os overrides do lojista. Determinístico, puro, testável, sem dependência de plataforma.

## 4.2 Pacote compartilhado

Novo módulo `packages/lib/src/store-theme/`, espelhando a organização de `packages/lib/src/templates/`:

```
packages/lib/src/store-theme/
├── types.ts        // ThemeTokens, StoreTheme, ArquetipoCodigo, FontSpec
├── presets.ts      // os 6 presets default (tabela 03 §3.3)
├── resolve.ts      // resolveTheme(theme): ThemeTokens  + migração v1→v2
├── to-css-vars.ts  // ThemeTokens → Record<string,string> de CSS custom properties
├── provider.tsx    // <StoreThemeProvider> + useStoreTheme()  (web + RN, igual a templates/provider.tsx)
└── __tests__/
```

`provider.tsx` segue o padrão já provado em `packages/lib/src/templates/provider.tsx` (usa `createElement`, compatível com Next.js e Expo).

## 4.3 Adaptador web (storefront)

CSS custom properties aplicadas no nível da loja. Como o storefront é multi-tenant por host (uma loja por request — `apps/storefront/middleware.ts`), o tema entra no layout do servidor:

```tsx
// apps/storefront — server component que já carrega a store
const tokens = resolveTheme(store.theme)
const cssVars = toCssVars(tokens)   // { '--bg':'#FBF7F0', '--accent':'#8C5A2B', ... }

return <div style={cssVars} data-theme={tokens.mode}> {children} </div>
```

`tailwind.config.ts` passa a apontar para as vars em vez de hex fixos:

```ts
// antes: accent: '#D8FF3E'
// depois:
colors: { bg:'var(--bg)', surface:'var(--surface)', ink:'var(--ink)',
          accent:'var(--accent)', accentInk:'var(--accent-ink)', line:'var(--line)' }
```

Componentes que já usam `bg-accent`/`text-ink` (`StoreHeader`, `ProductCard`, `ProductModal`) **passam a respeitar o tema sem mudança de markup** — só trocam a origem da cor.

## 4.4 Adaptador mobile (consumer)

No app, o tema é carregado ao **entrar na loja** (`apps/mobile-consumer/app/loja/[slug].tsx`) e provido à subárvore:

```tsx
const tokens = resolveTheme(loja.theme)
<StoreThemeProvider value={tokens}>
  {/* tela da loja, header, cards, ModalProduto */}
</StoreThemeProvider>
```

Componentes deixam de importar `consumerDesign.colors.X` e passam a ler `useStoreTheme().color.X`. O `consumer-design.ts` atual vira o **fallback** (tema da home/abas, fora de loja) — ou é absorvido como o "tema Mallevo" default.

> **Transição de tela (o "app se transforma").** Ao navegar da home para a loja, animar a troca de tokens (fundo/accent) dá o efeito de "vestir a loja". Detalhe de motion fica para a implementação; o engine só precisa expor os tokens de origem e destino.

## 4.5 Fonts

- **Web:** carregar a `display`/`body` do tema via `next/font` por loja, com subset e `display:swap`. Conjunto fechado de fontes (uma por arquétipo) evita peso e FOUT.
- **Mobile:** pré-carregar o conjunto fechado de fontes via `expo-font` no boot; o tema só seleciona qual família usar. Não há download dinâmico de fonte arbitrária.

## 4.6 Fallbacks e segurança

- `theme` nulo/ausente → preset `editorial` (neutro) ou o tema Mallevo default. Nunca quebra.
- `theme` v1 antigo → `resolveTheme` migra (mapa em [07](07-roadmap-implementacao.md)).
- Override com cor inválida → ignora o override e usa o default do preset (validar no `resolve`).
- `accentInk` é sempre derivado/validado para contraste mínimo sobre `accent` (acessibilidade — ver [05 §5.5]).
</content>
