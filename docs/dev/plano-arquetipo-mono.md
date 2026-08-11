# Plano de execução — 20º arquétipo `mono` (moda monocromática, ref. Homelander)

> **Para o executor (Opus 5):** este plano foi preparado com análise completa do design de
> referência (capturas mobile do template Framer **Homelander** —
> `https://homelanderstores.framer.website/`) e do código existente. Siga as fases NA
> ORDEM. Nada dos 19 arquétipos existentes é alterado — o trabalho é 100% aditivo (fora a
> varredura de contagens "19 → 20", a inclusão do código novo em `PRESETS_VALIDOS` e um
> campo OPCIONAL novo no tuple do mock, ver §G1).
>
> **Antes de escrever qualquer código, leia estes arquivos** (vocabulário e padrão de
> qualidade a seguir):
> 1. `packages/lib/src/store-theme/types.ts`, `presets.ts`, `palettes.ts`, `mapping.ts`
> 2. `apps/mobile-consumer/components/loja/LojaForno.tsx` + `ProdutoForno.tsx` +
>    `forno-ui.tsx` — o molde estrutural MAIS RECENTE (props, `useStoreDesign`,
>    `fontStyle`, reduce-motion, `useTransicaoSaida`, guarda de troca de loja, helpers
>    SVG extraídos, virada de status bar por `alturaHero`). **Atenção ao commit
>    `58aafae`**: os erros corrigidos ali (seção eleita sumindo itens; descrição repetida;
>    galeria do PDP sem largura explícita) NÃO podem renascer nesta vitrine.
> 3. `apps/mobile-consumer/components/loja/LojaEditorial.tsx` — a vitrine de moda
>    existente, para NÃO repetir a gramática dela (ver §0 "por que não é o editorial")
>    e para copiar o contrato de props/`ProdutoVitrine`.
> 4. `apps/mobile-consumer/app/loja/[slug].tsx` — gates e roteamento de vitrines
> 5. `apps/mobile-consumer/lib/store-fonts.ts` — contrato de fontes RN
> 6. `docs/store-theme/02-arquetipos-de-design.md` §2.2/§2.3/§2.5/§2.6 e
>    `docs/store-theme/05-aplicacao-storefront-consumer.md` §5.6 — formato da documentação
> 7. `apps/mobile-consumer/lib/mock/dataset.ts` — formato das lojas-demo, o materializador
>    de produtos (linhas ~1085–1121: promo automática 1-em-4, galeria automática para
>    fotos Unsplash, `metadata` montado do tuple) e o Piso 1 `moda-beleza`
> 8. `packages/lib/src/store-theme/__tests__/store-theme.test.ts` — invariantes que o novo
>    arquétipo PRECISA passar (os testes iteram `ARQUETIPOS`/`PALETAS` dinamicamente)

> **Nota de escopo das capturas:** o plano foi destilado de 3 telas (hero, card de
> produto em coluna única, seção "New Arrival" em grade de 2). Se o usuário enviar mais
> telas do MESMO template antes da execução, o §0 e a Fase C devem ser complementados —
> sem mudar as decisões já fechadas do §1.

---

## 0. O design de referência (análise destilada das telas)

Referência: template Framer **Homelander** (`https://homelanderstores.framer.website/`),
loja de moda (masculina E feminina — o mesmo design serve as duas; ver §G, duas
lojas-demo). Ignorar o selo "Made in Framer" das capturas — chrome do Framer.

**DNA visual (a gramática que a vitrine precisa reproduzir):**

1. **Mundo MONOCROMÁTICO**: página branca, tinta quase-preta, e TODA a fotografia em
   PRETO E BRANCO. O design não tem cor — a fotografia P&B é a assinatura mais forte.
2. **UMA única cor no sistema inteiro**: o chip LARANJA de escassez ("Only 36 left"),
   pill pequeno no canto do card. É acento de URGÊNCIA, nunca decoração.
3. **Comércio direto no card**: pill branco "QUICK ADD" com ícone de sacola SOBRE a
   foto — adiciona à sacola sem abrir a página do produto. Nenhuma vitrine existente
   faz isso; é diferença ESTRUTURAL, não de pele.
4. **Cards arredondados em palco cinza**: foto em cartão de canto ~24px sobre
   cinza-claro; primeiro em COLUNA ÚNICA quase full-width (os destaques), depois em
   GRADE DE 2 ("New Arrival").
5. **Linha nome-esquerda / preço-direita** sob cada card, em sans limpa — a ficha
   inteira do item são essas duas âncoras.
6. **Hero fashion full-bleed**: foto P&B de moda ocupando a tela, eyebrow pequeno
   ("FASHION"), manchete em sans média ("Designed to Boost Your Online Store") e pill
   BRANCO de CTA ("Shop Now") na base.
7. **Títulos de seção em peso REGULAR gigante** ("New Arrival") — a elegância vem do
   tamanho com peso leve, não de bold.
8. **Monograma serifado COROADO** ("H" com coroa) como marca — o único ornamento.
9. Tipografia: uma grotesca contemporânea única para tudo (nav, manchete, nome, preço).

**Por que é um arquétipo novo (justificativa exigida por docs/store-theme/02 §2.5):**
- **Não é o `editorial`** (o vizinho mais próximo — também branco, sans, minimal):
  editorial é CONTEMPLATIVO — vitrine chrome-less, fotos 3:4 sem cartão, seções
  numeradas, PDP imersivo; o produto é exposto como página de revista e TODA compra
  passa pelo PDP. Mono é COMÉRCIO-primeiro: card arredondado em palco cinza com
  QUICK ADD sobre a foto (compra na grade, sem abrir o produto), chip de escassez,
  linha nome/preço. Estrutura de interação genuinamente diferente — e a fotografia
  P&B + o laranja único são identidade que paleta nenhuma do editorial produz.
- **Não é o `raw`**: raw é dark, condensada pesada, volt-lime, humor de drop street.
  Mono é claro, peso regular, silêncio de luxo.
- **Não é o `serene`**: serene é delicadeza de skincare (tipo fina, cinza-névoa,
  botões de contorno), sem gramática de moda nem comércio no card.
- **Não é o `noir`**: noir é preto dramático com serifa metálica; mono é branco com
  grotesca, e o único ornamento é o monograma.

---

## 1. Decisões fechadas (não rediscutir na execução)

| Decisão | Valor |
|---|---|
| Código do arquétipo | `mono` (inglês, como os demais) |
| Nome humano | `Mono` |
| Vitrine consumer | `LojaPassarela.tsx` + `ProdutoPassarela.tsx` + `passarela-ui.tsx` (tradução PT como garden→Horta, slice→Forno) |
| Nicho | moda monocromática — alfaiataria, básicos premium, cápsula masculina/feminina |
| Gate da vitrine | `mono` + categoria === `vestuario-calcados` |
| Mapping | alternativa em `vestuario-calcados` |
| Token display | **Manrope** [400, 600, 700] (títulos de seção em 400 GIGANTE — a régua do §0.7; manchete 600; monograma/nome 700) — **dependência nova** |
| Token body | **Manrope** [400, 500, 600, 700] (família única, como a referência; precedente soft/serene/slice) |
| Fonte DNA local | **nenhuma** — a primeira vitrine sem fonte extra: a voz é o peso, não a família |
| Modo | `light` |
| Shape | `radius: 'round'`, `density: 'comfortable'` |
| Type scale | `regular` |
| Lojas-demo | **DUAS**, Piso 1 `moda-beleza`: **"Monarca"** (masculina, preset default) e **"Selene"** (feminina, paleta `porcelana`) — o pedido do usuário cobre os dois nichos e a dupla demonstra a tese das paletas |

**Cores do preset — JÁ VALIDADAS contra `contrastRatio` (script no scratchpad), não
alterar sem re-validar:**

```
bg        #FFFFFF   (página branca)
surface   #FFFFFF
surfaceAlt#F2F2F2   (o palco cinza dos cards — 4.55:1 com inkMuted, 16.87:1 com ink)
ink       #111111   (18.88:1 sobre bg)
inkMuted  #6E6E6E   (5.10:1 sobre bg — a linha nome/preço escreve DIRETO no branco)
line      #ECECEC
accent    #111111   (o CTA é PRETO — pill "adicionar", como o mundo mono pede)
accentInk #FFFFFF   (18.88:1)
```

**Constante DNA da vitrine** (fixa; a paleta troca a temperatura do branco, o laranja
fica):

```
LARANJA_ESTOQUE  #C2410C   chip de escassez — ÚNICA cor do design.
                           Texto BRANCO fixo por cima: 5.18:1 (validado).
                           Aprofundado vs. o laranja da referência (~#F97316, que
                           daria 2.8:1) para AA real em texto pequeno.
```

**Paletas curadas (2, mesmo `mode: light`) — TAMBÉM validadas; trocam TEMPERATURA,
nunca adicionam cor (a tese do mono):**

```
areia (Areia) — o off-white quente de quiet luxury:
  bg #F6F2EA  surface #FCFAF6  surfaceAlt #ECE6D8
  ink #1A1712 (16.00:1)  inkMuted #6B6355 (5.31:1)  line #E5DECE
  accent #1A1712  accentInk #F6F2EA

porcelana (Porcelana) — o rosé quase imperceptível da loja feminina:
  bg #FAF5F2  surface #FFFDFB  surfaceAlt #F2E9E3
  ink #201417 (16.53:1)  inkMuted #6F5D5B (5.72:1)  line #EBE0D9
  accent #201417  accentInk #FAF5F2
```

**Fotografia P&B — decisão técnica:** React Native não aplica filtro grayscale em
`Image` sem dependência nova (color-matrix) — NÃO adicionar dependência para isso. A
identidade P&B vem da CURADORIA: as lojas-demo usam fotos Unsplash já monocromáticas /
de paleta neutra (verificadas visualmente, §G), e a doc registra que a estética pede
fotografia P&B do lojista. Sem filtro em runtime.

---

## FASE A — Tokens na lib (`packages/lib/src/store-theme/`)

### A1. `types.ts`
- Adicionar `| 'mono' // moda monocromática — branco, fotografia P&B, quick-add no card, chip laranja único` ao union (após `'slice'`).
- Comentário `/** Os 19 arquétipos ... */` → 20.

### A2. `presets.ts`
- Cabeçalho "Catálogo dos 19 arquétipos" → 20.
- Inserir após o bloco `slice`:

```ts
// ── Referências: moda monocromática / alfaiataria / básicos premium ────────
mono: {
  codigo: 'mono',
  nome: 'Mono',
  descricao:
    'Moda em preto e branco. Página branca, fotografia monocromática, cards em palco cinza com compra direta na grade, e uma única cor no sistema: o laranja do chip de escassez. Para alfaiataria e básicos premium.',
  mood: ['monocromático', 'contemporâneo', 'direto'],
  referencias: ['https://homelanderstores.framer.website/'],
  tokens: {
    mode: 'light',
    color: pele({
      bg: '#FFFFFF',
      surface: '#FFFFFF',
      // O palco cinza dos cards da referência — toda foto pousa nele.
      surfaceAlt: '#F2F2F2',
      ink: '#111111',
      // A linha nome/preço de cada card escreve DIRETO no branco da página
      // (sem surface por baixo) — AA garantido em __tests__.
      inkMuted: '#6E6E6E',
      line: '#ECECEC',
      // O CTA do mundo mono é PRETO — o pill "adicionar" da referência.
      accent: '#111111',
      accentInk: '#FFFFFF',
    }),
    typography: {
      // Família única, como a referência: os títulos de seção falam em 400
      // GIGANTE (a elegância vem do tamanho com peso leve, não de bold).
      display: { family: 'Manrope', weights: [400, 600, 700] },
      body: { family: 'Manrope', weights: [400, 500, 600, 700] },
      scale: 'regular',
    },
    shape: { radius: 'round', density: 'comfortable' },
  },
},
```

### A3. `palettes.ts`
- Chave `mono` em `PALETAS` com `areia` e `porcelana` (§1), comentários no estilo do
  arquivo (ex.: `// Off-white quente de quiet luxury — muda a temperatura, nunca
  adiciona cor.`).

### A4. `mapping.ts`
- `'vestuario-calcados'`: alternativas → `['raw', 'noir', 'volt', 'mono']`.

### A5. Testes novos em `__tests__/store-theme.test.ts`
No `describe('qualidade de autoria dos ARQUETIPOS')`, no padrão dos guards slice:

```ts
/** Peles do mono: preset e paletas curadas, checadas juntas. */
const PELES_MONO = [
  ['preset', ARQUETIPOS.mono.tokens.color],
  ...PALETAS.mono.map((p) => [`paleta ${p.codigo}`, p.color] as const),
] as const

/**
 * Na vitrine passarela a linha nome/preço de cada card escreve DIRETO no bg
 * (sem cartão por baixo), e a descrição do PDP idem.
 */
it('mono: inkMuted legível sobre bg — a ficha do card escreve direto na página', () => {
  for (const [nome, cor] of PELES_MONO) {
    expect(
      contrastRatio(cor.bg, cor.inkMuted),
      `mono/${nome}: inkMuted ilegível sobre bg`,
    ).toBeGreaterThanOrEqual(4.5)
  }
})

/**
 * O chip de escassez é a ÚNICA cor do arquétipo e carrega texto branco fixo
 * em corpo pequeno. Espelho da constante `LARANJA_ESTOQUE` de
 * passarela-ui.tsx — se mudar lá, mudar aqui.
 */
it('mono: chip de escassez sustenta texto branco (AA texto pequeno)', () => {
  const LARANJA_ESTOQUE = '#C2410C'
  expect(contrastRatio(LARANJA_ESTOQUE, '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
})
```

Se algum hex do §1 reprovar na re-validação, **aprofundar a cor** (não relaxar o
teste) e registrar o hex final neste plano.

### A6. Validar
```
pnpm --filter @mallevo/lib test
pnpm --filter @mallevo/lib typecheck
```

---

## FASE B — Fonte Manrope no mobile (`apps/mobile-consumer`)

### B1. `package.json`
Adicionar dependência (mesma faixa das irmãs):
```
"@expo-google-fonts/manrope": "^0.4.1",
```
`pnpm install` na raiz. Conferir em `node_modules/.pnpm/@expo-google-fonts+manrope*/…/index.js`
que `Manrope_400Regular`, `Manrope_500Medium`, `Manrope_600SemiBold` e `Manrope_700Bold`
existem com esses nomes.

### B2. `lib/store-fonts.ts`
- Cabeçalho "Fontes dos 19 arquétipos" → 20.
- Importar os 4 pesos e registrar:
```ts
Manrope: {
  400: Manrope_400Regular,
  500: Manrope_500Medium,
  600: Manrope_600SemiBold,
  700: Manrope_700Bold,
},
```
- Sem fonte DNA local nesta vitrine (primeira sem — registrar isso no comentário só
  se natural; não forçar).

### B3. Web: nada
Storefront web carrega Manrope via `googleFontsHref` automaticamente.

---

## FASE C — Vitrine `LojaPassarela.tsx` + `passarela-ui.tsx` (o grosso do trabalho)

Contrato idêntico às irmãs (props `{ loja, secoes, aoAbrirProduto, espacoFinal }` com
`ProdutoVitrine` genérico — copiar interfaces de `LojaForno.tsx`), MAIS os campos de
loja que a adição rápida exige:

```ts
loja: {
  id: string            // ← novos nesta vitrine: o quick-add adiciona ao
  taxa_entrega: number  //   carrinho SEM passar pelo PDP
  nome: string
  descricao?: string | null
  banner_url?: string | null
  tempo_entrega?: number | null
  horarios?: Record<string, { abre: string; fecha: string }> | null
}
```
(`[slug].tsx` passa o objeto completo — declarar o subset é só tipagem local.)

Usar `useStoreDesign()`, `fontStyle`, `useTransicaoSaida` (saída radial em
`colors.ink` — o mundo mono fecha em preto), reduce-motion, virada de status bar por
`alturaHero` (o hero é foto escura → `light`; o resto branco → `dark`), padrão
forno/horta.

### C1. `passarela-ui.tsx` — vocabulário gráfico compartilhado

1. `comAlfa(hex, alpha)` — copiar da forno-ui.
2. `BotaoPassarela({ icone, contador, aoTocar })` — botão circular `colors.surface`
   com fio `comAlfa(ink, 0.14)` + sombra soft, badge do contador em `colors.ink`
   (o accent É preto — o badge fica tinta) — copiar `BotaoForno` trocando a cor do
   badge para `colors.ink`/`colors.bg`.
3. `MonogramaCoroado({ inicial, tamanho, cor })` — o único ornamento: coroa de três
   pontas em TRAÇO fino (`Svg` `Path` com stroke, sem fill — diferente da coroa
   chapada do forno) sobre a inicial da loja em Manrope 700. Usos: fecho e PDP.
4. `ChipEstoque({ texto })` — o pill laranja: fundo `LARANJA_ESTOQUE` fixo, texto
   BRANCO `#FFFFFF` fixo 11px Manrope 700 caps, raio 999, `paddingHorizontal` 10.
   Posição: absoluto no canto superior-esquerdo do card (como a referência).
5. `PillRapida({ rotulo, icone, estado, aoTocar })` — o QUICK ADD: pill BRANCO
   (`#FFFFFF` fixo — ele flutua sobre foto, não sobre a página) com texto/ícone
   `#111111` fixo, caps 12px espaçadas, sombra soft; `estado === 'adicionado'` →
   fundo `colors.ink` e texto `colors.bg` "NA SACOLA ✓" (o flash);
   `estado === 'checando'` → opacidade 0.6, sem toque. Ícone: `ConsumerIcon`
   name="bag".

**Constante DNA no `passarela-ui.tsx`:** `export const LARANJA_ESTOQUE = '#C2410C'`
(única cor; o teste da lib espelha o hex).

### C2. Adição rápida — a arquitetura (o coração da vitrine)

A compra acontece NA GRADE. `LojaPassarela` é dono de toda a lógica; os cards só
recebem callback + estado:

```ts
// Estado no LojaPassarela:
const [confirmados, setConfirmados] = useState<Set<string>>(new Set()) // flash por produto
const [checando, setChecando] = useState<string | null>(null)
const [pedidoTroca, setPedidoTroca] = useState<T | null>(null) // guarda de troca de loja
const temOpcoesCache = useRef(new Map<string, boolean>())

async function adicaoRapida(p: T) {
  // 1. opções/modificadores: consulta 1x por produto (cache no ref) —
  //    Promise.all em product_option_groups + product_modifier_groups,
  //    mesmo par de queries do ProdutoForno. Erro de rede → tratar como
  //    "tem opções" e abrir o PDP (nunca adicionar às cegas).
  // 2. tem opções → aoAbrirProduto(p): tamanho/cor se escolhe no PDP
  //    (roupa TEM tamanho — quick-add às cegas venderia terno sem numeração).
  // 3. carrinho de OUTRA loja → setPedidoTroca(p) (diálogo único da vitrine,
  //    mesmo copy/estrutura do ProdutoForno; "Trocar" → limparCarrinho() +
  //    adicionar).
  // 4. senão → adicionarItem(...) (useCartStore, assinatura idêntica ao
  //    adicionarDireto do ProdutoForno) + p.id entra em `confirmados` por
  //    1200ms (setTimeout; limpar timeouts no unmount).
}
```

O diálogo de troca renderiza UMA vez no fim do `LojaPassarela` (véu
`comAlfa(colors.ink, 0.5)`, cartão `surface`, botões `Botao` — copiar do
ProdutoForno). O PDP continua com a própria guarda (fluxo dele é independente).

### C3. Seções do `LojaPassarela`, na ordem

1. **HeroPassarela** — foto full-bleed (`banner_url ?? primeira foto`), altura
   ~88% da tela, `Image cover`:
   - véu inferior para o texto: `View` absoluta na metade de baixo com
     `comAlfa('#000000', 0.38)` (SEM gradiente — expo-linear-gradient não é
     dependência e não entra);
   - eyebrow: nome da categoria-canon da loja ou "MODA" fixo, branco caps 12px
     espaçadas Manrope 600;
   - manchete: 1ª oração da `descricao` via `repartirDescricao` (COPIAR o helper e
     o racional do LojaForno pós-`58aafae` — manifesto no hero, resto no bloco
     "sobre"; sem descrição → o nome da loja), branco Manrope 600 ~30px, central;
   - pill BRANCO "VER PEÇAS" (texto `#111111`) → scroll-to grade (padrão
     `onLayout` + `scrollTo`);
   - sem foto nenhuma: hero degrada para bloco `colors.ink` com monograma + nome
     (nunca tela branca vazia).
2. **DestaquesPassarela** — a coluna única da tela 2:
   - seção eleita por `/destaque|novidade|lançament|new|essencial/i`; fallback:
     primeiros produtos com foto. **REGRA do commit `58aafae`: a seção eleita SÓ
     sai da grade geral se a coluna mostrar TODOS os seus itens** — a coluna leva
     no máximo 3;
   - card full-width (raio 24, fundo `surfaceAlt`, altura ~1.15× largura), foto
     `cover` com os mesmos raios; `ChipEstoque` quando houver escassez (§C5);
     `PillRapida` centrado na base da foto → `adicaoRapida(p)`;
   - linha nome/preço DIRETO no bg: nome Manrope 600 16px `ink` à esquerda,
     preço Manrope 600 16px `ink` à direita (promo: preço antigo riscado
     `inkMuted` 13px ao lado);
   - toque no CARD (fora do pill) → `aoAbrirProduto(p)`.
3. **GradePassarela** — o "New Arrival" da tela 3, repetido por seção restante:
   - título da seção em Manrope **400** GIGANTE (`~34 × typeFactor`), `ink`,
     central, muito respiro (o §0.7);
   - grade de 2 colunas (gap 12): mesmo card em menor (raio 20, altura ~1.3×
     largura da coluna), `PillRapida` compacta, chip quando houver, linha
     nome/preço embaixo (nome até 2 linhas à esquerda, preço à direita);
   - toque no card → `aoAbrirProduto(p)`.
4. **SobrePassarela** — só se `repartirDescricao` devolver `detalhe`: bloco
   central estreito com o texto em Manrope 400 `inkMuted`, hairlines em cima e
   embaixo. Sem foto, sem ornamento — o silêncio do design.
5. **FechoPassarela** — branco com hairline superior: `MonogramaCoroado` (inicial
   da loja), nome em caps espaçadas Manrope 700 14px, linha
   `ABERTO · N MIN · HH:MM` em `inkMuted` (relógio vivo de 30s + horário de hoje
   via `DIAS`/`horarios`, copiar do FechoForno).

**Chrome:** `BotaoPassarela` voltar (esquerda) e sacola com contador (direita),
fixos; sacola `totalItens > 0 && router.push('/checkout')`; voltar via
`sairPara(() => router.back())` com `cor: colors.ink`. **Sem FAB.**

**Sem animação contínua** — nenhum marquee/parallax na referência; só o flash do
pill e a transição de saída.

### C4. Galeria/pager — regra herdada
Qualquer `ScrollView` horizontal `pagingEnabled` dentro de container com
`alignItems: 'center'` DEVE receber `style={{ width: <largura da página> }}`
(bug corrigido no PDP do forno — não repetir).

### C5. Escassez — de onde vem o número
`metadata.estoque` (number) no produto: `estoque <= 40` → chip
`SÓ ${estoque} NA LOJA`; sem `estoque` e com promo → chip `OFERTA` (mesmo laranja).
Ler via cast como `recorteDe` nas irmãs. O §G1 injeta o campo no mock.

---

## FASE D — PDP `ProdutoPassarela.tsx`

**Copiar os ossos de `ProdutoForno.tsx`** (Modal, galeria via `metadata.galeria`
com largura explícita §C4, checagem de opções → `ModalProduto`, guarda de troca,
CTA que pisca, `useCartStore`). Palco e pele:

- fundo `colors.bg`; chrome `BotaoPassarela` (fechar + sacola);
- **palco**: cartão `surfaceAlt` raio 24 (altura ~1.2× largura), foto `cover` nos
  mesmos raios, pager com dots `ink`; `ChipEstoque` no canto superior-esquerdo
  (mesmo critério §C5);
- ficha DIRETO no bg: linha nome/preço — nome Manrope 700 ~24px `ink` à esquerda
  (2 linhas), preço Manrope 700 ~20px `ink` à direita (promo riscado `inkMuted`
  ao lado); abaixo, rótulo da loja em caps espaçadas `inkMuted` 11px e a
  `descricao` em Manrope 400 `inkMuted`;
- `MonogramaCoroado` pequeno discreto entre a ficha e o fim (o selo da casa);
- CTA fixo inferior: pill PRETO (`colors.accent`) full-width raio 999,
  "ADICIONAR À SACOLA · R$ X" em `accentInk` caps → confirmado vira pill BRANCO
  com FIO `ink` e texto `ink` "NA SACOLA ✓" (a inversão mono; nada de cor);
- diálogo de troca: mesmo copy das irmãs.

---

## FASE E — Roteamento em `app/loja/[slug].tsx`

1. Imports de `LojaPassarela`/`ProdutoPassarela`.
2. ```ts
   // Passarela: moda monocromática (branco, fotografia P&B, quick-add na grade).
   const vitrinePassarela =
     design.arquetipo === 'mono' && loja?.categoria_slug === 'vestuario-calcados'
   ```
3. `vitrinePassarela` entra no `if` grande e nas duas cadeias (antes do fallback
   `LojaEditorial`/`ProdutoEditorial`), ramo genérico.

**Atenção à colisão de gate:** o editorial também veste `vestuario-calcados`, mas o
gate é por ARQUÉTIPO — `mono` e `editorial` nunca disputam a mesma loja. Nada a
fazer além do ramo novo.

---

## FASE F — Backend/validação de onboarding

### F1. Web: nada (enumeração dinâmica; Manrope entra pelo `googleFontsHref`).
### F2. `supabase/functions/onboard-tenant/index.ts`
`PRESETS_VALIDOS` (~linha 38): adicionar `'mono'` → 20 códigos; comentário "Os 19
arquétipos atuais" → 20.

---

## FASE G — Lojas-demo "Monarca" e "Selene" (`apps/mobile-consumer/lib/mock/`)

### G1. `dataset.ts` — campo `estoque` no tuple (mudança OPCIONAL e aditiva)
- Tipo `ItemCatalogo`: adicionar 7º elemento opcional `estoque?: number` (após
  `exigeReceita`), e no materializador (~linha 1110) incluir
  `...(estoque != null ? { estoque } : {})` no `metadata`. Nenhum produto
  existente muda (campo ausente → metadata igual ao de hoje).

### G2. As duas lojas, no Piso 1 `moda-beleza` (após as lojas de moda existentes)

**Monarca** (masculina — preset default):
```ts
{
  nome: 'Monarca',
  slug: 'monarca',
  descricao: 'O essencial masculino em preto e branco — alfaiataria limpa, caimento exato e nada supérfluo.',
  taxa: 990,
  tempo: 60,
  categoriaSlug: 'moda',
  // Loja-demo da vitrine passarela (Homelander): página branca, fotografia
  // P&B, quick-add na grade e o chip laranja de escassez como única cor.
  preset: 'mono',
  logo: LOGO_MONARCA,
  banner: <foto P&B de alfaiataria masculina, ver regra abaixo>,
  catalogo: [
    ['Essenciais', [ ~3 itens de alfaiataria (terno, blazer, camisa) — 1 com estoque baixo (ex.: 12) ]],
    ['Alfaiataria', [ ~4 itens ]],
    ['Básicos', [ ~4 itens (camiseta, calça, tricô) — 1 com estoque baixo ]],
  ],
},
```

**Selene** (feminina — paleta `porcelana`):
```ts
{
  nome: 'Selene',
  slug: 'selene',
  descricao: 'Peças femininas que não gritam — linhas puras, tons neutros e movimento.',
  taxa: 990,
  tempo: 60,
  categoriaSlug: 'moda',
  // A mesma vitrine passarela na pele 'porcelana' — a tese das paletas: a
  // temperatura muda, a gramática mono fica.
  preset: 'mono',
  palette: 'porcelana',
  logo: LOGO_SELENE,
  banner: <foto P&B de moda feminina>,
  catalogo: [
    ['Novidades', [ ~3 itens — 1 com estoque baixo ]],
    ['Conjuntos & vestidos', [ ~4 itens ]],
    ['Básicos', [ ~3 itens ]],
  ],
},
```

**Regra das fotos (obrigatória, igual garden/slice):** priorizar fotos Unsplash de
moda JÁ em preto e branco ou de paleta neutra (a identidade do arquétipo).
Validar CADA URL com `curl -sI` (200) E conferir visualmente (baixar thumb e Read)
— no slice, um ID sugerido em plano respondia 404 e vários não serviam ao formato.
Candidatos a testar primeiro (moda neutra/monocromática, acervo comum):
`photo-1507003211169-0a1dd7228f2d`, `photo-1488161628813-04466f872be2`,
`photo-1496747611176-843222e1e57c`, `photo-1539109136881-3be0616acf4b`,
`photo-1487222477894-8943e31ef7b2`, `photo-1515886657613-9f3515b0c78f`,
`photo-1434389677669-e08b4cac3105`, `photo-1509631179647-0177331693ae`,
`photo-1490481651871-ab68de25d43d`, `photo-1517841905240-472988babdf9`.
Nenhuma foto quebrada e nenhuma foto colorida-viva na demo.

### G3. `logos.ts` — `LOGO_MONARCA` e `LOGO_SELENE`
PNG 512×512 transparente, data URI, gerados pelo script procedural do scratchpad
(padrão LOGO_BROTO/LOGO_FORNO_REAL — Node puro, zlib + CRC, supersampling; validar
visualmente com Read no PNG):
- **Monarca**: coroa de três pontas CHEIA, grande e sozinha (o monograma coroado
  da referência sem a letra — formas procedurais não desenham serifa), em
  `#111111`.
- **Selene**: lua crescente (círculo cheio menos círculo deslocado), em `#201417`.

---

## FASE H — Documentação

### H1. `docs/store-theme/02-arquetipos-de-design.md`
- Cabeçalho: derivados de referência 14 → **15**; total **19 → 20**; título §2.2
  "Os 19" → "Os 20"; "### Derivados de referência (14)" → (15).
- Nova entrada `#### A8. Mono — \`mono\`` após a Slice, no formato das irmãs:
  nichos, DNA (§0), mood, ref (Homelander), paletas (branco default, Areia,
  Porcelana — "trocam temperatura, nunca adicionam cor"), "**Por que não é o
  Editorial/Raw/Serene/Noir**" (argumentos do §0), nota "2026-08: 20º arquétipo,
  15º derivado de referência, com **vitrine própria** — ver [05 §5.6]".
- §2.3: linha `vestuario-calcados` ganha `mono` nas alternativas.
- §2.5: "antes de cogitar um 20º" → 21º.
- §2.6: linha "**Moda monocromática** → Mono: Homelander."

### H2. `docs/store-theme/05-aplicacao-storefront-consumer.md` §5.6
- Título e parágrafo introdutório: incluir **passarela**.
- Gates: `mono` + categoria `vestuario-calcados`.
- Parágrafo "**Vitrine passarela** (referência Homelander, [02 §A8])" no formato
  das irmãs, descrevendo: hero P&B com véu e pill branco, coluna de destaques,
  grades de 2 com QUICK ADD (a compra acontece na grade; opções → PDP; guarda de
  troca na própria vitrine), chip laranja único (`LARANJA_ESTOQUE`, AA travado em
  `__tests__`), linha nome/preço direto na página, títulos em 400 gigante,
  monograma coroado no fecho, e a regra da seção eleita (só sai da grade quando a
  coluna mostra todos — herdada do fix `58aafae`). Citar `LojaPassarela.tsx` +
  `ProdutoPassarela.tsx` + `passarela-ui.tsx` e a ausência de fonte DNA local.

### H3. Varredura de contagens
`grep -rn "19 arquétipo\|os 19\|Os 19\|19 presets\|19 códigos"` em `docs/`,
`packages/`, `apps/`, `supabase/` (excluindo `docs/dev/plano-*`) e corrigir (já
mapeados: `types.ts`, `presets.ts`, `store-fonts.ts`, onboard-tenant, docs
00/01/02/03).

---

## FASE I — Verificação final (critérios de aceite)

1. `pnpm --filter @mallevo/lib test` e `typecheck` — verdes (incl. os 2 testes mono).
2. Typecheck dos apps: `./packages/lib/node_modules/.bin/tsc --noEmit -p
   apps/mobile-consumer/tsconfig.json` (e idem `apps/web`) — é o caminho que
   funciona neste ambiente; `pnpm --filter mobile-consumer lint` NÃO roda aqui
   (eslint ausente no workspace) — não perder tempo com isso.
3. App consumer com `EXPO_PUBLIC_USE_MOCK=true`: Piso 1 exibe "Monarca" e
   "Selene"; ambas abrem a vitrine passarela (Selene com o branco rosé da
   porcelana); QUICK ADD adiciona da grade e pisca "NA SACOLA ✓"; produto com
   opções abre o PDP; chip "SÓ N NA LOJA" aparece nos itens com estoque baixo;
   carrinho de outra loja dispara o diálogo de troca NA GRADE; PDP adiciona e
   pisca; sacola navega ao checkout; voltar dispara a saída radial preta.
4. Editor `/minha-loja` (web): "Mono" na lista; paletas Areia/Porcelana
   selecionáveis.
5. Nenhum arquivo de vitrine/preset/paleta EXISTENTE alterado além das varreduras
   de contagem, do registro Manrope, do §F2 e do campo opcional do §G1.

**Commits sugeridos** (padrão do repo, pt-BR, conventional — mensagens via
`git commit -F <arquivo>`, NUNCA here-string `@'…'@` no Bash, que já quebrou uma
mensagem nesta série):
1. `feat(store-theme): arquétipo mono (20º) — moda monocromática, ref. Homelander`
   (A, B, F2, H3 parcial)
2. `feat(consumer): vitrine passarela — quick-add na grade, chip de escassez e PDP mono` (C, D, E)
3. `feat(consumer): demos Monarca e Selene na ala de moda` (G)
4. `docs(store-theme): mono nos arquétipos e vitrine passarela no §5.6` (H)

## Riscos e escapes conhecidos
- **Exports do pacote Manrope**: conferir nomes exatos no index.js antes de mudar
  estratégia; último recurso (só se Manrope for inviável): display/body `Inter`
  (instalada) e registrar a troca em presets + docs — perde diferenciação, evitar.
- **Quick-add sem opções conferidas**: NUNCA adicionar sem a checagem de
  option/modifier groups — roupa tem tamanho; erro de rede na checagem → abrir o
  PDP, não adicionar às cegas.
- **Grayscale em runtime**: não existe sem dependência nova — NÃO adicionar
  filtro; a identidade P&B da demo vem da curadoria de fotos (§G2).
- **Fotos Unsplash**: nunca commitar ID não verificado com curl + conferência
  visual; fotos coloridas-vivas quebram a identidade — trocar.
- **Regressões já conhecidas das irmãs**: seção eleita engolindo itens, descrição
  repetida em múltiplas vozes e pager sem largura explícita — todos corrigidos no
  forno (`58aafae`); esta vitrine já nasce com as três regras aplicadas.
