# Plano de execução — 18º arquétipo `garden` (comida saudável, ref. Sonder & Sprout)

> **Para o executor (Opus 5):** este plano foi preparado com análise completa do design de
> referência e do código existente. Siga as fases NA ORDEM. Nada dos 17 arquétipos
> existentes é alterado — o trabalho é 100% aditivo (exceto §F2, correção de lista
> desatualizada, e a varredura de contagens "17 → 18" em comentários/docs).
>
> **Antes de escrever qualquer código, leia estes arquivos** (são o vocabulário e o padrão
> de qualidade a seguir):
> 1. `packages/lib/src/store-theme/types.ts`, `presets.ts`, `palettes.ts`, `mapping.ts`
> 2. `apps/mobile-consumer/components/loja/LojaRitual.tsx` + `ProdutoRitual.tsx` — o molde
>    estrutural mais recente (props, `useStoreDesign`, `fontStyle`, fonte-DNA local,
>    reduce-motion, saída via `useTransicaoSaida`, guarda de troca de loja no PDP)
> 3. `apps/mobile-consumer/components/loja/LojaSmash.tsx` — padrão de MARQUEE e scroll-to
> 4. `apps/mobile-consumer/app/loja/[slug].tsx` — gates e roteamento de vitrines
> 5. `apps/mobile-consumer/lib/store-fonts.ts` — contrato de fontes RN
> 6. `docs/store-theme/02-arquetipos-de-design.md` §2.2/§2.3/§2.5 e
>    `docs/store-theme/05-aplicacao-storefront-consumer.md` §5.6 — formato da documentação
> 7. `apps/mobile-consumer/lib/mock/dataset.ts` — formato das lojas-demo
> 8. `packages/lib/src/store-theme/__tests__/store-theme.test.ts` — invariantes que o novo
>    arquétipo PRECISA passar

---

## 0. O design de referência (análise destilada das 5 telas)

Referência: template Framer **Sonder & Sprout** (`https://caring-simplicity-482902.framer.app/`),
restaurante/loja de comida saudável. Ignorar o banner "Buy Now ($29)" e o selo "Made in
Framer" das capturas — são chrome do Framer, não fazem parte do design.

**DNA visual (a gramática que a vitrine precisa reproduzir):**

1. **Página CREME** com seções empilhadas full-bleed — NÃO é o padrão "cartões flutuando"
   da ritual; as seções coloridas (verde, caramelo) sangram de borda a borda.
2. **Hero verde-floresta profundo**: wordmark GIGANTE em caps gordas ROSA-PASTEL, empilhado
   em duas linhas, com um **selo recortado (flor/escalope) creme** sobreposto entre as
   palavras carregando o conector ("&"). Rabiscos de arco desenhados à mão em creme.
   Foto do prato entra por baixo como **adesivo (sticker)** — contorno branco irregular.
3. **Tipografia em 3 vozes**: display gorda arredondada (wordmark/hero), **serifa macia**
   para títulos de seção e nomes de produto ("Favorites", "About us", "Berry Muesli"),
   sans arredondada para corpo/ingredientes. + uma voz **manuscrita** (assinatura
   "Chef Mara Santos").
4. **Cards de produto em pastel**: retângulos de canto MUITO redondo em rosa/caramelo
   chapado, foto do produto vazando o card; abaixo, rótulo de categoria em tan
   ("Snack"), nome em serifa verde, linha de ingredientes ("Strawberry, Blueberry,
   Muesli, Oats, Coconut Cream").
5. **Selos recortados** reaparecem como badge de produto ("vegan" verde com folha,
   rotacionado no canto do card).
6. **Pills** em rosa-pastel com texto verde em caps espaçadas ("READ MORE",
   "RESERVE TABLE").
7. **Marquee/ticker** verde com frases separadas por ✦ ("Bold flavors ✦ Handcrafted
   with love").
8. **Seção "Visit us"** em caramelo: endereço/horários em serifa verde, pill rosa, foto
   adesivo, arcos rabiscados. Fecho em faixa verde-floresta (footer).
9. **Blob amarelo** decorativo pontual (seção about).
10. Paleta completa: verde-floresta `#2E4B26`, creme `#F7F1DE`, rosa `#F2BCC9`,
    caramelo `#DCA57F`, tan `#8A6038`, amarelo `#F2C34E`.

**Por que é um arquétipo novo (justificativa exigida por docs/store-theme/02 §2.5):**
- **Não é o `roast`** (o outro verde-floresta): roast é PÔSTER RETRÔ DARK — a página É
  verde, âmbar de acento, título repetido em degradê, cardápio-cartaz com marca d'água.
  Garden é página CLARA creme com verde de âncora, pastéis rosa/caramelo, adesivos,
  selos recortados e serifa macia — gramática de feira orgânica, não de cartaz.
- **Não é o `heritage`**: heritage é clássico contido (serifa + neutros quentes + foto
  full-bleed). Garden é lúdico-orgânico: sticker, selo, rabisco, manuscrita.
- **Não é o `ritual`**: ritual é rosa-página com cartões flutuando e caps condensadas;
  garden é creme com seções full-bleed, serifa e pastéis.
- **Não é o `soft`**: soft é serviço acolhedor genérico, sem a linguagem
  farm-to-table/adesivo/selo, e sem vitrine própria de alimentação.

---

## 1. Decisões fechadas (não rediscutir na execução)

| Decisão | Valor |
|---|---|
| Código do arquétipo | `garden` (inglês, como os demais) |
| Nome humano | `Garden` |
| Vitrine consumer | `LojaHorta.tsx` + `ProdutoHorta.tsx` (tradução PT como roast→Torra) |
| Nicho | comida saudável — saladerias, bowls, cafés naturais, empórios fit |
| Gate da vitrine | `garden` + categoria ∈ {`alimentos-bebidas`, `saude-bem-estar`} |
| Mapping | alternativa em `alimentos-bebidas` E `saude-bem-estar` |
| Token display | **Fraunces** [600, 700] (serifa macia — já carregada no app, usada pelo heritage) |
| Token body | **Quicksand** [400, 500, 600, 700] (sans arredondada da referência — **dependência nova**) |
| Fontes DNA da vitrine (locais, não-token) | **Baloo 2 ExtraBold 800** (wordmark gordo do hero; pacote já instalado, basta importar o peso 800) e **Caveat 700** (manuscrita — **dependência nova**) |
| Modo | `light` |
| Shape | `radius: 'round'`, `density: 'comfortable'` |
| Type scale | `regular` |
| Loja-demo | **"Broto & Grão"**, Piso 4, slug `broto-e-grao` |

**Cores do preset — JÁ VALIDADAS contra WCAG AA (≥ 4.5), não alterar sem re-validar:**

```
bg        #F7F1DE   (creme de página)
surface   #FFFBEF   (cartão/sheet)
surfaceAlt#EFE6CC
ink       #22391B   (verde-floresta de texto — 11.14:1 sobre bg)
inkMuted  #676844   (oliva — 5.11:1 sobre bg; 5.58:1 sobre surface)
line      #E7DDBE
accent    #2E4B26   (verde-floresta — hero/footer/CTA)
accentInk #F7F1DE   (8.64:1 sobre accent)
```

**Constantes DNA da vitrine** (fixas como o `CREME`/`ROSA_MENU` da ritual — a paleta
troca `accent`/`bg`, os pastéis ficam):

```
ROSA         #F2BCC9   pastel de cards/pills
CARAMELO     #DCA57F   pastel alternado / seção "visite"
AMARELO      #F2C34E   blob decorativo (nunca carrega texto)
TAN_ROTULO   #8A6038   rótulo de categoria sobre o creme (4.88:1)
TINTA_PASTEL #22391B   tinta verde FIXA sobre ROSA (7.68:1) e CARAMELO (5.83:1)
```

Racional: texto sobre os pastéis usa `TINTA_PASTEL` fixa (não `colors.ink`) porque as
paletas curadas trocam a tinta — mesmo racional do `ROSA_MENU` da ritual. O wordmark
rosa sobre o hero usa `ROSA` sobre `colors.accent` (funciona nas 3 peles: 5.96:1 no
verde, ~6.3:1 na beterraba, ~7:1 no cacau).

**Paletas curadas (2, mesmo `mode: light`) — TAMBÉM já validadas AA:**

```
beterraba (Beterraba):
  bg #FAF3E3  surface #FFFDF6  surfaceAlt #F3E8D3
  ink #3A1A24 (14.04:1)  inkMuted #6E5148 (6.47:1)  line #EDDCC8
  accent #7A2743 (beterraba)  accentInk #FAF3E3 (8.64:1)

cacau (Cacau):
  bg #F8F1E4  surface #FFFCF4  surfaceAlt #EFE4D2
  ink #2E2318 (13.65:1)  inkMuted #6E6049 (5.45:1)  line #E8DCC6
  accent #4C3323 (cacau)  accentInk #F8F1E4 (10.36:1)
```

---

## FASE A — Tokens na lib (`packages/lib/src/store-theme/`)

### A1. `types.ts`
- Adicionar `| 'garden' // comida saudável/natural — creme + verde-floresta + pastéis, serifa macia, adesivos` ao union `ArquetipoCodigo` (após `'smash'`).
- Atualizar o comentário `/** Os 17 arquétipos ... */` → 18.

### A2. `presets.ts`
- Atualizar comentário de cabeçalho "Catálogo dos 17 arquétipos" → 18.
- Inserir após o bloco `smash` (família alimentação):

```ts
// ── Referências: comida saudável / saladerias / cafés naturais ─────────────
garden: {
  codigo: 'garden',
  nome: 'Garden',
  descricao:
    'Fresco e orgânico. Creme de página, verde-floresta de âncora, pastéis rosa e caramelo, serifa macia, selos recortados e fotos-adesivo. Para comida saudável e cafés naturais.',
  mood: ['fresco', 'orgânico', 'acolhedor'],
  referencias: ['https://caring-simplicity-482902.framer.app/'],
  tokens: {
    mode: 'light',
    color: pele({
      bg: '#F7F1DE',
      surface: '#FFFBEF',
      surfaceAlt: '#EFE6CC',
      ink: '#22391B',
      // Oliva aprofundada: rótulos e ingredientes desta pele são escritos
      // DIRETO no creme da página (sem surface por baixo) — precisa de AA
      // contra bg, como na ritual. 5.11:1 validado.
      inkMuted: '#676844',
      line: '#E7DDBE',
      // O verde-floresta do hero/footer da referência; sustenta o creme
      // como tinta com 8.64:1.
      accent: '#2E4B26',
      accentInk: '#F7F1DE',
    }),
    typography: {
      // Serifa macia dos títulos de seção e nomes de produto da referência
      // (Fraunces já serve o heritage; aqui a voz muda pelo corpo/mundo de cor).
      display: { family: 'Fraunces', weights: [600, 700] },
      // Sans arredondada da referência — o corpo/ingredientes/horários.
      body: { family: 'Quicksand', weights: [400, 500, 600, 700] },
      scale: 'regular',
    },
    shape: { radius: 'round', density: 'comfortable' },
  },
},
```

### A3. `palettes.ts`
- Adicionar a chave `garden` em `PALETAS` com as paletas `beterraba` e `cacau` (§1),
  com comentários curtos no estilo do arquivo (ex.: `// Beterraba assada: o mesmo
  farm-to-table com o vermelho-terroso no lugar do verde.`).

### A4. `mapping.ts`
- `'alimentos-bebidas'`: alternativas → `['noir', 'roast', 'ritual', 'smash', 'garden', 'market', 'soft']`.
- `'saude-bem-estar'`: alternativas → `['soft', 'volt', 'garden']`.

### A5. Teste novo em `__tests__/store-theme.test.ts`
No `describe('qualidade de autoria dos ARQUETIPOS')`, espelhando o guard da ritual:

```ts
it('garden: inkMuted legível sobre bg — rótulos e ingredientes escrevem direto no creme', () => {
  const peles = [
    ['preset', ARQUETIPOS.garden.tokens.color],
    ...PALETAS.garden.map((p) => [`paleta ${p.codigo}`, p.color] as const),
  ] as const
  for (const [nome, cor] of peles) {
    expect(
      contrastRatio(cor.bg, cor.inkMuted),
      `garden/${nome}: inkMuted ilegível sobre bg`,
    ).toBeGreaterThanOrEqual(4.5)
  }
})
```

### A6. Validar
```
pnpm --filter @mallevo/lib test
pnpm --filter @mallevo/lib typecheck
```
Todos os testes existentes continuam passando (eles iteram `ARQUETIPOS`/`PALETAS`
dinamicamente — o garden entra nas checagens de graça e DEVE passar sem correção
de runtime).

---

## FASE B — Fontes no mobile (`apps/mobile-consumer`)

### B1. `package.json`
Adicionar dependências (mesma faixa `^0.4.x` das irmãs):
```
"@expo-google-fonts/quicksand": "^0.4.1",
"@expo-google-fonts/caveat": "^0.4.1",
```
Rodar `pnpm install` na raiz. (`@expo-google-fonts/baloo-2` já está instalado — o peso
800 é só um import novo.)

### B2. `lib/store-fonts.ts`
- Comentário de cabeçalho "Fontes dos 17 arquétipos" → 18.
- Importar `Quicksand_400Regular, Quicksand_500Medium, Quicksand_600SemiBold,
  Quicksand_700Bold` e registrar em `FONTES`:
```ts
Quicksand: {
  400: Quicksand_400Regular,
  500: Quicksand_500Medium,
  600: Quicksand_600SemiBold,
  700: Quicksand_700Bold,
},
```
- **Baloo 800 e Caveat NÃO entram aqui** — são DNA da vitrine (carregados localmente
  no componente, como o Shrikhand da ritual). A regra está no comentário do próprio
  arquivo: "Fonte que é DNA de uma vitrine só fica de fora".

---

## FASE C — Vitrine `LojaHorta.tsx` (o grosso do trabalho)

Novo arquivo `apps/mobile-consumer/components/loja/LojaHorta.tsx`. Contrato idêntico às
irmãs (props `{ loja, secoes, aoAbrirProduto, espacoFinal }` genéricas em
`ProdutoVitrine` — copiar as interfaces de `LojaRitual.tsx`). Usar `useStoreDesign()`,
`fontStyle`, `useTransicaoSaida` (saída radial no `colors.accent`), reduce-motion via
`AccessibilityInfo` (padrão ritual), `StatusBar style="light"` (o topo é verde).

**Fontes DNA locais:**
```ts
import { Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2'
import { Caveat_700Bold, useFonts } from '@expo-google-fonts/caveat'
// hook no estilo useFonteGroovy da ritual:
//   wordmark → Baloo2_800ExtraBold, fallback fontStyle(display, 700)
//   manuscrita → Caveat_700Bold, fallback fontStyle(body, 600)
```

**Chrome:** dois botões-adesivo circulares fixos no topo (zIndex alto, `insets.top`):
voltar à esquerda, sacola à direita com contador (badge no accent). Fundo creme
`colors.bg` com borda fina `comAlfa(colors.ink, 0.12)` + sombra `consumerDesign.shadow.soft`
— legíveis tanto sobre o hero verde quanto sobre o creme ao rolar. **Sem FAB de
carrinho** (regra das vitrines, ver comentário em `[slug].tsx`). Sacola com
`totalItens > 0 && router.push('/checkout')`; voltar via `sairPara(() => router.back())`.

**Helpers a criar no arquivo** (todos com `react-native-svg`, que já é dependência):

1. `SeloRecortado({ size, cor, rotacao, children })` — selo escalopado (flor): `Svg` com
   `Path` gerado em coordenadas polares, ~12 pétalas:
   `r(θ) = R * (0.90 + 0.10 * cos(12θ))`, amostrado a cada ~3°, fechado com `Z`.
   Filhos centrados por cima (View absoluta). Usos: conector "&" do hero (creme com
   "&" verde), badge de produto (verde com texto creme).
2. `Rabisco({ cor, largura })` — dois arcos concêntricos de traço redondo
   (`Path` com `stroke`, `strokeLinecap="round"`, sem fill) — o doodle de arco da
   referência. Decorativo, `pointerEvents="none"`.
3. `FotoAdesivo({ uri, largura, altura, rotacao })` — o "sticker": View externa BRANCA
   (`#FFFFFF`) com raios de canto ASSIMÉTRICOS grandes (ex.: 48/64/40/72 escalados) e
   `padding: 7`, contendo a `Image` em `cover` com os mesmos raios menos o padding;
   `transform: [{ rotate }]` sutil (−3°…3°). É a tradução RN viável do contorno
   irregular de adesivo.
4. `comAlfa(hex, alpha)` — copiar da ritual.

**Seções, na ordem (todas full-bleed, sem gutter de cartão — diferencial vs. ritual):**

1. **HeroHorta** — bloco `colors.accent`, `minHeight ~78%` da tela:
   - 1–2 blobs orgânicos decorativos `comAlfa('#FFFFFF', 0.04)` (Views com raios
     assimétricos) — o padrão tom-sobre-tom da referência, bem sutil;
   - wordmark: `loja.nome` quebrado em palavras empilhadas, caps, Baloo 800, cor `ROSA`,
     corpo grande (~64–72 × typeFactor, `adjustsFontSizeToFit` por linha); se o nome
     contém conector isolado ("&" ou "e"/"E" entre palavras), o conector NÃO vira linha —
     vira o `SeloRecortado` creme (~72px, rotação −8°) sobreposto entre as duas linhas
     (marginVertical negativa, zIndex acima); sem conector, o selo vai ao lado da última
     linha com a inicial da loja;
   - `Rabisco` creme no canto esquerdo, abaixo do wordmark;
   - descrição da loja (se houver) em Quicksand 500 creme, 2 linhas, central;
   - base do hero: `FotoAdesivo` com `banner_url ?? primeira foto de produto`
     (largura ~86% da tela, rotação −2°), ancorada com `marginBottom` negativo
     para VAZAR sobre a seção seguinte (o overlap da referência) — a seção seguinte
     compensa com `paddingTop`.
2. **Marquee** — faixa `colors.accent` (a referência tem o ticker sobre verde), texto
   creme caps Quicksand 700 com separador ` ✦ `, frases fixas de DNA neutro de marca
   (ex.: `SABOR DE VERDADE ✦ INGREDIENTES DA ESTAÇÃO ✦ FEITO À MÃO ✦ SEM ATALHOS`).
   Mecânica: copiar o padrão marquee da `LojaSmash.tsx` (loop `Animated` com driver
   nativo, medindo a largura do conteúdo e duplicando-o); com reduce-motion, fica
   estático.
3. **FavoritosHorta** — a seção-assinatura (telas 2 e 4):
   - eleger a seção de favoritos como a ritual elege especiais:
     `secoes.find(s => /favorit|destaque|especia/.test(titulo.toLowerCase()))`;
     fallback: primeiros 4–6 produtos com foto. A seção eleita sai do cardápio corrente
     (mesmo `useMemo` de exclusão da ritual);
   - título "Favoritos" em Fraunces 700 verde (`colors.ink`) central + subtítulo
     Quicksand (usar 1ª frase da descrição da loja ou frase DNA fixa);
   - carrossel horizontal com *peek* (`snapToInterval`, cards ~78% da largura):
     card pastel de raio 32 alternando `ROSA`/`CARAMELO`, foto do produto vazando o topo
     do card (`marginTop` negativo na Image; `metadata.recorte` → `contain` solto,
     senão foto em máscara de blob arredondado); `SeloRecortado` verde (~64px,
     rotação +10°) no canto superior direito do card com texto creme caps 10px —
     `OFERTA` quando `preco_promocional`, senão `DA CASA`;
   - abaixo do card (sobre o creme da página): rótulo da seção de origem em
     `TAN_ROTULO` caps espaçadas 11px, nome em Fraunces 700 `colors.ink` 20px,
     descrição do produto como linha de ingredientes em Quicksand 500 `colors.inkMuted`
     (1 linha, ellipsis), preço em Quicksand 700 `colors.ink` (promo: preço antigo
     riscado ao lado, tinta cheia corpo menor — regra AA da ritual);
   - toque → `aoAbrirProduto(p)`.
4. **SobreHorta** (tela 3) — sobre o creme:
   - "Sobre a casa" em Fraunces 700 verde, alinhado à esquerda;
   - `loja.descricao` completa em Quicksand 500 `colors.ink` (lineHeight generoso);
   - assinatura manuscrita: `loja.nome` em Caveat 700 `colors.ink` ~30px + linha
     "Feito na casa" em Quicksand 600 `colors.inkMuted` 12px caps;
   - pill `ROSA` "VER CARDÁPIO" (caps Quicksand 700 espaçadas, tinta `TINTA_PASTEL`)
     que rola até o cardápio — padrão scroll-to da smash (medir `y` da seção via
     `onLayout` + `scrollTo` no ref do ScrollView);
   - `FotoAdesivo` com a 2ª foto disponível (banner ou produto), blob `AMARELO`
     absoluto atrás/abaixo (decorativo).
5. **CardapioHorta** — lista completa (tradução da hierarquia tipográfica do design;
   a referência não mostra tela de lista, então manter sóbrio):
   - por seção: título Fraunces 700 verde 22px + hairline `colors.line`;
   - item: linha com thumb 56px raio 18 (se foto), nome Fraunces 600 17px verde,
     descrição-ingredientes Quicksand 500 13px `colors.inkMuted` (1 linha), preço
     Quicksand 700 15px verde (promo: riscado menor ao lado);
   - toque → `aoAbrirProduto(p)`.
6. **VisiteHorta** (tela 5) — bloco full-bleed `CARAMELO`:
   - "Visite a gente" Fraunces 700 em `TINTA_PASTEL`;
   - linhas de meta em Quicksand 600 `TINTA_PASTEL`: horário de HOJE derivado de
     `loja.horarios` (chaves `seg…dom`, formato `{ abre, fecha }` — mapear
     `new Date().getDay()`; ausente → omitir), `tempo_entrega` min, taxa
     (`Entrega grátis` quando 0);
   - pill `ROSA` "PEDIR AGORA" → rola ao cardápio;
   - `FotoAdesivo` (3ª foto) + `Rabisco` em `TINTA_PASTEL`.
7. **FechoHorta** — faixa `colors.accent` (footer): `SeloRecortado` creme pequeno com
   inicial, nome da loja em Baloo 800 creme, linha `ABERTO · N MIN · HH:MM` em
   Quicksand 600 creme caps espaçadas (relógio vivo de 30s — copiar `horaAgora` da
   ritual).

**Props de `loja` usadas:** `nome, descricao, banner_url, tempo_entrega, taxa_entrega,
horarios` — declarar `horarios?: Record<string, { abre: string; fecha: string }> | null`
no Props local (o objeto real já traz; as irmãs tipam subconjuntos).

**Performance/acessibilidade:** único loop animado é o marquee (driver nativo);
crossfades/parallax não são necessários nesta vitrine. Todo texto sobre pastel usa
`TINTA_PASTEL`/`TAN_ROTULO` (AA validado). Reduce-motion: marquee estático, rotações
de adesivo mantidas (estáticas não incomodam).

---

## FASE D — PDP `ProdutoHorta.tsx`

Novo arquivo `apps/mobile-consumer/components/loja/ProdutoHorta.tsx`. **Copiar os ossos
de `ProdutoRitual.tsx`** (Modal full-screen, galeria via `metadata.galeria`, checagem
`product_option_groups`/`product_modifier_groups` → delega ao `ModalProduto`, guarda de
troca de loja com diálogo, CTA que pisca "NA SACOLA ✓", `useCartStore`). Trocar apenas o
palco e a pele:

- fundo `colors.bg` (creme); botão fechar = botão-adesivo circular (chrome da vitrine);
- **palco**: card pastel raio 32 (ROSA ou CARAMELO — alternar por hash simples do
  `produto.id` para variedade estável), altura ~`TELA_W * 1.05`;
  `metadata.recorte` → cutout `contain` solto; senão foto `cover` em máscara de raios
  assimétricos; galeria (se houver) em pager horizontal com dots verdes discretos;
  `SeloRecortado` verde rotacionado no canto (OFERTA/DA CASA — mesmo critério da
  vitrine); reaproveitar `SeloRecortado`/`FotoAdesivo`/`comAlfa` — **extrair esses
  helpers para um `horta-ui.tsx` local** se a duplicação passar de ~40 linhas;
- ficha sobre o creme: nome Fraunces 700 verde grande; descrição como linha de
  ingredientes Quicksand 500 `colors.inkMuted`; preço Quicksand 700 verde
  (promo riscado ao lado);
- diálogo de troca de loja: cartão `surface` com títulos Fraunces — mesmo copy das irmãs;
- CTA fixo inferior: pill `ROSA` full-width, texto `TINTA_PASTEL` caps
  "ADICIONAR · R$ X" → ao confirmar pisca para pill `colors.accent` com
  "NA SACOLA ✓" em creme (padrão smash/ritual).

---

## FASE E — Roteamento em `app/loja/[slug].tsx`

Seguindo exatamente o padrão existente (mudanças mínimas e mecânicas):

1. Imports de `LojaHorta`/`ProdutoHorta`.
2. ```ts
   /** Categorias da vitrine horta (arquétipo `garden` — comida saudável). */
   const CATEGORIAS_VITRINE_HORTA = new Set(['alimentos-bebidas', 'saude-bem-estar'])
   ```
3. ```ts
   // Horta: comida saudável/natural (creme + verde, adesivos e selos recortados).
   const vitrineHorta =
     design.arquetipo === 'garden' &&
     CATEGORIAS_VITRINE_HORTA.has(loja?.categoria_slug)
   ```
4. `vitrineHorta` entra no `if (...)` grande, na cadeia do `Vitrine` (antes do fallback
   `LojaEditorial`) e na cadeia do `Pdp` — `LojaHorta` usa o ramo genérico `Vitrine`
   (mesmo shape de props da ritual), NÃO o ramo especial da clínica/magazine.

---

## FASE F — Backend/validação de onboarding

### F1. Nada a fazer na web
`apps/web` (onboarding `fluxo.tsx`, editor `minha-loja-editor.tsx`, action
`loja-vitrine.ts`) enumera `Object.keys(ARQUETIPOS)` e `PALETAS[preset]`
dinamicamente — o garden aparece sozinho. O storefront web aplica tokens via
`StoreThemeRoot` (`resolveTheme` + `toCssVars` + `googleFontsHref`) — Quicksand carrega
via Google Fonts automaticamente. **Zero mudanças nesses apps.**

### F2. `supabase/functions/onboard-tenant/index.ts` — ATENÇÃO: bug pré-existente
`PRESETS_VALIDOS` (linha ~36) está DESATUALIZADO — contém só os 11 originais; faltam
`roast, ritual, smash, magazine, volt, serene` (lojas criadas com esses presets têm o
tema silenciosamente descartado no onboarding). Atualizar para os **18 códigos**
completos e ajustar o comentário ("Se um novo arquétipo nascer, adicionar aqui").
Mencionar essa correção na mensagem de commit.

---

## FASE G — Loja-demo "Broto & Grão" (`apps/mobile-consumer/lib/mock/`)

### G1. `dataset.ts`
1. Em `CATEGORIA_CANON`, adicionar:
   `saudavel: { slug: 'alimentos-bebidas', nome: 'Saudável' },`
2. Nova loja no **Piso 4** (após "Roxa Açaí"):

```ts
{
  nome: 'Broto & Grão',
  slug: 'broto-e-grao',
  descricao: 'Comida de verdade não precisa ser sem graça — colhida perto, montada na hora, sem atalhos.',
  taxa: 490,
  tempo: 30,
  categoriaSlug: 'saudavel',
  // Loja-demo da vitrine horta (Sonder & Sprout): creme + verde-floresta,
  // pastéis rosa/caramelo, selos recortados e fotos-adesivo.
  preset: 'garden',
  logo: LOGO_BROTO,
  banner: fotoModa('1490645935967-10de6ba17061', 900, 1200),
  catalogo: [
    [
      // O rótulo casa com o regex /favorit/ que elege a seção do carrossel.
      'Favoritos da casa',
      [
        ['Toast de Abacate & Ovo', 2490, 'Pão de fermentação · abacate · ovo caipira · flor de sal', fotoModa('1525351484163-7529414344d8')],
        ['Bowl Berry Muesli', 2290, 'Morango · blueberry · muesli · aveia · creme de coco', fotoModa('1494597564530-871f2b93ac55')],
        ['Sanduíche da Horta', 2690, 'Grãos na crosta · tomate · pesto da casa · folhas da estação', fotoModa('1528735602780-2552fd46c7af')],
        ['Toast Cogumelo & Espinafre', 2590, 'Ricota temperada · cogumelos salteados · espinafre fresco', fotoModa('1482049016688-2d3e1b311543')],
      ],
    ],
    [
      'Bowls & saladas',
      [
        ['Bowl Colheita', 2890, 'Grãos · legumes assados · homus · tahine de limão', fotoModa('1512621776951-a57141f2eefd')],
        ['Salada Verde Completa', 2390, 'Folhas orgânicas · abacate · sementes tostadas · vinagrete de mel', fotoModa('1540189549336-e6e99c3679fe')],
        ['Bowl Proteico', 3190, 'Frango grelhado · quinoa · brócolis · molho de iogurte', fotoModa('1546069901-ba9599a7e63c')],
        ['Panqueca de Aveia & Frutas', 2190, 'Aveia · banana · frutas vermelhas · mel de flor', fotoModa('1567620905732-2d1ec7ab7445')],
      ],
    ],
    [
      'Sucos & smoothies',
      [
        ['Suco Verde da Manhã 500ml', 1290, 'Couve · abacaxi · gengibre · limão-siciliano', fotoModa('1610970881699-44a5587cabec')],
        ['Smoothie de Frutas Vermelhas', 1590, 'Morango · amora · banana · leite de amêndoas', fotoModa('1505252585461-04db1eb84625')],
        ['Salada de Frutas da Estação', 1190, 'Frutas do dia · calda cítrica · hortelã', fotoModa('1490474418585-ba9bad8fd0ea')],
      ],
    ],
    [
      'Doces naturais',
      [
        ['Rabanada Integral de Frutas', 1690, 'Pão integral · frutas vermelhas · iogurte natural', fotoModa('1484723091739-30a097e8f929')],
        ['Bowl Zero Açúcar', 2190, 'Adoçado com tâmara · granola sem glúten · frutas vermelhas', fotoModa('1596591606975-97ee5cef3a1e')],
      ],
    ],
  ],
},
```

**Verificação obrigatória das fotos:** os IDs `1494597564530`, `1610970881699`,
`1505252585461`, `1490474418585`, `1596591606975` já existem no dataset (verificados).
Os demais são novos — validar cada URL com uma requisição (`curl -sI` esperando 200) e,
para qualquer um que falhe, substituir por um ID já usado no dataset de tema
alimentar compatível. Não deixar foto quebrada na demo.

### G2. `logos.ts` — `LOGO_BROTO`
Gerar novo logo procedural no padrão da casa: **PNG 512×512 transparente, data URI**,
marca "broto" (caule + duas folhas, formas simples) em `#2E4B26`. Gerar via script
descartável no scratchpad (Node puro: rasterizar formas num buffer RGBA e codificar PNG
com `zlib` nativo + CRC — sem dependência nova no repo), colar o data URI como
`export const LOGO_BROTO` com comentário no cabeçalho do arquivo. Validar visualmente
(o splash `SplashLoja` o exibe num cartão claro sobre o accent). Importar em
`dataset.ts` junto aos demais.

---

## FASE H — Documentação

### H1. `docs/store-theme/02-arquetipos-de-design.md`
- Cabeçalho: "**12 arquétipos**" derivados de referência → **13**; total **17 → 18**;
  título §2.2 "Os 17" → "Os 18"; "### Derivados de referência (12)" → (13).
- Nova entrada `#### A6. Garden — \`garden\`` após a Smash, no formato das irmãs:
  nichos, DNA (usar o §0 deste plano), mood, ref
  (`https://caring-simplicity-482902.framer.app/` — Sonder & Sprout), paletas
  (default verde+creme, Beterraba, Cacau), "**Por que não é o Roast/Heritage/Ritual/Soft**"
  (argumentos do §0), nota "2026-08: 18º arquétipo, com **vitrine própria** — ver
  [05 §5.6]".
- §2.3: linhas `alimentos-bebidas` e `saude-bem-estar` ganham `garden` nas alternativas.
- §2.6: adicionar linha "**Comida saudável** → Garden: Sonder & Sprout."

### H2. `docs/store-theme/05-aplicacao-storefront-consumer.md` §5.6
- Título da seção e parágrafo introdutório: incluir **horta**.
- Lista de gates: `garden` + categoria ∈ {alimentos-bebidas, saude-bem-estar}.
- Novo parágrafo "**Vitrine horta** (referência Sonder & Sprout, [02 §A6])" descrevendo
  o layout implementado (formato dos parágrafos smash/ritual): hero verde com wordmark
  Baloo + selo recortado "&", foto-adesivo vazando, marquee ✦, favoritos em cards
  pastel com selo, sobre com assinatura Caveat, cardápio serifado, visite em caramelo,
  fecho verde. Citar `LojaHorta.tsx` + `ProdutoHorta.tsx` e as fontes DNA
  (Baloo 2 800/Caveat, não-token).

### H3. Varredura de contagens
`grep -rn "17 arquétipo\|os 17\|17 presets"` em `docs/`, `packages/`, `apps/` e corrigir
menções à contagem (já mapeadas: `types.ts`, `presets.ts`, `store-fonts.ts`, docs 02;
verificar 00-INDEX/01/03/04).

---

## FASE I — Verificação final (critérios de aceite)

1. `pnpm --filter @mallevo/lib test` — verde (incl. novo teste garden).
2. `pnpm --filter @mallevo/lib typecheck` — verde.
3. `pnpm lint` (ou ao menos `pnpm --filter mobile-consumer lint` e
   `pnpm --filter web lint`) — sem erros novos.
4. App consumer com `EXPO_PUBLIC_USE_MOCK=true`: home → Praça de Alimentação exibe
   "Broto & Grão" (entra automática pela categoria); entrar na loja abre a vitrine
   horta (splash verde → hero com wordmark + selo "&"); favoritos deslizam; "VER
   CARDÁPIO" rola; PDP abre, adiciona ao carrinho, pisca "NA SACOLA ✓"; sacola do topo
   navega ao checkout; voltar dispara a transição radial verde.
5. Editor `/minha-loja` (web): estilo "Garden" aparece na lista com preview coerente;
   paletas Beterraba/Cacau selecionáveis.
6. Nenhum arquivo de vitrine/preset/paleta EXISTENTE alterado além das varreduras de
   contagem e do §F2.

**Commits sugeridos** (padrão do repo, pt-BR, conventional):
1. `feat(store-theme): arquétipo garden (18º) — comida saudável, ref. Sonder & Sprout`
   (fases A, B, F2, H3 parcial)
2. `feat(consumer): vitrine horta — hero adesivo, favoritos pastel e PDP selo` (C, D, E)
3. `feat(consumer): demo Broto & Grão na praça de alimentação` (G)
4. `docs(store-theme): garden nos arquétipos e vitrine horta no §5.6` (H)

## Riscos e escapes conhecidos
- **Peso de fonte ausente no pacote expo**: se `Quicksand_XXX`/`Caveat_700Bold`/
  `Baloo2_800ExtraBold` não exportarem como esperado, checar o nome exato no pacote
  (`node_modules/@expo-google-fonts/<pkg>/index.js`) antes de mudar a estratégia.
  Último recurso (só se Quicksand for inviável): body `Nunito` (já instalada) e
  registrar a troca em `presets.ts` + docs.
- **Selo escalopado**: se o Path polar complicar, alternativa aceitável é `Svg` com
  12 círculos pequenos em anel + círculo central (mesma silhueta). Não usar imagem
  rasterizada para o selo.
- **Sticker**: RN não faz contorno real de PNG recortado; a moldura branca de raios
  assimétricos É a solução — não tentar duplicar a imagem com tint (caro e frágil).
- **Fotos Unsplash**: nunca commitar ID não verificado (ver §G1).
