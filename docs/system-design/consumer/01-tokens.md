# 01 — Design Tokens

> Fonte de verdade visual do `mobile-consumer`. Espelha o `lib/courier-design.ts` do `mobile-courier` para que as duas apps compartilhem a mesma DNA. **Nenhum hex literal pode existir em código de UI fora deste arquivo.**

## 1. Onde mora

```
apps/mobile-consumer/
└── lib/
    └── consumer-design.ts   # tokens + helpers de formatação
```

`lib/` foi escolhido por simetria com o courier (`apps/mobile-courier/lib/courier-design.ts`). Não criamos `theme/` nem `design/` separado para reduzir divergência entre os dois apps.

## 2. Conteúdo final do arquivo

```ts
// apps/mobile-consumer/lib/consumer-design.ts
export const consumerDesign = {
  colors: {
    // — Backgrounds claros
    canvas: '#F3F3F1',         // fundo padrão de telas claras
    canvasAlt: '#E8E8E3',      // fundo levemente mais escuro (skeletons, separadores)
    surface: '#FFFFFF',        // card/painel claro
    surfaceMuted: '#ECECE9',   // pill de busca, chip inativo, divisor sutil

    // — Backgrounds escuros (destaque)
    surfaceDark: '#2F3034',    // card escuro principal (pedido ativo, header de loja, modais)
    surfaceDarkSoft: '#3A3B40',// camada interna de cards escuros (sub-painéis, inputs sobre dark)

    // — Texto
    ink: '#111216',            // texto principal e fundo da tab bar
    inkMuted: '#5E6168',       // texto secundário sobre fundo claro
    inkSoft: '#8B8E94',        // texto terciário, labels uppercase

    // — Linhas
    line: '#E5E5E0',           // bordas/divisores claros
    lineDark: '#4A4B50',       // bordas/divisores sobre dark

    // — Accent (CTA primário)
    accent: '#D8FF3E',         // lime — botões primários, estados ativos, indicadores
    accentStrong: '#C8F22E',   // lime mais saturado — pressed states, switches ativos
    accentSoft: 'rgba(216, 255, 62, 0.18)', // background de chip/avatar em accent

    // — Neutro
    white: '#FFFFFF',

    // — Status
    warning: '#F2B84B',        // em_preparo, pendente, aguardando
    success: '#8ED14F',        // entregue, confirmado
    danger: '#FF6D5E',         // cancelado, erro, destrutivo
    info: '#5BB7FF',           // confirmado/saiu para entrega (auxiliar — ver §5)
  },
  radius: {
    sm: 14,    // ícones quadrados, mini-chips
    md: 20,    // inputs, modais internos, mini-cards
    lg: 28,    // cards principais
    xl: 34,    // bottom sheets, tab bar flutuante
    pill: 999, // botões circulares, badges, chips
  },
  spacing: {
    // múltiplos de 4 — usar em paddings/margins/gaps
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 40,
  },
  typography: {
    // — Títulos
    display: { size: 32, weight: '800', tracking: -0.5 }, // hero (auth, splash)
    h1: { size: 28, weight: '800', tracking: -0.5 },      // tela primária
    h2: { size: 22, weight: '800', tracking: -0.3 },      // valores, métricas grandes
    h3: { size: 18, weight: '700', tracking: -0.2 },      // título de card

    // — Corpo
    bodyLg: { size: 16, weight: '500', tracking: 0 },     // texto destacado
    body: { size: 14, weight: '500', tracking: 0 },       // padrão
    bodySm: { size: 13, weight: '500', tracking: 0 },     // metadados

    // — Labels
    label: { size: 12, weight: '700', tracking: 0.5, uppercase: true }, // label de seção
    micro: { size: 11, weight: '700', tracking: 1.2, uppercase: true }, // status badge
  },
  motion: {
    fast: 150,    // hover, fade rápido
    base: 220,    // padrão de transições
    slow: 360,    // entrada de modal/sheet
    pulse: 1300,  // skeleton (650ms ida + 650ms volta)
  },
  shadow: {
    // valores prontos pra spread em StyleSheet (iOS) + elevation (Android)
    none: { shadowColor: 'transparent', shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0 },
    soft: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
    medium: { shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
    floating: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  },
  opacity: {
    pressed: 0.85,  // botão primário
    pressedSoft: 0.75, // botão secundário, list item
    disabled: 0.4,
    overlay: 0.4,   // background de modal/sheet
  },
} as const

// — Helpers (mantidos por simetria com courier-design.ts)

export function saudacaoPorHorario() {
  const hora = new Date().getHours()
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function abreviarNome(nome?: string | null) {
  if (!nome) return 'Cliente'
  const [primeiro, segundo] = nome.trim().split(/\s+/)
  return segundo ? `${primeiro} ${segundo}` : primeiro
}

export function formatarMomentoCurto(data?: string | null) {
  if (!data) return 'Sem atualização'
  return new Date(data).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// — Helper específico do consumer: aplica alpha 18% em uma cor de status para virar background de badge
export function softColor(hex: string) {
  // hex sempre no formato #RRGGBB
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, 0.18)`
}
```

> `info` é a única cor que **não** existe no courier. Foi adicionada porque o consumer tem 2 estados a mais no fluxo de pedido (`confirmado`, `saiu_para_entrega`) que precisam de cor distinta. Detalhamento em [`06-status-pedido.md`](./06-status-pedido.md).

## 3. Tabela de cores (referência rápida)

### Backgrounds
| Token | Hex | Uso |
|---|---|---|
| `canvas` | `#F3F3F1` | fundo padrão de tela |
| `canvasAlt` | `#E8E8E3` | skeleton, divisor de bloco |
| `surface` | `#FFFFFF` | card/painel claro |
| `surfaceMuted` | `#ECECE9` | pill de busca, chip inativo |
| `surfaceDark` | `#2F3034` | card escuro de destaque |
| `surfaceDarkSoft` | `#3A3B40` | sub-painel dentro de card escuro |

### Texto
| Token | Hex | Uso |
|---|---|---|
| `ink` | `#111216` | texto principal, fundo da tab bar |
| `inkMuted` | `#5E6168` | texto secundário |
| `inkSoft` | `#8B8E94` | texto terciário, labels |

### Linhas
| Token | Hex | Uso |
|---|---|---|
| `line` | `#E5E5E0` | divisor sobre fundo claro |
| `lineDark` | `#4A4B50` | divisor sobre fundo escuro |

### Accent
| Token | Hex | Uso |
|---|---|---|
| `accent` | `#D8FF3E` | CTA primário, estado ativo |
| `accentStrong` | `#C8F22E` | pressed state, switch ativo |
| `accentSoft` | `rgba(216, 255, 62, 0.18)` | background de avatar/chip em accent |

### Status
| Token | Hex | Aplicação no consumer |
|---|---|---|
| `success` | `#8ED14F` | entregue, confirmado, online |
| `warning` | `#F2B84B` | em_preparo, aguardando_entregador |
| `danger` | `#FF6D5E` | cancelado, erro, destrutivo (logout, remover) |
| `info` | `#5BB7FF` | saiu_para_entrega |

> `info` é a **única cor exclusiva do consumer**. Está documentada e centralizada para evitar regravação ad-hoc nas telas.

## 4. Tabela de raio

| Token | Valor (px) | Uso típico |
|---|---|---|
| `radius.sm` | 14 | quadrado de ícone, mini-chip |
| `radius.md` | 20 | input, modal interno, mini-card |
| `radius.lg` | 28 | card de loja, card de pedido, card de saldo |
| `radius.xl` | 34 | bottom sheet, tab bar flutuante |
| `radius.pill` | 999 | botão circular, badge, chip |

**Regra:** se você está prestes a digitar `borderRadius: 16`, pare. Use `radius.sm` (14) ou `radius.md` (20).

## 5. Tabela de tipografia

| Token | Size | Weight | Tracking | Caso de uso |
|---|---|---|---|---|
| `display` | 32 | 800 | -0.5 | hero das telas de auth, splash |
| `h1` | 28 | 800 | -0.5 | título de tela primária ("Meus pedidos") |
| `h2` | 22 | 800 | -0.3 | valores grandes (preço total, saldo) |
| `h3` | 18 | 700 | -0.2 | título de card |
| `bodyLg` | 16 | 500 | 0 | corpo destacado (descrições principais) |
| `body` | 14 | 500 | 0 | corpo padrão |
| `bodySm` | 13 | 500 | 0 | metadados (tempo de entrega, data) |
| `label` | 12 | 700 | 0.5 | label de seção (uppercase) |
| `micro` | 11 | 700 | 1.2 | texto de status badge (uppercase) |

**Regra:** `fontFamily: 'serif'` é proibido. Diferenciação só por size/weight/tracking. Sistema de fonte: `-apple-system` no iOS, `Roboto` no Android (padrão React Native, sem custom font).

### Font weight scale
```
400 → regular (raríssimo, só onde houver muito texto corrido)
500 → padrão de body
600 → labels secundários, descrições importantes
700 → títulos h3, labels uppercase, ações
800 → títulos grandes (display, h1, h2), valores monetários
```

## 6. Spacing

Múltiplos de 4. Usar tokens, não valores brutos.

| Token | Valor (px) | Uso |
|---|---|---|
| `xs` | 4 | gap pequeno entre ícone e texto |
| `sm` | 8 | gap interno de chip |
| `md` | 12 | gap entre cards em lista |
| `lg` | 16 | padding lateral de tela, gap de seções |
| `xl` | 20 | padding interno de card grande |
| `2xl` | 24 | espaço entre blocos majores |
| `3xl` | 32 | espaço antes/depois de hero |
| `4xl` | 40 | margem superior de telas auth |

## 7. Motion

| Token | Duração (ms) | Uso |
|---|---|---|
| `fast` | 150 | fade de chip ativo, hover sutil |
| `base` | 220 | padrão de qualquer transição |
| `slow` | 360 | entrada de modal/bottom sheet |
| `pulse` | 1300 | ciclo do skeleton (650ms ida, 650ms volta) |

`activeOpacity` (TouchableOpacity):
- `0.85` — botão primário, card clicável de destaque
- `0.75` — botão secundário, list item, chip
- `0.7` — ghost button, icon button

## 8. Shadow

iOS usa `shadowColor / shadowOpacity / shadowRadius / shadowOffset`. Android usa `elevation`. Os 4 tokens já trazem ambos:

| Token | Onde usar |
|---|---|
| `none` | reset explícito |
| `soft` | card claro flutuando sobre canvas |
| `medium` | card destacado (pedido ativo) |
| `floating` | tab bar, modais |

Aplicação:
```tsx
import { consumerDesign } from '@/lib/consumer-design'

<View style={[
  { backgroundColor: consumerDesign.colors.surface, borderRadius: consumerDesign.radius.lg, padding: 16 },
  consumerDesign.shadow.soft,
]} />
```

## 9. Tailwind config — espelho dos tokens

`apps/mobile-consumer/tailwind.config.js` é reescrito para expor os tokens de cor e raio como classes utilitárias. Tudo que não está aqui **não existe** como classe.

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        canvas: '#F3F3F1',
        'canvas-alt': '#E8E8E3',
        surface: '#FFFFFF',
        'surface-muted': '#ECECE9',
        'surface-dark': '#2F3034',
        'surface-dark-soft': '#3A3B40',
        ink: '#111216',
        'ink-muted': '#5E6168',
        'ink-soft': '#8B8E94',
        line: '#E5E5E0',
        'line-dark': '#4A4B50',
        accent: '#D8FF3E',
        'accent-strong': '#C8F22E',
        success: '#8ED14F',
        warning: '#F2B84B',
        danger: '#FF6D5E',
        info: '#5BB7FF',
      },
      borderRadius: {
        sm: '14px',
        md: '20px',
        lg: '28px',
        xl: '34px',
      },
    },
  },
  plugins: [],
}
```

> **Removidos**: `verde.*`, `ambar`, `coral`, `gold`, `creme`, `warm`, `ink.{200,300,400,500,700,900}`. Se o type-checker reclamar de uma classe morta, é porque o arquivo ainda não foi refatorado — é exatamente o sinal que queremos.

## 10. Convenções de uso

### Quando usar Tailwind className vs `consumerDesign.colors`

| Situação | Recomendação |
|---|---|
| Cor de background/border/text estática | className Tailwind (`bg-canvas`, `text-ink`, `border-line`) |
| Cor que muda dinamicamente (status badge, accent quando ativo) | `style={{ backgroundColor: consumerDesign.colors.[...] }}` |
| Radius simples | className (`rounded-lg`, `rounded-pill` via custom) |
| Radius dinâmico | `style={{ borderRadius: consumerDesign.radius.lg }}` |
| Tipografia | `style={{ fontSize, fontWeight, letterSpacing }}` derivado dos tokens (NativeWind não suporta letterSpacing nativo) |
| Shadow | sempre via `style={[..., consumerDesign.shadow.X]}` |

### Padrão de import

```tsx
import { consumerDesign } from '@/lib/consumer-design'

const { colors, radius, shadow } = consumerDesign
```

Reuso direto via desestruturação no topo do arquivo é encorajado para evitar `consumerDesign.colors.ink` repetido 30 vezes.

## 11. Casos limite (exceções permitidas)

Hex literal **fora** de `consumer-design.ts` só é tolerado em:

1. **`global.css`** — bloco `@tailwind` puro, sem cores customizadas.
2. **Overlays sobre vídeo** (Reels) — gradientes pretos com alpha (`rgba(0,0,0,0.55)`) são padrão de leitura sobre vídeo. Documentar inline com comentário curto.
3. **`assets/` e `app.json`** — splash backgroundColor e adaptive icon background. Mantemos sincronizados manualmente: `splash.backgroundColor` = `colors.ink` = `#111216`.
4. **Mapas (`react-native-maps`)** — pinos custom precisam de cor literal porque não recebem tema. Sempre que possível, derivar da paleta (`colors.accent`, `colors.ink`).

Qualquer outro hex em UI é bug — abrir issue ou corrigir em PR adjacente.

## 12. Migração da escala antiga (referência rápida para refactor)

| Atual (consumer hoje) | Novo (consumer alvo) |
|---|---|
| `bg-creme #F4F0EB` | `bg-canvas #F3F3F1` |
| `bg-verde-profundo #1A4D3A` | `bg-ink #111216` (botão primário vira `bg-accent`) |
| `text-verde-profundo` | `text-accent` (em CTA) ou `text-ink` (em texto) — caso a caso |
| `bg-verde-medio #4CAF82` | `bg-success #8ED14F` (status) ou `bg-accent` (CTA) |
| `text-ambar #D4A04A` | `text-warning #F2B84B` (status) ou remover |
| `text-coral #C75B3A` | `text-danger #FF6D5E` |
| `bg-ink-900 #1C1C19` | `bg-ink #111216` |
| `text-ink-700 #3D3D36` | `text-ink #111216` |
| `text-ink-500 #6B6B60` | `text-ink-muted #5E6168` |
| `text-ink-400 #8A8A7E` | `text-ink-soft #8B8E94` |
| `text-ink-300 #B0B0A5` | `text-ink-soft` (com `opacity-70`) |
| `border-ink-200 #D0D0C5` | `border-line #E5E5E0` |
| `bg-warm #E8E0D4` | `bg-canvas-alt #E8E8E3` |
| `bg-gold #C5975B` | (remover — sem equivalente no courier) |

## 13. Critério de aceite (Fase 1)

- [ ] `apps/mobile-consumer/lib/consumer-design.ts` existe e exporta `consumerDesign` com a forma documentada.
- [ ] `apps/mobile-consumer/tailwind.config.js` reescrito conforme §9.
- [ ] `apps/mobile-consumer/global.css` mantido (sem mudanças, só `@tailwind` directives).
- [ ] `pnpm --filter mobile-consumer typecheck` passa.
- [ ] Helpers `saudacaoPorHorario`, `abreviarNome`, `formatarMomentoCurto`, `softColor` exportados.
- [ ] Nenhum arquivo em `apps/mobile-consumer/` (fora dos próprios `lib/` e `tailwind.config.js`) é tocado nesta fase — refactor das telas vem nas fases seguintes.
