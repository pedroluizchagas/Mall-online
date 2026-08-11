# Plano de execução — 21º arquétipo `fresh` (supermercado/hortifruti, ref. app grocery)

> **Para o executor (Opus 5):** plano preparado com análise da captura (1 tela de app
> grocery — home) e do código existente. Siga as fases NA ORDEM. Nada dos 20 arquétipos
> existentes é alterado — trabalho 100% aditivo (fora contagens "20 → 21",
> `PRESETS_VALIDOS` e um campo opcional novo no tuple do mock, §G1).
>
> **REGRA DADA PELO USUÁRIO, não negociável:** a barra de navegação do aplicativo NÃO
> muda. A pill flutuante de navegação que aparece no mockup é chrome do próprio mockup
> e NÃO entra na vitrine. `apps/mobile-consumer/app/(tabs)/_layout.tsx` é INTOCÁVEL.
> A vitrine usa o chrome padrão da casa (dois botões flutuantes: voltar + sacola).
>
> **Antes de escrever qualquer código, leia:**
> 1. `packages/lib/src/store-theme/types.ts`, `presets.ts`, `palettes.ts`, `mapping.ts`
> 2. `apps/mobile-consumer/components/loja/LojaPassarela.tsx` + `ProdutoPassarela.tsx` +
>    `passarela-ui.tsx` — o molde MAIS RECENTE, já com TODAS as lições das revisões
>    (fix `58aafae` da forno + fix `30c1d6a` da passarela): seção eleita que não engole
>    itens, descrição repartida entre vozes, pager com largura explícita, diálogo acima
>    do chrome (zIndex), supabase que NÃO rejeita promise em falha de rede.
> 3. `apps/mobile-consumer/components/loja/LojaForno.tsx` — padrão de bloco de cor,
>    relógio do fecho e scroll-to.
> 4. `apps/mobile-consumer/components/loja/gradientes.ts` — existe e serve gradiente
>    sem dependência (a passarela aprendeu isso do jeito difícil; aqui provavelmente
>    não é preciso, o hero é cartão chapado, mas saiba que existe).
> 5. `apps/mobile-consumer/app/loja/[slug].tsx`, `lib/store-fonts.ts`, docs 02
>    §2.2/§2.3/§2.5/§2.6, docs 05 §5.6, `lib/mock/dataset.ts` (materializador ~1085–1135
>    com `estoque` já no tuple), `packages/lib/.../__tests__/store-theme.test.ts`.
>
> **Ambiente:** typecheck dos apps via
> `./packages/lib/node_modules/.bin/tsc --noEmit -p apps/<app>/tsconfig.json`;
> `pnpm --filter mobile-consumer lint` NÃO roda aqui (eslint ausente) — não perder
> tempo. Mensagens de commit SEMPRE via `git commit -F <arquivo>` (here-string quebra).

> **Nota de escopo:** 1 tela analisada (home). Se o usuário enviar mais telas do MESMO
> design antes da execução, complementar §0/Fase C sem mudar as decisões do §1.

---

## 0. O design de referência (análise destilada da tela)

App de grocery/mercado fresco. Elementos, de cima para baixo (ignorando o status bar e
a barra de navegação flutuante — chrome do mockup, ver regra acima):

1. **HERO-CARTÃO verde-mata**: cartão arredondado (não full-bleed!) em verde-floresta
   profundo, com manchete clara ("Fresh Items with fast delivery grocery"), subtexto
   pequeno, pill LIMA "Shop Now" e uma COLAGEM de fotos de hortifruti sangrando o lado
   direito do cartão; DOTS de carrossel abaixo — é um pager de banners.
2. **CHIPS CIRCULARES DE CATEGORIA**: fileira horizontal de discos com FOTO (Vegetables,
   Fruits, Meat, Dairy) e rótulo pequeno embaixo + "See more".
3. **Seção "Popular" com CRONÔMETRO**: título ao lado de um chip LIMA com contagem
   regressiva (03:32:29) — ofertas por tempo limitado.
4. **CARDS DE PRODUTO em grade**: cartão branco arredondado com sombra suave, foto
   grande do produto, coração de favorito no canto, nome, estrelas de avaliação e
   preço com UNIDADE ("$2.90 /KG" — o /KG em cinza).
5. Paleta: página branca-quente, VERDE-MATA profundo (#22392B±) nos blocos, LIMA
   (#C6E84B±) como acento de ação/urgência, tinta verde-escura. Sans geométrica
   ARREDONDADA em todo o texto.

**Traduções decididas (dados que o app NÃO tem — não inventar):**
- O **coração de favorito** NÃO entra: o app não tem wishlist, e um coração que só
  finge funcionar engana o usuário. No canto do card entra o selo de OFERTA quando
  houver promoção — o mesmo canto, informação verdadeira.
- As **estrelas de avaliação** NÃO entram: produto não tem rating no schema. No lugar,
  a linha de descrição curta em muted (informação que existe).
- A navegação flutuante NÃO entra (regra do usuário + regra da casa).

**Por que é um arquétipo novo (docs/store-theme/02 §2.5):**
- **Não é o `market`** (o vizinho óbvio — mercado/conveniência): market é desenhado
  INTERNAMENTE, denso e utilitário (grade compacta, ofertas em chips, zero
  personalidade de marca), sem vitrine própria. Fresh é derivado de referência com
  gramática própria: hero-cartão verde-mata com colagem, chips circulares de foto,
  countdown de ofertas, preço por unidade e cards soltos com sombra — feira premium,
  não corredor de supermercado. O market continua servindo a conveniência densa;
  fresh é a QUITANDA com marca.
- **Não é o `volt`** (o outro lima): volt é fitness — caps pesadas Archivo, palco
  cinza de produto, ritmo de performance. Fresh é orgânico arredondado com verde-mata
  de âncora e lima só como acento de ação.
- **Não é o `garden`**: garden é comida saudável PRONTA (restaurante — creme, pastéis,
  serifa macia, adesivos). Fresh é VAREJO de alimentos frescos: grade de produtos,
  preço/kg, countdown. Outro uso, outra gramática.

---

## 1. Decisões fechadas (não rediscutir na execução)

| Decisão | Valor |
|---|---|
| Código | `fresh` · Nome humano `Fresh` |
| Vitrine consumer | `LojaFeira.tsx` + `ProdutoFeira.tsx` + `feira-ui.tsx` |
| Nicho | hortifruti, quitandas, mercados frescos, empórios de bairro |
| Gate | `fresh` + categoria ∈ {`mercado-conveniencia`, `alimentos-bebidas`} (Set `CATEGORIAS_VITRINE_FEIRA`) |
| Mapping | alternativa em `mercado-conveniencia` E em `alimentos-bebidas` |
| Token display | **Plus Jakarta Sans** [500, 600, 700] — **dependência nova** |
| Token body | **Plus Jakarta Sans** [400, 500, 600, 700] (família única, como a referência) |
| Fonte DNA local | nenhuma (como a passarela — a voz é a família arredondada) |
| Modo | `light` · Shape `round`/`comfortable` · Scale `regular` |
| Loja-demo | **"Quintal Verde"**, slug `quintal-verde`, Piso Térreo (essenciais), categoria canon nova `hortifruti` |

**Cores do preset — JÁ VALIDADAS via script de contraste (não alterar sem re-validar):**

```
bg        #FBFBF7   surface #FFFFFF   surfaceAlt #F1F4EC (disco dos chips)
ink       #17211A   (15.95:1)
inkMuted  #63705F   (5.04:1 no bg — o "/kg" e a descrição escrevem direto no claro)
line      #E7EBE2
accent    #C6E84B   (LIMA — pill de CTA, chip do cronômetro, selo de oferta)
accentInk #1F3020   (10.02:1 sobre o lima)
```

**REGRA DE OURO DO ACCENT:** o lima é CLARO — **nunca é cor de TEXTO** sobre a página.
Preços, nomes e títulos usam `ink`; o accent só aparece como FUNDO (pill, chip, selo)
com `accentInk` por cima. Escrever isso no comentário do preset.

**Constantes DNA da vitrine** (fixas; paleta troca o lima e a temperatura do claro):

```
VERDE_MATA   #22392B   hero-cartão e fecho (11.47:1 com o creme abaixo)
CREME_FEIRA  #F4F7EC   tinta fixa sobre o VERDE_MATA
```

**Paletas curadas (2, mode light) — TAMBÉM validadas; o verde-mata fica nas três:**

```
colheita (Colheita) — âmbar de vitrine de outono:
  bg #FCFAF3  surface #FFFFFF  surfaceAlt #F5F0DE  ink #201C12 (16.26:1)
  inkMuted #6E6752 (5.40:1)  line #EDE7D4  accent #EFC23D  accentInk #2A2410 (9.17:1)

pitanga (Pitanga) — o vermelho-fruta claro:
  bg #FDF9F6  surface #FFFFFF  surfaceAlt #F7ECE5  ink #231512 (16.89:1)
  inkMuted #71594E (6.19:1)  line #F0E4DD  accent #F08A6E  accentInk #3A140C (6.66:1)
```

Validações extra (feitas): accent sobre VERDE_MATA ≥ 3 (UI, WCAG 1.4.11) nas três
peles — 8.91 / 7.38 / 5.07.

---

## FASE A — Tokens na lib

### A1. `types.ts`
- `| 'fresh' // hortifruti/mercado fresco — verde-mata + lima, chips de foto, preço por unidade` após `'mono'`; comentário "Os 20" → 21.

### A2. `presets.ts` — cabeçalho 20 → 21; inserir após `mono`:

```ts
// ── Referências: hortifruti / quitandas / mercados frescos ─────────────────
fresh: {
  codigo: 'fresh',
  nome: 'Fresh',
  descricao:
    'Feira premium. Página clara, hero-cartão verde-mata com colagem de frescos, lima de ação, chips circulares de categoria, ofertas por tempo e preço por unidade. Para hortifruti e mercados frescos.',
  mood: ['fresco', 'vivo', 'confiável'],
  referencias: [],  // mockup enviado pelo usuário, sem URL pública — citar nos docs como "app grocery (mockup)"
  tokens: {
    mode: 'light',
    color: pele({
      bg: '#FBFBF7',
      surface: '#FFFFFF',
      surfaceAlt: '#F1F4EC',
      ink: '#17211A',
      // O "/kg" e a linha de descrição escrevem DIRETO no claro da página —
      // AA contra bg garantido em __tests__ (regra garden/slice/mono).
      inkMuted: '#63705F',
      line: '#E7EBE2',
      // LIMA: CTA, cronômetro e selo de oferta. É CLARO — NUNCA vira cor de
      // texto sobre a página; só fundo, com accentInk por cima.
      accent: '#C6E84B',
      accentInk: '#1F3020',
    }),
    typography: {
      // A sans geométrica arredondada única da referência.
      display: { family: 'Plus Jakarta Sans', weights: [500, 600, 700] },
      body: { family: 'Plus Jakarta Sans', weights: [400, 500, 600, 700] },
      scale: 'regular',
    },
    shape: { radius: 'round', density: 'comfortable' },
  },
},
```

### A3. `palettes.ts` — chave `fresh` com `colheita` e `pitanga` (§1), comentários no
estilo do arquivo; anotar que o VERDE_MATA da vitrine fica fixo nas três peles.

### A4. `mapping.ts`
- `'mercado-conveniencia'`: alternativas → `['utility', 'fresh']`.
- `'alimentos-bebidas'`: alternativas → `[..., 'slice', 'fresh', 'market', 'soft']`
  (inserir `fresh` após `slice`).

### A5. Testes novos (padrão dos guards slice/mono):

```ts
const PELES_FRESH = [
  ['preset', ARQUETIPOS.fresh.tokens.color],
  ...PALETAS.fresh.map((p) => [`paleta ${p.codigo}`, p.color] as const),
] as const

it('fresh: inkMuted legível sobre bg — o preço/unidade escreve direto no claro', () => {
  for (const [nome, cor] of PELES_FRESH) {
    expect(contrastRatio(cor.bg, cor.inkMuted), `fresh/${nome}`).toBeGreaterThanOrEqual(4.5)
  }
})

/**
 * O hero-cartão e o fecho são VERDE_MATA fixo com creme fixo por cima, e a
 * pill de accent pousa sobre esse verde nas três peles. Espelhos das
 * constantes de feira-ui.tsx — se mudar lá, muda aqui.
 */
it('fresh: verde-mata sustenta o creme e o accent de cada pele', () => {
  const VERDE_MATA = '#22392B'
  const CREME_FEIRA = '#F4F7EC'
  expect(contrastRatio(VERDE_MATA, CREME_FEIRA)).toBeGreaterThanOrEqual(4.5)
  for (const [nome, cor] of PELES_FRESH) {
    expect(
      contrastRatio(VERDE_MATA, cor.accent),
      `fresh/${nome}: pill de accent invisível sobre o verde-mata (mín. 3:1 UI)`,
    ).toBeGreaterThanOrEqual(3)
  }
})
```

### A6. `pnpm --filter @mallevo/lib test` + `typecheck` — verdes.

---

## FASE B — Fonte Plus Jakarta Sans

### B1. `pnpm --filter mobile-consumer add "@expo-google-fonts/plus-jakarta-sans@^0.4.1"`.
Conferir exports em `node_modules/.pnpm/@expo-google-fonts+plus-jakarta-sans*/.../index.js`:
`PlusJakartaSans_400Regular`, `_500Medium`, `_600SemiBold`, `_700Bold`.

### B2. `lib/store-fonts.ts` — cabeçalho 20 → 21; registrar:
```ts
'Plus Jakarta Sans': {
  400: PlusJakartaSans_400Regular,
  500: PlusJakartaSans_500Medium,
  600: PlusJakartaSans_600SemiBold,
  700: PlusJakartaSans_700Bold,
},
```
(`nomeFonte` remove espaços — 'Plus Jakarta Sans' + 600 → 'PlusJakartaSans_600SemiBold',
que bate com o export. Conferir mesmo assim.)

### B3. Web: nada (Google Fonts automático).

---

## FASE C — Vitrine `LojaFeira.tsx` + `feira-ui.tsx`

Contrato idêntico às irmãs (props de `LojaForno` — SEM os campos extras da passarela:
esta vitrine NÃO tem adição rápida; o card abre o PDP, que é onde a compra acontece,
como em todas as irmãs exceto a passarela). `useStoreDesign`, `fontStyle`,
`useTransicaoSaida` (saída radial no `VERDE_MATA`), reduce-motion, StatusBar
**"dark" o tempo todo** (a página é clara do topo ao pé — o hero é CARTÃO, não
full-bleed; primeira vitrine sem virada de status bar).

### C1. `feira-ui.tsx`
1. `comAlfa` — copiar.
2. `VERDE_MATA = '#22392B'` e `CREME_FEIRA = '#F4F7EC'` exportados (o teste da lib
   espelha).
3. `BotaoFeira` — botão circular padrão (copiar `BotaoPassarela`, badge no `accent`
   com `accentInk` — aqui o accent é lima e funciona como badge).
4. `SeloOferta({ texto })` — pill pequeno `colors.accent`/`accentInk`, raio 999,
   caps 10.5px — o canto do card (substitui o coração da referência).
5. `ChipCronometro({ segundosRestantes })` — pill `colors.accent` com `accentInk`,
   texto tabular `HH:MM:SS` 12px 700. Puro visual; quem conta é a vitrine.
6. `DiscoCategoria({ uri, rotulo, aoTocar })` — o chip circular de foto: disco 64px
   (`borderRadius` 999, fundo `surfaceAlt`, foto `cover`), rótulo 11.5px `ink` 600
   embaixo, largura ~76px, `TouchableOpacity`.

### C2. Seções do `LojaFeira`, na ordem

1. **HeroFeira** — PAGER de cartões verdes (a referência tem dots):
   - até 3 slides: slide 0 = manchete + subtexto + pill; slides 1–2 = variações com
     as próximas fotos (montar dos produtos com foto se não houver banner). Cada
     slide: cartão `VERDE_MATA` raio 28, `marginHorizontal: spacing.screenX`,
     altura ~200–220:
     - esquerda (~58%): manchete = 1ª oração da descrição via `repartirDescricao`
       (copiar helper da passarela; sem descrição → nome da loja) em Plus Jakarta 700
       ~21px `CREME_FEIRA`; subtexto = `detalhe` truncado 2 linhas 12px
       `comAlfa(CREME_FEIRA, 0.75)`; pill `colors.accent` "VER OFERTAS" (ou "VER
       PRODUTOS" sem promo) `accentInk` caps 11px → scroll-to;
     - direita: foto (banner ?? produto) em disco grande (~110px) vazando o canto
       do cartão + um disco menor (~54px) sobreposto com outra foto — a colagem;
   - **pager horizontal `pagingEnabled` com LARGURA EXPLÍCITA** (a regra herdada) e
     dots `colors.ink`/30% abaixo, só quando slides > 1. SEM autoplay — zero loop
     animado (regra da casa recente).
   - Menos de 2 fotos → hero único sem dots. Sem foto nenhuma → cartão verde só de
     texto (nunca some).
2. **CategoriasFeira** — a assinatura: ScrollView horizontal de `DiscoCategoria`,
   um por seção do cardápio (foto = 1º produto com foto da seção; seção sem foto
   nenhuma → disco com a inicial da seção em `ink` sobre `surfaceAlt`). Tap → rola
   até a seção (mapa de `y` por título via `onLayout` — generalizar o scroll-to
   das irmãs para N alvos).
3. **OfertasFeira** — só quando existir promoção:
   - produtos com `preco_promocional` de TODAS as seções (até 6). Recorte
     TRANSVERSAL: as seções de origem ficam intactas nas grades (nada de remover —
     regra `58aafae` nem se aplica porque não é eleição de seção);
   - cabeçalho: "Ofertas do dia" (display 700 ~20px `ink`) + `ChipCronometro`
     contando até 23:59:59 LOCAIS do dia (recalcular o alvo a cada tick; virou o
     dia → some/renova sozinho). Tick de 1s via `setInterval` limpo no unmount —
     um setState/s enquanto montada, custo aceitável e é a graça do elemento;
   - grade 2 colunas de `CardFeira` (ver C3) com os itens em promo.
4. **CorredoresFeira** — uma por seção do cardápio, com âncora (`onLayout`):
   título da seção (display 700 ~19px `ink`, à esquerda) + grade 2 colunas de
   `CardFeira`. TODOS os produtos aparecem aqui (as ofertas repetem — recorte, não
   mudança).
5. **FechoFeira** — cartão `VERDE_MATA` raio 28 com gutter (o design é de cartões,
   não de faixas): logo-texto `CREME_FEIRA`, linha `HOJE HH:MM–HH:MM · N MIN · HH:MM`
   (relógio de 30s + `DIAS`/`horarios`, padrão FechoForno), pequena folha/• decorativa.

### C3. `CardFeira` (no LojaFeira; PDP reusa o formato, não o componente)
Cartão `surface` raio 20 com `consumerDesign.shadow.soft`, padding 10:
- foto quadrada raio 14 no topo (`cover`; sem foto → bloco `surfaceAlt`);
- `SeloOferta("OFERTA")` absoluto no canto sup. direito quando `temPromo`;
- nome 2 linhas body 600 14px `ink`;
- descrição 1 linha 11.5px `inkMuted` (o lugar das estrelas da referência);
- linha de preço: preço body 700 15px `ink` + **unidade** ` /kg` 11.5px `inkMuted`
  quando `metadata.unidade` existir (helper `unidadeDe(p)` com cast padrão
  `recorteDe`); promo: preço antigo riscado 11.5px `inkMuted` ao lado;
- toque no card inteiro → `aoAbrirProduto(p)`. SEM adição rápida (decisão §C topo).

**Chrome:** `BotaoFeira` voltar + sacola (contador), fixos, `sairPara` com
`cor: VERDE_MATA`. Sem FAB, sem barra de navegação própria (regra do usuário).

---

## FASE D — PDP `ProdutoFeira.tsx`

Ossos de `ProdutoPassarela.tsx` (galeria com largura explícita, checagem de opções
com **erro checado explicitamente** — copiar o `checarOpcoes` corrigido do commit
`30c1d6a` adaptado ao PDP, guarda de troca com `zIndex` acima do chrome, CTA que
pisca). Pele:

- página clara, StatusBar dark; chrome `BotaoFeira`;
- palco: cartão `surface` raio 24 com a foto (pager se galeria), `SeloOferta` no
  canto quando promo;
- ficha: nome display 700 ~24px `ink`; linha preço GRANDE: preço display 700 ~26px
  `ink` + `/unidade` 14px `inkMuted` + promo riscada; descrição body 400 `inkMuted`;
  linhas de meta se houver `metadata.especificacoes` (par rótulo/valor discreto);
- CTA fixo: pill `colors.accent` full-width "ADICIONAR · R$ X" em `accentInk` caps →
  confirmado vira `VERDE_MATA` com "NA SACOLA ✓" em `CREME_FEIRA`.

---

## FASE E — Roteamento `[slug].tsx`

```ts
/** Categorias da vitrine feira (arquétipo `fresh` — hortifruti/mercado fresco). */
const CATEGORIAS_VITRINE_FEIRA = new Set(['mercado-conveniencia', 'alimentos-bebidas'])
// ...
// Feira: hortifruti/mercado fresco (verde-mata + lima, chips de foto, preço/un).
const vitrineFeira =
  design.arquetipo === 'fresh' && CATEGORIAS_VITRINE_FEIRA.has(loja?.categoria_slug)
```
Entra no `if` grande e nas duas cadeias antes do fallback editorial.

---

## FASE F — Backend

F1. Web: nada. F2. `onboard-tenant`: `'fresh'` em `PRESETS_VALIDOS` (após `'mono'`) →
21; comentário "Os 20" → 21.

---

## FASE G — Demo "Quintal Verde"

### G1. `dataset.ts`
1. Tuple: 8º campo opcional `unidade?: string` (após `estoque`), materializado como
   `...(unidade ? { unidade } : {})` no metadata. Aditivo.
2. `CATEGORIA_CANON`: `hortifruti: { slug: 'mercado-conveniencia', nome: 'Hortifruti' },`
3. Loja no **Piso Térreo** (essenciais), perto do Hortifruti Viçoso (que continua
   `market` — intocado):

```ts
{
  nome: 'Quintal Verde',
  slug: 'quintal-verde',
  descricao: 'Colhido de manhã, na sua casa antes do almoço — fruta, verdura e horta o ano inteiro.',
  taxa: 490,
  tempo: 35,
  categoriaSlug: 'hortifruti',
  // Loja-demo da vitrine feira (app grocery): hero-cartão verde-mata, chips
  // circulares de categoria, ofertas com cronômetro e preço por unidade.
  preset: 'fresh',
  logo: LOGO_QUINTAL,
  banner: <foto VIVA de feira/hortifruti — ver regra>,
  catalogo: [
    ['Frutas da estação', [ ~5 itens com unidade ('kg', 'un', 'dz') ]],
    ['Verduras & legumes', [ ~5 itens ('kg', 'maço', 'un') ]],
    ['Da horta', [ ~3 itens (temperos frescos, 'maço'/'vaso') ]],
    ['Mercearia fresca', [ ~3 itens (ovos 'dz', mel 'pote', granola) ]],
  ],
},
```

**Fotos:** aqui a identidade é COR VIVA (o oposto da passarela — NÃO usar `fotoPB`).
Frutas/verduras da Unsplash: validar CADA URL com `curl -sI` (200) **e conferência
visual** (padrão das execuções anteriores — houve 404 e foto imprópria nas demos
passadas). Candidatos a testar primeiro (acervo comum de hortifruti):
`photo-1547514701-42782101795e` (maçãs), `photo-1587735243615-c03f25aaee15`
(laranjas), `photo-1518977676601-b53f82aba655` (batatas), `photo-1592924357228-91a4daadcfea`
(tomates), `photo-1573246123716-6b1782bfc499` (morangos), `photo-1550258987-190a2d41a8ba`
(abacaxi), `photo-1566385101042-1a0aa0c1268c` (limões), `photo-1540148426945-6cf22a6b2383`
(banana), `photo-1576045057995-568f588f82fb` (alface), `photo-1598170845058-32b9d6a5da37`
(cenoura), `photo-1615485500704-8e990f9900f7`, `photo-1582515073490-39981397c445`
(ovos). A promo 1-em-4 do materializador garante o bloco de ofertas.

### G2. `logos.ts` — `LOGO_QUINTAL`
PNG 512 procedural (padrão dos anteriores, script no scratchpad + conferência visual):
FOLHA cheia — lente de duas curvas com talo curto — em `#22392B`.

---

## FASE H — Documentação

### H1. docs 02 — cabeçalho 15 de referência → **16** (o mockup conta como referência
externa mesmo sem URL; citar "app grocery (mockup do cliente)"), total 20 → 21, §2.2
"Os 20" → 21, "(15)" → (16); entrada `#### A9. Fresh — \`fresh\`` após a Mono (formato
das irmãs: nichos, DNA do §0 incluindo as TRADUÇÕES — coração→selo de oferta,
estrelas→descrição, nav do mockup ignorada —, mood, paletas com a nota do verde-mata
fixo, "**Por que não é o Market/Volt/Garden**", nota "2026-08: 21º arquétipo, com
vitrine própria"); §2.3: linhas `mercado-conveniencia` e `alimentos-bebidas` ganham
`fresh`; §2.5 "21º" → "22º"; §2.6: "**Hortifruti / mercado fresco** → Fresh: app
grocery (mockup)."

### H2. docs 05 §5.6 — título + intro ganham **feira**; gate; parágrafo "**Vitrine
feira**" no formato das irmãs: hero-pager de cartões verdes com colagem e largura
explícita, chips circulares com scroll-to por seção, ofertas transversais com
cronômetro de 1s até a meia-noite, cards com selo de oferta e preço por unidade
(`metadata.unidade`), fecho-cartão, chrome de dois botões e **nenhuma barra de
navegação própria** (exigência do cliente), StatusBar dark fixa (hero é cartão, não
full-bleed), zero loop animado além do cronômetro textual.

### H3. Varredura `grep -rn "20 arquétipo|os 20|Os 20|20 presets|20 códigos"` em docs/,
packages/, apps/, supabase/ (excluindo docs/dev/plano-*) e corrigir.

---

## FASE I — Aceite e commits

1. Lib: test + typecheck verdes (novos testes fresh incluídos).
2. Apps: tsc limpo (mobile e web, caminho do topo).
3. Demo: Piso Térreo exibe "Quintal Verde"; vitrine feira abre (hero verde com pill
   lima; chips rolam até as seções; ofertas com cronômetro contando; cards com /kg);
   PDP adiciona e pisca; guarda de troca acima do chrome; voltar = saída radial verde.
4. Editor web: "Fresh" listado; paletas Colheita/Pitanga.
5. `(tabs)/_layout.tsx` INTOCADO (diff vazio nesse arquivo).
6. Nada existente alterado além de contagens, F2 e o campo opcional do tuple.

**Commits (via `git commit -F`):**
1. `feat(store-theme): arquétipo fresh (21º) — hortifruti, ref. app grocery`
2. `feat(consumer): vitrine feira — hero verde-mata, chips de categoria e ofertas com cronômetro`
3. `feat(consumer): demo Quintal Verde nos essenciais`
4. `docs(store-theme): fresh nos arquétipos e vitrine feira no §5.6`

## Riscos e escapes
- **Exports do pacote da fonte**: conferir nomes exatos antes de mudar estratégia;
  último recurso: Nunito (instalada) com registro da troca.
- **Cronômetro**: `setInterval` de 1s SEMPRE com clearInterval no unmount; se o
  bloco de ofertas não renderiza, o interval nem nasce.
- **Accent como texto**: proibido — lima sobre branco reprova AA. Qualquer texto
  "colorido" é `ink`/`accentInk` sobre fundo accent.
- **Herdar as lições**: pager com largura explícita; supabase resolve `{data:null,
  error}` em falha (checar `error` no PDP); diálogo de troca com zIndex acima do
  chrome; descrição repartida (hero + nada de repetição); chips/ofertas nunca
  REMOVEM produtos das grades.
- **Fotos**: nunca commitar ID sem curl 200 + conferência visual.
