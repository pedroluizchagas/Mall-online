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

> **Implementado:** `packages/lib/src/store-theme/presets.ts` (`ARQUETIPOS`). Os hex abaixo são os valores reais em código — refináveis sem quebra, pois lojas guardam só overrides.

Os **18 arquétipos** ([02](02-arquetipos-de-design.md)). Cada um tem **uma paleta default**; o eixo de paleta troca `bg/surface/ink/accent`. Treze vêm de referência; os cinco desenhados internamente são clinic/tech/market/utility/playful.

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
shape: radius soft, density comfortable, scale spacious
      (calibrado contra as refs: Aurum 20–24px, Esteem 40px — luxo arredondado suave)
```

### Soft Care (`soft`)
```
mode: light
color: bg #FBF6F2  surface #FFFFFF  ink #2A2A2A  inkMuted #7A7A7A
       accent #FF8A5B  accentInk #2A2A2A  line #F0E6DE
type: display = sans arredondada (ex: "Nunito"/"Quicksand"), body = sans
shape: radius round, density comfortable, scale regular
```

### Artisan Warm (`artisan`)
```
mode: light
color: bg #F4F0E9  surface #FBF9F4  ink #2B271F  inkMuted #6E6655
       accent #7C6A4E  accentInk #FFFFFF  line #E3DCCD
type: display = "Spectral" (serif), body = "Inter"
shape: radius soft, density comfortable, scale spacious
```

### Clinic (`clinic`) — farmácia / saúde / veterinária
```
mode: light
color: bg #F4F9F8  surface #FFFFFF  surfaceAlt #E9F3F1  ink #14302C  inkMuted #5A716D
       accent #0D7A6E  accentInk #FFFFFF  line #DCEAE7
type: display = "Inter", body = "Inter"
shape: radius soft, density compact, scale regular
```

### Tech (`tech`) — eletrônicos / tecnologia
```
mode: light
color: bg #FFFFFF  surface #F7F8FA  surfaceAlt #EEF1F5  ink #0B1220  inkMuted #5B6676
       accent #2563EB  accentInk #FFFFFF  line #E4E8EE
type: display = "Space Grotesk", body = "Inter"
shape: radius sharp, density compact, scale regular
```

### Market (`market`) — mercado / conveniência
```
mode: light
color: bg #FFFFFF  surface #FFFFFF  surfaceAlt #F4F6F3  ink #1B2519  inkMuted #5E6B59
       accent #22863A  accentInk #FFFFFF  line #E7EBE4
type: display = "Inter", body = "Inter"
shape: radius soft, density compact, scale compact
```

### Utility (`utility`) — construção / oficinas / autopeças
```
mode: dark
color: bg #14161A  surface #1D2025  surfaceAlt #262A31  ink #F4F5F7  inkMuted #9AA1AC
       accent #F5A623  accentInk #14161A  line #2D323A
type: display = "Archivo", body = "Inter"
shape: radius sharp, density compact, scale compact
```

### Playful (`playful`) — brinquedos / papelaria
```
mode: light
color: bg #FFFFFF  surface #FFFFFF  surfaceAlt #FFF3E6  ink #2A1A3E  inkMuted #6E5E80
       accent #7C3AED  accentInk #FFFFFF  line #F0E4F5
type: display = "Baloo 2", body = "Nunito"
shape: radius round, density comfortable, scale regular
```

> Semânticos fixos em todos os arquétipos: `success #16A34A`, `warning #E8A33D`, `danger #E5544B` — preserva consistência de status (ex.: estado de pedido).
> O `accentInk` é **validado por contraste** no resolve (`contrast.ts` / WCAG AA ≥ 4.5): override ruim do lojista é corrigido para preto/branco automaticamente.

## 3.4 Evolução do `stores.theme`

`stores.theme` continua **JSONB** (sem nova migração de coluna). Muda só o **shape** persistido.

**Antes:**
```json
{ "template": "market", "paleta": null }
```

**Depois** (shape real — `StoreThemeConfig` em `store-theme/types.ts`):
```json
{
  "v": 2,
  "preset": "heritage",
  "color": { "accent": "#8C5A2B", "accentInk": "#FFFFFF" },
  "fonts": { "display": "Fraunces", "body": "Inter" },
  "shape": { "radius": "soft", "density": "comfortable" },
  "mode": "light"
}
```

Regras (implementadas em `store-theme/resolve.ts`):
- `preset` é obrigatório; `color`/`fonts`/`shape`/`mode` são **overrides parciais opcionais** sobre o default do preset. Ausência → usa o default do arquétipo. JSON enxuto e resiliente à evolução dos presets.
- `v` versiona o shape. `theme` antigo (`{template,paleta}`) é tratado como `v1` e migrado por `normalizeThemeConfig`: `market→editorial`, `boutique→editorial`, `artesanal→artisan`, `neon→raw` (paletas v1 descartadas). Ver [07](07-roadmap-implementacao.md).
- A resolução final (`resolveTheme`) aplica defaults + overrides + correção de contraste do `accentInk`, e é a **única** porta usada por storefront, app e preview do onboarding ([04](04-theme-engine.md)).

## 3.5 Tipos compartilhados

**Implementado** em `packages/lib/src/store-theme/types.ts` (módulo aditivo, não-quebrante), exportado via `@mallevo/lib`:

```ts
export type ArquetipoCodigo =
  | 'heritage' | 'raw' | 'editorial' | 'noir' | 'soft' | 'artisan'
  | 'clinic' | 'tech' | 'market' | 'utility' | 'playful'   // os 11

export interface StoreThemeConfig {   // shape persistido em stores.theme
  v: 2
  preset: ArquetipoCodigo
  color?: Partial<ColorTokens>
  fonts?: { display?: string; body?: string }
  shape?: Partial<ShapeTokens>
  mode?: 'light' | 'dark'
}

export interface ThemeTokens { mode; color: ColorTokens; typography; shape }  // resolvido
```

> **Nota de migração:** `packages/types/src/domain.ts` ainda exporta os tipos v1 (`TemplateVitrine`/`PaletaVitrine`/`StoreTheme`) usados pelo `minha-loja-editor.tsx`. Consolidar/depreciar esses tipos a favor do `StoreThemeConfig` é a **Fase 3** ([07](07-roadmap-implementacao.md)) — feito junto com a troca do editor para os 11 arquétipos, para não quebrar o web agora.
