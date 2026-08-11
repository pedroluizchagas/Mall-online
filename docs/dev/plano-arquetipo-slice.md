# Plano de execução — 19º arquétipo `slice` (pizzaria, ref. Restaurin / Pizza Lounge)

> **Para o executor (Opus 5):** este plano foi preparado com análise completa do design de
> referência (capturas mobile do template Framer **Restaurin** — `https://restaurin.framer.website/`)
> e do código existente. Siga as fases NA ORDEM. Nada dos 18 arquétipos existentes é
> alterado — o trabalho é 100% aditivo (fora a varredura de contagens "18 → 19" em
> comentários/docs e a inclusão do código novo em `PRESETS_VALIDOS`).
>
> **Antes de escrever qualquer código, leia estes arquivos** (vocabulário e padrão de
> qualidade a seguir):
> 1. `packages/lib/src/store-theme/types.ts`, `presets.ts`, `palettes.ts`, `mapping.ts`
> 2. `apps/mobile-consumer/components/loja/LojaHorta.tsx` + `ProdutoHorta.tsx` (+ `horta-ui.tsx`)
>    — o molde estrutural MAIS RECENTE (props, `useStoreDesign`, `fontStyle`, fonte-DNA
>    local, reduce-motion, saída via `useTransicaoSaida`, guarda de troca de loja no PDP,
>    helpers SVG extraídos)
> 3. `apps/mobile-consumer/components/loja/LojaSmash.tsx` — padrão de scroll-to e de caps
>    pesadas de apetite (e o que NÃO repetir — ver §0 "por que não é o smash")
> 4. `apps/mobile-consumer/app/loja/[slug].tsx` — gates e roteamento de vitrines
> 5. `apps/mobile-consumer/lib/store-fonts.ts` — contrato de fontes RN
> 6. `docs/store-theme/02-arquetipos-de-design.md` §2.2/§2.3/§2.5/§2.6 e
>    `docs/store-theme/05-aplicacao-storefront-consumer.md` §5.6 — formato da documentação
> 7. `apps/mobile-consumer/lib/mock/dataset.ts` — formato das lojas-demo e `CATEGORIA_CANON`
> 8. `packages/lib/src/store-theme/__tests__/store-theme.test.ts` — invariantes que o novo
>    arquétipo PRECISA passar (os testes iteram `ARQUETIPOS`/`PALETAS` dinamicamente)

> **Nota de escopo das capturas:** o plano foi destilado de 3 telas (hero, cardápio-pôster,
> statement/sobre). Se o usuário enviar mais telas do MESMO template antes da execução,
> o §0 e a Fase C devem ser complementados — sem mudar as decisões já fechadas do §1.

---

## 0. O design de referência (análise destilada das telas)

Referência: template Framer **Restaurin / "Pizza Lounge"** (`https://restaurin.framer.website/`),
pizzaria. Ignorar os botões "More Templates" / "All Access" / selo "Made in Framer" das
capturas — são chrome do Framer, não fazem parte do design.

**DNA visual (a gramática que a vitrine precisa reproduzir):**

1. **Quatro cores em blocos chapados full-bleed**: creme de página, PRETO de forno
   (hero/fecho, com textura de mármore escuro bem sutil), OURO (bloco do
   cardápio-pôster) e VERMELHO (CTA, cartões e toda a tipografia de display sobre creme
   e ouro). Não há gradientes — a força vem do color-block.
2. **Uma família tipográfica só, gritada**: grotesca ULTRA-pesada em caps para tudo que é
   display, trocando de cor por seção (ouro sobre preto no hero, vermelho sobre ouro nos
   nomes de pizza, vermelho sobre creme nos statements). Corpo minúsculo e raro, na mesma
   família. É a assinatura do template: uma voz, quatro cores.
3. **Motivo real/coroa**: o logo é um fruto coroado; o hero traz uma coroinha dourada
   isolada acima do wordmark ("PIZZA LOUNGE"); os nomes usam vocabulário nobre
   ("Margherita REGALE").
4. **Pizza como RECORTE REDONDO**: as fotos de pizza aparecem sem moldura, redondas
   (top-down), vazando entre seções — o hero termina com uma pizza gigante entrando por
   baixo. Tradução RN perfeita: máscara circular (`borderRadius: 999`) em foto top-down.
5. **Cardápio-pôster sobre OURO** (tela 2): bloco amarelo full-bleed onde cada pizza é
   foto redonda grande + nome em caps VERMELHAS gigantes logo abaixo — um pôster por item,
   empilhados verticalmente.
6. **Statement em caps vermelhas sobre creme** (tela 3): frase-manifesto gigante
   ("ELEGANT, UNFORGETTABLE PIZZA EXPERIENCE") com quebra agressiva.
7. **Cartão vermelho com círculos concêntricos**: foto redonda de pizza centrada num
   cartão vermelho full-width, com anéis finos concêntricos (traço claro translúcido)
   atrás dela — o "alvo".
8. **Cartão claro com selos circulares e rabiscos**: dois badges circulares vermelhos com
   ícones de pizza, título em caps vermelhas, fundo com line-art fantasma de cozinha
   (garfo, folhas) em traço bem claro.
9. **CTA em retângulo-pill vermelho** com texto creme em caps ("EXPLORE PIZZA ⌄").
10. Paleta completa observada: creme `#F6EFDE`, preto-forno `#1A150F` (com veios de
    mármore quase imperceptíveis), vermelho `#B3231B`–`#D8232A`, ouro `#F2A31B`.

**Por que é um arquétipo novo (justificativa exigida por docs/store-theme/02 §2.5):**
- **Não é o `smash`** (o outro fast-food de caps pesadas): smash é PÁGINA BORDÔ dark com
  laranja de accent, pills por toda parte e cardápio em folha creme — um mundo de cor
  contínuo. Slice é página CLARA creme fatiada em blocos chapados preto/ouro/vermelho,
  com recortes redondos, círculos concêntricos e coroa — gramática de cartaz de pizzaria,
  não de lanchonete. E o modo é `light`, não `dark`.
- **Não é o `roast`**: roast é pôster retrô VERDE dark de cafeteria, título repetido em
  degradê. Slice não tem verde, não é dark e o pôster dele é o bloco ouro com recortes.
- **Não é o `heritage`**: heritage é serifa clássica contida; slice é grotesca esmagada
  em color-swap, zero serifa.
- **Não é o `noir` gastronômico**: noir é luxo preto metálico serifado; o preto do slice
  é só UM dos quatro blocos, e a voz é pop-cartaz, não cerimônia.

---

## 1. Decisões fechadas (não rediscutir na execução)

| Decisão | Valor |
|---|---|
| Código do arquétipo | `slice` (inglês, como os demais) |
| Nome humano | `Slice` |
| Vitrine consumer | `LojaForno.tsx` + `ProdutoForno.tsx` (tradução PT como garden→Horta, roast→Torra); helpers compartilhados em `forno-ui.tsx` se a duplicação passar de ~40 linhas |
| Nicho | pizzarias, cantinas italianas, casas de massas |
| Gate da vitrine | `slice` + categoria === `alimentos-bebidas` |
| Mapping | alternativa em `alimentos-bebidas` |
| Token display | **Archivo** [700, 800] (grotesca pesada — já carregada; a voz do slice se diferencia pelo MUNDO DE COR e pelo peso 900 de DNA, mesmo racional Fraunces heritage/garden) |
| Token body | **Archivo** [400, 500, 600, 700] (a referência fala UMA família só — precedente de família única: soft/serene; **pesos 400/500 são registro novo em `store-fonts.ts`, sem dependência nova**) |
| Fonte DNA da vitrine (local, não-token) | **Archivo Black 900** (`Archivo_900Black` do MESMO pacote `@expo-google-fonts/archivo` — wordmark, nomes de pizza no pôster e statements; **zero dependência nova no repo**) |
| Modo | `light` |
| Shape | `radius: 'round'`, `density: 'comfortable'` |
| Type scale | `regular` |
| Loja-demo | **"Forno Real"**, slug `forno-real`, categoria canon nova `pizzaria` |

**Cores do preset — pré-calculadas para WCAG AA; o executor DEVE re-validar com
`contrastRatio` (packages/lib/src/store-theme/contrast.ts) antes de commitar:**

```
bg        #F6EFDE   (creme de página — o creme do header da referência)
surface   #FFFCF1   (cartão/sheet)
surfaceAlt#EFE4CB
ink       #1A150F   (preto-forno como tinta — ~13:1 sobre bg)
inkMuted  #6B6049   (castanho-oliva — alvo ≥ 4.5:1 sobre bg; descrições de item
                     escrevem DIRETO no creme, mesma exigência da garden/ritual)
line      #E8DEC5
accent    #B3231B   (vermelho aprofundado vs. a ref p/ AA real: serve de CTA E de
                     TINTA de display sobre o creme — ~5.6:1 sobre bg)
accentInk #F6EFDE   (~5.6:1 sobre accent)
```

**Constantes DNA da vitrine** (fixas como o `ROSA`/`CARAMELO` da horta — a paleta troca
`accent`, os blocos preto/ouro ficam):

```
PRETO_FORNO  #1A150F   bloco do hero e do fecho (carrega o wordmark ouro)
OURO         #F2A31B   bloco do cardápio-pôster; wordmark/coroa sobre o preto (~8:1)
CREME_FIXO   #F6EFDE   tinta fixa sobre PRETO_FORNO e sobre accent
TINTA_OURO   #1A150F   tinta fixa para texto PEQUENO sobre OURO (~8:1)
```

**Regra de contraste do pôster:** `accent` sobre `OURO` (os nomes vermelhos gigantes
sobre o bloco amarelo) só é permitido em display **≥ 24px bold** — exige ≥ 3:1 (AA large).
Validar nas 3 peles: `#B3231B` ≈ 3.0:1, `#2C5E34` ≈ 3.4:1, `#7A1F33` ≈ 4.8:1 sobre
`#F2A31B` — se a re-validação der < 3.0 em alguma, aprofundar o accent daquela pele.
Texto pequeno sobre OURO usa sempre `TINTA_OURO`.

**Paletas curadas (2, mesmo `mode: light`) — pré-calculadas, re-validar AA:**

```
basilico (Basílico) — a cantina verde-oliva; ouro e preto seguem servindo:
  bg #F4F1E2  surface #FDFBEF  surfaceAlt #EAE6CF
  ink #171B10  inkMuted #616550  line #E3DFC6
  accent #2C5E34 (verde-basílico)  accentInk #F4F1E2

vinho (Vinho) — a casa de massas ao tinto:
  bg #F7F0E2  surface #FFFBF0  surfaceAlt #EFE3CF
  ink #241318  inkMuted #6E5B54  line #EADFCA
  accent #7A1F33 (vinho)  accentInk #F7F0E2
```

Racional: como na horta, texto sobre os blocos fixos usa `CREME_FIXO`/`TINTA_OURO`
(não `colors.ink`) porque as paletas trocam a tinta; o wordmark ouro sobre o preto e o
creme sobre o accent funcionam nas 3 peles.

---

## FASE A — Tokens na lib (`packages/lib/src/store-theme/`)

### A1. `types.ts`
- Adicionar `| 'slice' // pizzarias/cantinas — creme fatiado em blocos preto/ouro/vermelho, caps esmagadas, recortes redondos` ao union `ArquetipoCodigo` (após `'garden'`).
- Atualizar o comentário `/** Os 18 arquétipos ... */` → 19.

### A2. `presets.ts`
- Comentário de cabeçalho "Catálogo dos 18 arquétipos" → 19.
- Inserir após o bloco `garden` (família alimentação):

```ts
// ── Referências: pizzarias / cantinas italianas ────────────────────────────
slice: {
  codigo: 'slice',
  nome: 'Slice',
  descricao:
    'Cartaz de pizzaria. Creme fatiado em blocos preto, ouro e vermelho, uma grotesca esmagada em caps trocando de cor por seção, pizzas em recorte redondo e coroa real. Para pizzarias e cantinas com fome de cena.',
  mood: ['apetitoso', 'majestoso', 'intenso'],
  referencias: ['https://restaurin.framer.website/'],
  tokens: {
    mode: 'light',
    color: pele({
      bg: '#F6EFDE',
      surface: '#FFFCF1',
      surfaceAlt: '#EFE4CB',
      ink: '#1A150F',
      // Castanho-oliva aprofundado: as descrições de item desta pele são
      // escritas DIRETO no creme da página (sem surface por baixo) — precisa
      // de AA contra bg, como na garden/ritual. Garantido em __tests__.
      inkMuted: '#6B6049',
      line: '#E8DEC5',
      // Vermelho aprofundado vs. a referência p/ AA real: além de CTA, é a
      // TINTA de todo o display sobre o creme (statements, nomes, preços).
      accent: '#B3231B',
      accentInk: '#F6EFDE',
    }),
    typography: {
      // A referência fala UMA grotesca pesada em caps, trocando de cor por
      // seção. Archivo também serve roast/smash — aqui a voz muda pelo
      // color-block e pelo peso 900 de DNA da vitrine, não pela família.
      display: { family: 'Archivo', weights: [700, 800] },
      body: { family: 'Archivo', weights: [400, 500, 600, 700] },
      scale: 'regular',
    },
    shape: { radius: 'round', density: 'comfortable' },
  },
},
```

### A3. `palettes.ts`
- Adicionar a chave `slice` em `PALETAS` com as paletas `basilico` e `vinho` (§1), com
  comentários curtos no estilo do arquivo (ex.: `// A cantina verde-oliva: o mesmo
  cartaz com o basílico no lugar do vermelho — ouro e preto seguem servindo.`).

### A4. `mapping.ts`
- `'alimentos-bebidas'`: alternativas → `['noir', 'roast', 'ritual', 'smash', 'garden', 'slice', 'market', 'soft']`.

### A5. Testes novos em `__tests__/store-theme.test.ts`
No `describe('qualidade de autoria dos ARQUETIPOS')`, espelhando o guard da garden:

```ts
it('slice: inkMuted e accent legíveis sobre bg — descrições e display escrevem direto no creme', () => {
  const peles = [
    ['preset', ARQUETIPOS.slice.tokens.color],
    ...PALETAS.slice.map((p) => [`paleta ${p.codigo}`, p.color] as const),
  ] as const
  for (const [nome, cor] of peles) {
    expect(
      contrastRatio(cor.bg, cor.inkMuted),
      `slice/${nome}: inkMuted ilegível sobre bg`,
    ).toBeGreaterThanOrEqual(4.5)
    // O accent é TINTA de nomes e preços em corpo pequeno sobre o creme.
    expect(
      contrastRatio(cor.bg, cor.accent),
      `slice/${nome}: accent ilegível como texto sobre bg`,
    ).toBeGreaterThanOrEqual(4.5)
  }
})

it('slice: accent sustenta display large sobre o bloco OURO do cardápio-pôster', () => {
  // Espelho da constante DNA `OURO` de LojaForno.tsx — se mudar lá, mudar aqui.
  const OURO = '#F2A31B'
  const peles = [
    ['preset', ARQUETIPOS.slice.tokens.color],
    ...PALETAS.slice.map((p) => [`paleta ${p.codigo}`, p.color] as const),
  ] as const
  for (const [nome, cor] of peles) {
    expect(
      contrastRatio(OURO, cor.accent),
      `slice/${nome}: accent ilegível como display sobre o ouro (mín. AA large)`,
    ).toBeGreaterThanOrEqual(3)
  }
})
```

Se algum hex pré-calculado do §1 reprovar, **aprofundar a cor reprovada** (não relaxar
o teste) e registrar o hex final neste plano ao lado do original.

### A6. Validar
```
pnpm --filter @mallevo/lib test
pnpm --filter @mallevo/lib typecheck
```
Os testes existentes iteram `ARQUETIPOS`/`PALETAS` dinamicamente — o slice entra nas
checagens de graça e DEVE passar sem correção de runtime.

---

## FASE B — Fontes no mobile (`apps/mobile-consumer`)

### B1. Sem dependência nova
`@expo-google-fonts/archivo` já está instalado. Conferir em
`node_modules/@expo-google-fonts/archivo/index.js` que `Archivo_400Regular`,
`Archivo_500Medium` e `Archivo_900Black` existem com esses nomes exatos.

### B2. `lib/store-fonts.ts`
- Comentário de cabeçalho "Fontes dos 18 arquétipos" → 19.
- Ampliar os imports e o registro `Archivo` em `FONTES`:
```ts
Archivo: {
  400: Archivo_400Regular,
  500: Archivo_500Medium,
  600: Archivo_600SemiBold,
  700: Archivo_700Bold,
  800: Archivo_800ExtraBold,
},
```
  (Aditivo — roast/smash/raw/volt/utility declaram só [600,700,800] e não mudam.)
- **Archivo Black 900 NÃO entra aqui** — é DNA da vitrine (carregado localmente no
  componente via `useFonts`, como o Shrikhand da ritual e o Baloo 800 da horta). A regra
  está no comentário do próprio arquivo.

---

## FASE C — Vitrine `LojaForno.tsx` (o grosso do trabalho)

Novo arquivo `apps/mobile-consumer/components/loja/LojaForno.tsx`. Contrato idêntico às
irmãs (props `{ loja, secoes, aoAbrirProduto, espacoFinal }` genéricas em
`ProdutoVitrine` — copiar as interfaces de `LojaHorta.tsx`). Usar `useStoreDesign()`,
`fontStyle`, `useTransicaoSaida` (saída radial no `PRETO_FORNO` — a vitrine abre e fecha
no preto), reduce-motion via `AccessibilityInfo` (padrão ritual/horta),
`StatusBar style="light"` (o topo é preto).

**Fonte DNA local:**
```ts
import { Archivo_900Black, useFonts } from '@expo-google-fonts/archivo'
// hook no estilo useFonteGroovy/horta:
//   display-DNA → Archivo_900Black, fallback fontStyle(display, 800)
// Usos: wordmark do hero, nomes no cardápio-pôster, statements, nome no fecho.
```

**Chrome:** dois botões circulares fixos no topo (zIndex alto, `insets.top`): voltar à
esquerda, sacola à direita com contador (badge no `colors.accent`). Fundo `CREME_FIXO`
com borda fina `comAlfa(PRETO_FORNO, 0.15)` + sombra `consumerDesign.shadow.soft` —
legíveis sobre o preto do hero, o ouro e o creme. **Sem FAB de carrinho** (regra das
vitrines). Sacola: `totalItens > 0 && router.push('/checkout')`; voltar via
`sairPara(() => router.back())`.

**Helpers a criar** (todos com `react-native-svg`, já dependência; extrair para
`forno-ui.tsx` o que o PDP reutilizar):

1. `Coroa({ size, cor })` — a coroinha de 3 pontas: `Svg` com um `Path` único (base
   retangular + 3 triângulos, pontas com `strokeLinejoin="round"`) — simples e chapada,
   como a da referência. Decorativa, `pointerEvents="none"`.
2. `PizzaRedonda({ uri, size, borda? })` — o recorte redondo: `Image` em `cover` com
   `borderRadius: size / 2` e `overflow: 'hidden'`; prop opcional `borda` desenha um
   anel fino (`borderWidth` hairline em `comAlfa(cor, 0.25)`). Fotos top-down de pizza
   fazem o cutout de graça.
3. `CirculosConcentricos({ size, cor })` — 3–4 `Circle` SVG concêntricos só de `stroke`
   fino (1.5), raios ~0.55/0.7/0.85/1.0 do size, em `comAlfa(cor, 0.25)`. Vai ATRÁS da
   `PizzaRedonda` (View absoluta centrada), `pointerEvents="none"`.
4. `RabiscoCozinha({ cor })` — line-art fantasma do cartão claro: 2–3 `Path` de traço
   fino (garfo estilizado + raminho de folhas) em `comAlfa(cor, 0.08)`, cantos do
   cartão, `pointerEvents="none"`. Se o desenho do path complicar, degradar para
   raminhos simples (haste + 4 folhas-elipse) — NÃO usar imagem rasterizada.
5. `comAlfa(hex, alpha)` — copiar da horta.

**Seções, na ordem (blocos full-bleed chapados — o diferencial do arquétipo):**

1. **HeroForno** — bloco `PRETO_FORNO`, `minHeight ~82%` da tela:
   - textura: 2–3 formas orgânicas `comAlfa('#FFFFFF', 0.03)` (o mármore da referência,
     quase imperceptível);
   - `Coroa` em `OURO` (~28px) centrada acima do wordmark;
   - wordmark: `loja.nome` em caps, quebrado em palavras empilhadas, Archivo Black 900,
     cor `OURO`, corpo grande (~62–70 × typeFactor, `adjustsFontSizeToFit` por linha,
     tracking levemente negativo);
   - descrição da loja (se houver) em Archivo 500 `CREME_FIXO`, 2 linhas, central;
   - CTA retângulo-pill `colors.accent`: "VER CARDÁPIO ⌄" em `accentInk` caps Archivo
     700 espaçadas → rola até o cardápio (padrão scroll-to da smash: `onLayout` + ref
     do ScrollView);
   - base do hero: `PizzaRedonda` GIGANTE (banner_url ?? primeira foto de produto,
     diâmetro ~92% da largura) ancorada com `marginBottom` negativo para VAZAR sobre a
     seção seguinte; a seção seguinte compensa com `paddingTop`. Se a foto não for
     top-down o círculo continua funcionando (cover centrado).
2. **PosterForno** — a seção-assinatura (tela 2): bloco full-bleed `OURO`:
   - eleger a seção de destaque como a horta elege favoritos:
     `secoes.find(s => /pizza|favorit|destaque|especia|da casa/.test(titulo.toLowerCase()))`;
     fallback: primeiros 3–4 produtos com foto. A seção eleita sai do cardápio corrente
     (mesmo `useMemo` de exclusão da ritual/horta);
   - rótulo do bloco em `TINTA_OURO` caps Archivo 700 espaçadas 12px ("AS PIZZAS DA
     CASA" ou o título da seção eleita);
   - cada item (3–4, empilhados verticalmente como na referência):
     `PizzaRedonda` grande (~72% da largura, centrada) + nome em Archivo Black 900
     `colors.accent`, caps, gigante (~34–40px, `adjustsFontSizeToFit`, 2 linhas,
     central — a regra AA large do §1 cobre isso) + linha de preço em Archivo 700
     `TINTA_OURO` 15px (promo: preço antigo riscado ao lado, corpo menor);
   - toque no item → `aoAbrirProduto(p)`;
   - o último item vaza levemente para fora do bloco (marginBottom negativo sutil) —
     eco do overlap do hero.
3. **StatementForno** (tela 3, parte 1) — sobre o creme:
   - frase-manifesto em Archivo Black 900 `colors.accent`, caps, ~30px, quebra natural
     (usar 1ª frase da `loja.descricao`; fallback DNA fixo:
     "UMA EXPERIÊNCIA DE PIZZA INESQUECÍVEL");
4. **AlvoForno** (tela 3, parte 2) — cartão full-width `colors.accent`, raio 28:
   - `CirculosConcentricos` em `CREME_FIXO` atrás de uma `PizzaRedonda` central
     (2ª foto disponível);
   - abaixo, dentro do cartão: nome da loja em Archivo 700 `CREME_FIXO` caps pequeno;
5. **CasaForno** (tela 3, parte 3) — cartão `colors.surface`, raio 28, logo abaixo:
   - dois badges circulares `colors.accent` (~44px) lado a lado com `Coroa` e um
     triângulo-fatia (`Path` simples) em `accentInk`;
   - título curto em Archivo 800 `colors.accent` caps central ("A MELHOR PIZZA DA
     CIDADE" ou derivado da descrição);
   - `loja.descricao` completa em Archivo 400 `colors.inkMuted` central;
   - `RabiscoCozinha(colors.ink)` nos cantos;
6. **CardapioForno** — lista completa sobre o creme (a referência não mostra tela de
   lista; manter sóbrio na mesma voz):
   - por seção: título Archivo 800 `colors.accent` caps 20px + hairline `colors.line`;
   - item: thumb redonda 56px (`PizzaRedonda` pequena, se foto), nome Archivo 700
     `colors.ink` 16px, descrição Archivo 400 13px `colors.inkMuted` (1 linha,
     ellipsis), preço Archivo 700 15px `colors.accent` (promo: riscado menor em
     `colors.ink` ao lado);
   - toque → `aoAbrirProduto(p)`.
7. **FechoForno** — bloco `PRETO_FORNO` (footer): `Coroa` `OURO` pequena, nome da loja
   em Archivo Black 900 `OURO` caps, linha `ABERTO · N MIN · HH:MM` em Archivo 600
   `CREME_FIXO` caps espaçadas (relógio vivo de 30s — copiar `horaAgora` da
   ritual/horta; horário de HOJE derivado de `loja.horarios`, chaves `seg…dom`,
   `{ abre, fecha }`, via `new Date().getDay()`; ausente → omitir).

**Props de `loja` usadas:** `nome, descricao, banner_url, tempo_entrega, taxa_entrega,
horarios` — declarar `horarios?: Record<string, { abre: string; fecha: string }> | null`
no Props local (padrão horta).

**Performance/acessibilidade:** NÃO há marquee nem loop animado nesta vitrine (a
referência não tem) — zero animação contínua; só a transição de saída e o feedback de
toque. Todo texto sobre os blocos fixos usa `CREME_FIXO`/`TINTA_OURO`; accent sobre OURO
só nos nomes gigantes (regra AA large do §1). Reduce-motion: sem efeito a desligar além
da transição de saída (que já respeita o padrão das irmãs).

---

## FASE D — PDP `ProdutoForno.tsx`

Novo arquivo `apps/mobile-consumer/components/loja/ProdutoForno.tsx`. **Copiar os ossos
de `ProdutoHorta.tsx`** (Modal full-screen, galeria via `metadata.galeria`, checagem
`product_option_groups`/`product_modifier_groups` → delega ao `ModalProduto`, guarda de
troca de loja com diálogo, CTA que pisca "NA SACOLA ✓", `useCartStore`). Trocar o palco
e a pele:

- fundo `colors.bg` (creme); botão fechar = botão circular do chrome da vitrine;
- **palco**: o "alvo" da referência — `CirculosConcentricos` em `comAlfa(colors.accent, 0.2)`
  sobre o creme, com `PizzaRedonda` grande (~82% da largura) centrada por cima; galeria
  (se houver) em pager horizontal com dots `colors.accent`; badge circular `colors.accent`
  pequeno rotacionado no canto com `Coroa`/texto `accentInk` caps 10px — `OFERTA` quando
  `preco_promocional`, senão `DA CASA`;
- ficha sobre o creme: nome em Archivo Black 900 `colors.accent` caps grande
  (carregar a DNA local aqui também); descrição Archivo 400 `colors.inkMuted`; preço
  Archivo 700 `colors.ink` (promo: riscado ao lado);
- diálogo de troca de loja: cartão `surface`, títulos Archivo — mesmo copy das irmãs;
- CTA fixo inferior: retângulo-pill `colors.accent` full-width, `accentInk` caps
  "ADICIONAR · R$ X" → ao confirmar pisca para `PRETO_FORNO` com "NA SACOLA ✓" em
  `OURO` (eco do hero; padrão smash/ritual/horta).
- Helpers `Coroa`/`PizzaRedonda`/`CirculosConcentricos`/`comAlfa` vêm de `forno-ui.tsx`.

---

## FASE E — Roteamento em `app/loja/[slug].tsx`

Padrão existente, mudanças mínimas e mecânicas:

1. Imports de `LojaForno`/`ProdutoForno`.
2. Gate simples (sem Set — categoria única, como roast/smash/ritual):
   ```ts
   // Forno: pizzarias/cantinas (creme fatiado em preto/ouro/vermelho, recortes
   // redondos e coroa).
   const vitrineForno =
     design.arquetipo === 'slice' && loja?.categoria_slug === 'alimentos-bebidas'
   ```
3. `vitrineForno` entra no `if (...)` grande, na cadeia do `Vitrine` (antes do fallback
   `LojaEditorial`) e na cadeia do `Pdp` — ramo genérico, como a horta.

---

## FASE F — Backend/validação de onboarding

### F1. Nada a fazer na web
`apps/web` enumera `Object.keys(ARQUETIPOS)` e `PALETAS[preset]` dinamicamente; o
storefront web aplica tokens via `StoreThemeRoot` (Archivo já vem do Google Fonts com
todos os pesos pedidos). **Zero mudanças.**

### F2. `supabase/functions/onboard-tenant/index.ts`
`PRESETS_VALIDOS` (linha ~38) hoje tem os 18 códigos — adicionar `'slice'` → 19.

---

## FASE G — Loja-demo "Forno Real" (`apps/mobile-consumer/lib/mock/`)

### G1. `dataset.ts`
1. Em `CATEGORIA_CANON`, adicionar:
   `pizzaria: { slug: 'alimentos-bebidas', nome: 'Pizzaria' },`
2. Nova loja junto às casas de alimentação (mesmo piso das lojas de praça — seguir o
   piso do "Burger House DV"/"Sabor Mineiro" para reforçar a praça de alimentação):

```ts
{
  nome: 'Forno Real',
  slug: 'forno-real',
  descricao: 'Uma experiência de pizza inesquecível — massa de fermentação longa, forno a lenha e coroa na borda.',
  taxa: 590,
  tempo: 40,
  categoriaSlug: 'pizzaria',
  // Loja-demo da vitrine forno (Restaurin/Pizza Lounge): creme fatiado em
  // blocos preto/ouro/vermelho, pizzas em recorte redondo e coroa real.
  preset: 'slice',
  logo: LOGO_FORNO_REAL,
  banner: fotoModa('1513104890138-7c749659c1d1', 900, 900), // VERIFICAR (ver nota)
  catalogo: [
    [
      // O rótulo casa com o regex /pizza|da casa/ que elege a seção do pôster.
      'Pizzas da casa',
      [
        ['Margherita Reale', 5490, 'San Marzano · fior di latte · manjericão fresco · azeite', fotoModa('...')],
        ['Pepperoni Coroada', 6290, 'Pepperoni artesanal · muçarela · orégano da serra', fotoModa('...')],
        ['Quatro Queijos do Reino', 6490, 'Muçarela · gorgonzola · parmesão · provolone defumado', fotoModa('...')],
        ['Capricciosa', 6190, 'Presunto cotto · cogumelos · alcachofra · azeitona preta', fotoModa('...')],
      ],
    ],
    [
      'Clássicas',
      [
        ['Calabresa da Corte', 5290, 'Calabresa fatiada · cebola roxa · azeitonas', fotoModa('...')],
        ['Portuguesa', 5690, 'Presunto · ovo caipira · ervilha · cebola', fotoModa('...')],
        ['Napolitana', 5490, 'Tomate em rodelas · muçarela · parmesão · manjericão', fotoModa('...')],
      ],
    ],
    [
      'Massas & entradas',
      [
        ['Burrata com Tomate Confit', 3890, 'Burrata cremosa · confit da casa · pão de fermentação', fotoModa('...')],
        ['Gnocchi ao Pomodoro', 4290, 'Batata da roça · pomodoro rústico · parmesão', fotoModa('...')],
      ],
    ],
    [
      'Bebidas & doces',
      [
        ['Refrigerante Artesanal 355ml', 990, 'Cola, guaraná ou limão siciliano', fotoModa('...')],
        ['Tiramisù da Casa', 2490, 'Mascarpone · café coado · cacau amargo', fotoModa('...')],
      ],
    ],
  ],
},
```

**Fotos — regra obrigatória (mesma da garden):** os IDs acima estão como `'...'`
DE PROPÓSITO — o executor deve escolher fotos Unsplash de pizza **top-down** (o recorte
redondo depende disso), **priorizando IDs já usados no dataset** quando houver tema
compatível, e validar CADA URL nova com `curl -sI` esperando 200 antes de commitar.
Candidatos a testar primeiro (pizza/italiana no acervo público comum):
`photo-1574071318508-1cdbab80d002`, `photo-1565299624946-b28f40a0ae38`,
`photo-1571407970349-bc81e7e96d47`, `photo-1595854341625-f33ee10dbf94`,
`photo-1598023696416-0193a0bcd302`, `photo-1548369937-47519962c11a`.
Nenhuma foto quebrada na demo.

### G2. `logos.ts` — `LOGO_FORNO_REAL`
Gerar novo logo procedural no padrão da casa: **PNG 512×512 transparente, data URI**,
marca "forno real" — círculo de pizza estilizado (disco com 3 furos-azeitona) COROADO
(a coroinha de 3 pontas em cima), tudo em `#B3231B`. Gerar via script descartável no
scratchpad (Node puro: rasterizar formas num buffer RGBA e codificar PNG com `zlib`
nativo + CRC — padrão do LOGO_BROTO, sem dependência nova). Validar visualmente (o
`SplashLoja` o exibe num cartão claro sobre o accent). Importar em `dataset.ts`.

---

## FASE H — Documentação

### H1. `docs/store-theme/02-arquetipos-de-design.md`
- Cabeçalho: derivados de referência 13 → **14**; total **18 → 19**; título §2.2
  "Os 18" → "Os 19"; "### Derivados de referência (13)" → (14).
- Nova entrada `#### A7. Slice — \`slice\`` após a Garden, no formato das irmãs:
  nichos, DNA (usar o §0 deste plano), mood, ref
  (`https://restaurin.framer.website/` — Restaurin/Pizza Lounge), paletas (default
  vermelho+creme, Basílico, Vinho), "**Por que não é o Smash/Roast/Heritage/Noir**"
  (argumentos do §0), nota "2026-08: 19º arquétipo, com **vitrine própria** — ver
  [05 §5.6]".
- §2.3: linha `alimentos-bebidas` ganha `slice` nas alternativas.
- §2.6: adicionar linha "**Pizzaria** → Slice: Restaurin."

### H2. `docs/store-theme/05-aplicacao-storefront-consumer.md` §5.6
- Título da seção e parágrafo introdutório: incluir **forno**.
- Lista de gates: `slice` + categoria `alimentos-bebidas`.
- Novo parágrafo "**Vitrine forno** (referência Restaurin, [02 §A7])" descrevendo o
  layout implementado (formato dos parágrafos smash/ritual/horta): hero preto com coroa
  e wordmark ouro, pizza redonda vazando, cardápio-pôster sobre ouro com nomes
  vermelhos gigantes, statement, cartão-alvo com círculos concêntricos, cardápio
  sóbrio, fecho preto. Citar `LojaForno.tsx` + `ProdutoForno.tsx` e a fonte DNA
  (Archivo Black 900, não-token).

### H3. Varredura de contagens
`grep -rn "18 arquétipo\|os 18\|18 presets\|18 códigos"` em `docs/`, `packages/`,
`apps/`, `supabase/` e corrigir menções (já mapeadas: `types.ts`, `presets.ts`,
`store-fonts.ts`, docs 02; verificar 00-INDEX/01/03/04 e o comentário do
`PRESETS_VALIDOS`).

---

## FASE I — Verificação final (critérios de aceite)

1. `pnpm --filter @mallevo/lib test` — verde (incl. os 2 testes novos do slice).
2. `pnpm --filter @mallevo/lib typecheck` — verde.
3. `pnpm lint` (ou ao menos `pnpm --filter mobile-consumer lint` e
   `pnpm --filter web lint`) — sem erros novos.
4. App consumer com `EXPO_PUBLIC_USE_MOCK=true`: home → Praça de Alimentação exibe
   "Forno Real"; entrar na loja abre a vitrine forno (splash → hero preto com coroa e
   wordmark ouro; pizza redonda vazando); "VER CARDÁPIO ⌄" rola; pôster ouro mostra as
   pizzas da casa com nomes vermelhos gigantes; PDP abre com o alvo de círculos,
   adiciona ao carrinho, pisca "NA SACOLA ✓" preto+ouro; sacola do topo navega ao
   checkout; voltar dispara a transição radial preta.
5. Editor `/minha-loja` (web): estilo "Slice" aparece na lista com preview coerente;
   paletas Basílico/Vinho selecionáveis.
6. Nenhum arquivo de vitrine/preset/paleta EXISTENTE alterado além das varreduras de
   contagem, do registro Archivo 400/500 e do §F2.

**Commits sugeridos** (padrão do repo, pt-BR, conventional):
1. `feat(store-theme): arquétipo slice (19º) — pizzaria, ref. Restaurin` (A, B, F2, H3 parcial)
2. `feat(consumer): vitrine forno — hero coroado, cardápio-pôster ouro e PDP alvo` (C, D, E)
3. `feat(consumer): demo Forno Real na praça de alimentação` (G)
4. `docs(store-theme): slice nos arquétipos e vitrine forno no §5.6` (H)

## Riscos e escapes conhecidos
- **Exports do pacote Archivo**: se `Archivo_400Regular`/`Archivo_500Medium`/
  `Archivo_900Black` não existirem com esses nomes, conferir
  `node_modules/@expo-google-fonts/archivo/index.js` antes de mudar a estratégia.
  Último recurso p/ o 900: usar 800 também no DNA (perde um pouco de esmagamento,
  não quebra nada).
- **Vermelho sobre ouro**: se a re-validação de `contrastRatio(OURO, accent)` der < 3.0
  em alguma pele, aprofundar o accent DAQUELA pele (e re-validar accent sobre bg ≥ 4.5)
  — nunca desligar o teste.
- **Fotos que não são top-down**: o recorte redondo aceita qualquer foto (cover
  centrado), mas o efeito-pôster pede top-down — priorizar essas na demo.
- **Line-art do RabiscoCozinha**: se o path do garfo complicar, degradar para raminhos
  simples (haste + folhas-elipse). Não usar imagem rasterizada.
- **Fotos Unsplash**: nunca commitar ID não verificado (ver §G1).
