# 03 — Design tokens e schema

> Define os **tokens** que um arquétipo+paleta resolvem, e a **evolução do `stores.theme`** de `{template,paleta}` genérico para um contrato de tokens real, consumível por web e mobile.

## 3.1 Estado atual dos tokens (a substituir)

Hoje cada app tem sua **cópia hardcoded**:

- `apps/storefront/lib/consumer-design.ts`
- `apps/mobile-consumer/lib/consumer-design.ts`

Ambas expõem a mesma paleta fixa Mallevo:

```ts
colors: { canvas:'#F3F3F1', surface:'#FFFFFF', accent:'#D8FF3E',
          ink:'#111216', success:'#8ED14F', warning:'#F2B84B', danger:'#FF6D5E', ... }
```

Problemas: (a) duplicado entre apps; (b) imutável por loja. O StoreTheme resolve os dois: tokens passam a ser **gerados a partir do tema da loja** por um engine compartilhado ([04](04-theme-engine.md)).

## 3.2 Contrato de tokens

Tokens são agrupados em 4 famílias. Os nomes seguem os já usados em `consumer-design.ts` para minimizar refactor de componentes.

```ts
interface ThemeTokens {
  color: {
    bg: string          // fundo da página (era 'canvas')
    surface: string     // cards, sheets
    surfaceAlt: string  // fundo secundário/hover
    ink: string         // texto principal
    inkMuted: string    // texto secundário
    line: string        // divisores/bordas
    accent: string      // CTA / destaque
    accentInk: string   // texto sobre accent (legibilidade garantida)
    // semânticos — podem ser fixos do Mallevo, fora do controle do lojista:
    success: string; warning: string; danger: string
  }
  type: {
    display: FontSpec   // títulos/hero (serifa no Heritage, sans no resto)
    body: FontSpec      // corpo
    scale: 'compact' | 'regular' | 'spacious'  // densidade tipográfica
  }
  shape: {
    radius: 'sharp' | 'soft' | 'round'   // 0–4px | 8–12px | 16–24px
    density: 'compact' | 'comfortable'   // paddings/gaps
  }
  mode: 'light' | 'dark'
}

interface FontSpec { family: string; weights: number[] }
```

## 3.3 Presets de tokens por arquétipo (valores iniciais)

Pontos de partida — refináveis. Hex derivados da análise das referências em [02](02-arquetipos-de-design.md). Cada arquétipo tem **uma paleta default**; o eixo de paleta troca `bg/surface/ink/accent`.

### Heritage (`heritage`)
```
mode: light
color: bg #FBF7F0  surface #FFFFFF  ink #1A1714  inkMuted #6B5E4F
       accent #8C5A2B  accentInk #FFFFFF  line #E8DFD2
type: display = serif (ex: "Fraunces"/"Playfair"), body = sans
shape: radius soft, density comfortable, scale spacious
```

### Raw / Street (`raw`)
```
mode: dark
color: bg #0E0E10  surface #18181B  ink #FAFAFA  inkMuted #A1A1AA
       accent #E0FF4F  accentInk #0E0E10  line #27272A
type: display = sans condensada pesada (ex: "Archivo"/"Anton"), body = sans
shape: radius sharp, density compact, scale compact
```

### Editorial Minimal (`editorial`)
```
mode: light
color: bg #FFFFFF  surface #FAFAFA  ink #111111  inkMuted #767676
       accent #111111  accentInk #FFFFFF  line #ECECEC
type: display = sans clean (ex: "Inter"/"Geist"), body = mesma
shape: radius sharp, density comfortable, scale regular
```

### Noir Luxe (`noir`)
```
mode: dark
color: bg #000000  surface #0C0C0C  ink #F5F5F5  inkMuted #8A8A8A
       accent #C9A24B  accentInk #000000  line #1C1C1C
type: display = serif/sans alto contraste com tracking largo, body = sans
shape: radius sharp, density comfortable, scale spacious
```

### Soft Care (`soft`)
```
mode: light
color: bg #FBF6F2  surface #FFFFFF  ink #2A2A2A  inkMuted #7A7A7A
       accent #FF8A5B  accentInk #FFFFFF  line #F0E6DE
type: display = sans arredondada (ex: "Nunito"/"Quicksand"), body = sans
shape: radius round, density comfortable, scale regular
```

### Artisan Warm (`artisan`)
```
mode: light
color: bg #F4F0E9  surface #FBF9F4  ink #2B271F  inkMuted #6E6655
       accent #7C6A4E  accentInk #FFFFFF  line #E3DCCD
type: display = sans/serif refinada, body = sans
shape: radius soft, density comfortable, scale spacious
```

> Semânticos (`success/warning/danger`) ficam fixos no padrão Mallevo em todos os arquétipos para preservar consistência de status (ex.: estado de pedido).

## 3.4 Evolução do `stores.theme`

`stores.theme` continua **JSONB** (sem nova migração de coluna). Muda só o **shape** persistido.

**Antes:**
```json
{ "template": "market", "paleta": null }
```

**Depois:**
```json
{
  "v": 2,
  "preset": "heritage",
  "palette": { "bg": "#FBF7F0", "surface": "#FFFFFF", "ink": "#1A1714",
               "accent": "#8C5A2B", "accentInk": "#FFFFFF" },
  "typography": { "display": "Fraunces", "body": "Inter" },
  "shape": { "radius": "soft", "density": "comfortable" },
  "mode": "light"
}
```

Regras:
- `preset` é obrigatório; demais campos são **overrides opcionais** sobre o default do preset. Ausência → usa o default do arquétipo. Isso mantém o JSON enxuto e o tema resiliente a evolução dos presets.
- `v` (versão do shape) permite migração suave. `theme` antigo (`{template,paleta}`) é tratado como `v1` e mapeado: `market→editorial`, `boutique→editorial`, `artesanal→artisan`, `neon→raw` (tabela em [07](07-roadmap-implementacao.md)).
- A resolução final (`preset default` + overrides) acontece no engine ([04](04-theme-engine.md)), não no banco.

## 3.5 Tipos compartilhados

Os tipos vivem em `packages/types/src/domain.ts`, **substituindo** `TemplateVitrine`/`PaletaVitrine`/`StoreTheme` atuais:

```ts
export type ArquetipoCodigo = 'heritage' | 'raw' | 'editorial' | 'noir' | 'soft' | 'artisan'
export interface StoreTheme { v: 2; preset: ArquetipoCodigo; palette?: Partial<...>; ... }
```

Os presets default (a tabela §3.3) vivem em `packages/lib/src/store-theme/presets.ts` — compartilhados por web e mobile, igual ao `packages/lib/src/templates/` do `DashboardTemplate`.
</content>
