# 05 — Aplicação no storefront e no consumer

> Onde cada token é consumido. O objetivo: a **tela inteira** da loja veste o tema, não só o modal de produto. Lembrando o modelo híbrido ([01](01-conceito-e-relacao-templates.md)): a **estrutura** vem do nicho (`DashboardTemplate`), a **pele** vem do StoreTheme.

## 5.1 Inventário de componentes a "tematizar"

### Storefront (`apps/storefront/components/`)
| Componente | Hoje | Com StoreTheme |
|---|---|---|
| Layout raiz | tokens fixos | injeta CSS vars do tema ([04 §4.3]) |
| `StoreHeader` | banner/logo + nome em accent fixo | usa `accent`/`ink`/`surface` do tema; trata mode dark |
| `ProductCard` | `text-ink`, `border-line` fixos | mesmos nomes, agora vindos do tema |
| `ProductModal` | `bg-accent`, `bg-surface` fixos | idem; estrutura interna segue `layoutPdp` |
| `MenuSection` | lista simples | tipografia/raios do tema |
| checkout/cart | genérico | herda tokens (consistência) |

### Mobile (`apps/mobile-consumer/`)
| Tela/Componente | Hoje | Com StoreTheme |
|---|---|---|
| `app/loja/[slug].tsx` | `consumerDesign.colors` fixo | `StoreThemeProvider` + `useStoreTheme()` |
| Header da loja | accent fixo | accent/ink do tema; mode-aware |
| Cards de produto | fixo | tokens do tema |
| `components/ModalProduto.tsx` | já varia `layoutPdp` | layout via nicho + pele via tema |
| `(tabs)/*` (home, explorar...) | Mallevo default | **mantém** tema Mallevo (fora de loja) |

## 5.2 Regra de fronteira: dentro vs. fora da loja

- **Fora da loja** (home/pisos, busca, perfil, carrinho global): tema **Mallevo** fixo. É o "saguão do shopping".
- **Dentro da loja** (`/loja/[slug]` e o storefront inteiro): tema **da loja**. É a "loja do shopping".
- O carrinho/checkout pode herdar um tema neutro Mallevo para não confundir o cliente no momento de pagar — decisão de UX a confirmar na implementação.

## 5.3 Estrutura por nicho (vem do DashboardTemplate, não do tema)

O `layoutPdp` já existente decide a **estrutura** do detalhe de produto; o StoreTheme só pinta:

| `layoutPdp` | Estrutura (nicho) | Exemplo de arquétipo de pele |
|---|---|---|
| `cardapio` | grupos + modificadores | Heritage |
| `variacao` | grade tamanho × cor | Editorial / Raw / Noir |
| `simples` | foto + preço + comprar | Soft Care |
| `agendamento` | calendário + slots | Soft Care |

A **listagem do catálogo** também pode variar de estrutura por nicho (lista de cardápio vs. grid de moda) — isso é derivado do nicho, e a pele (espaçamento, raios, colunas) vem do tema.

## 5.4 Checklist de "tematização" de um componente

1. Trocar import de `consumerDesign.colors.X` / hex fixo por token do tema (`useStoreTheme()` no mobile, classe Tailwind mapeada a var no web).
2. Garantir legibilidade: texto sobre `accent` usa `accentInk`; texto sobre `surface` usa `ink`/`inkMuted`.
3. Respeitar `shape.radius` e `shape.density` em vez de valores fixos.
4. Respeitar `mode` (light/dark) em ícones/sombras/imagens placeholder.
5. Sem regressão de layout quando `theme` é nulo (cai no default).

## 5.5 Acessibilidade

- Contraste mínimo AA entre `ink`/`bg` e `accentInk`/`accent`. O `resolve` valida e corrige `accentInk` (preto/branco) automaticamente quando o override do lojista falha no contraste.
- Tamanhos de fonte mínimos preservados independentemente de `scale`.
- `mode: dark` não pode reduzir contraste de status (success/warning/danger fixos).
- Movimento decorativo (autoplay, parallax, transições de ambiente) desliga quando o sistema pede "reduzir movimento" (`AccessibilityInfo.isReduceMotionEnabled`).

## 5.6 Layouts por arquétipo — vitrines editorial, raw, serena, artesã e noir

Além da **pele** (tokens), um arquétipo pode carregar um **layout próprio** no
consumer. `StoreDesign.arquetipo` (mobile, [04 §4.4]) expõe o código do preset
exatamente para isso. Implementados: **editorial** (moda/beleza), **raw**
(streetwear), **serene** (beleza/joias delicadas), **artisan**
(casa/decoração) e **noir** (fine dining).

**Gates** (em `app/loja/[slug].tsx`) — loja real que satisfaça os critérios
veste o layout automaticamente; o resto segue no catálogo padrão:
- `editorial` + categoria ∈ {`vestuario-calcados`, `beleza-cosmeticos`,
  `acessorios-joias`} (`CATEGORIAS_VITRINE_EDITORIAL`);
- `raw` + categoria `vestuario-calcados`;
- `serene` + categoria ∈ {`beleza-cosmeticos`, `acessorios-joias`,
  `saloes-estetica`} (`CATEGORIAS_VITRINE_SERENA`);
- `artisan` + categoria ∈ {`casa-decoracao`, `floricultura-plantas`}
  (`CATEGORIAS_VITRINE_ARTESA`);
- `noir` + categoria `alimentos-bebidas` (fine dining; joias noir seguem no
  catálogo padrão até ganharem layout próprio).

| Peça | Componente | DNA |
|---|---|---|
| Vitrine | `components/loja/LojaEditorial.tsx` | hero full-bleed com carrossel em autoplay (glide 560ms, parallax da foto, texto que dissolve, loop por slide-clone, pausa no toque), rail de cards 3:4 sem chrome com *peek*, seções compactas (thumb + nome + preço), barra de menu inferior própria (Início/Explorar/Pedidos/Perfil), identidade sem pills |
| PDP | `components/loja/ProdutoEditorial.tsx` | foto em tela cheia com galeria deslizável, scrim de rampa única no topo, cartão de vidro (blur) com thumb/nome caps/loja/descrição/preço e “+” escuro; produto com variações delega ao `ModalProduto` |
| Carrinho | sacola no header com contador | **sem FAB flutuante** neste layout — a sacola do topo é a única porta do carrinho |
| Entrada | `components/SplashLoja.tsx` | véu na cor do arquétipo + cartão claro com o logo do lojista |
| Saída | `components/TransicaoMallevo.tsx` + `store/useTransicaoSaida.ts` | fade radial: círculo na **cor da paleta da loja** nasce do ponto do toque, cobre a tela, dissolve no canvas Mallevo e revela o shopping. Vive no layout raiz (a tela que navega desmonta); sem marca/texto |

**Convenção de dados**: fotos extras do PDP vivem em
`products.metadata.galeria: string[]` (a primeira dá lugar ao `foto_url` no
full-bleed). Lacuna conhecida: o dashboard do lojista ainda não tem upload de
galeria — roadmap.

**Vitrine raw** (referência-âncora Rawline, [02 §B]): brutalista — hero com
carrossel em autoplay (mesmo motor do editorial com personalidade própria:
glide de 360ms com aterrissagem dura e dwell de 4s; marcadores QUADRADOS),
eyebrow em MONO de sistema e headline condensada em caps; FAIXA CTA
full-width no accent ("COMPRAR AGORA ↗"); drop em MOLDURA grossa no
accent com rail; grid 2-col de cards com borda fina, coração à esquerda, tag
de desconto e nome em mono caps; flourish de título (primeira palavra em
serif itálico + resto em caps no accent); cantos retos, sem vidro nem sombra.
Componentes: `components/loja/LojaRaw.tsx` + `ProdutoRaw.tsx` (painel opaco
com moldura no lugar do vidro). Paleta curada `brasa` (vermelhão + creme
sobre fuligem) destila a referência; a tipografia mono/serif do flourish é
DNA do layout (Platform fonts), não token.

**Vitrine serena** (referência All Natural, [02 §D2]): delicada — header
CLARO estruturado (voltar | nome | "Sacola (N)" em texto), hero com carrossel
no ritmo mais calmo do sistema (glide 650ms, dwell 6s) e indicadores de LINHA
segmentada no topo, headline em peso 400 sentence case, CTA fantasma de
contorno fino; seções viram ABAS; grid com cards no cinza-névoa
(`surfaceAlt`), coração solto, chip de promo branco/vermelho e nome+preço
FORA do card; fecho com tile da marca. PDP com cartão branco sólido e CTA
fantasma de largura cheia que se preenche ao confirmar. Componentes:
`components/loja/LojaSerena.tsx` + `ProdutoSereno.tsx`.

**Vitrine artesã** (referência-âncora Graft, [02 §F]): portfólio de ateliê —
hero com o NOME gigante em sans arredondada e CTA de contorno em pill com
seta; header que vira BARRA ESPRESSO (accent) ao rolar; SEÇÕES NUMERADAS
(fio + "0N" + rótulo); statement da loja em DOIS TONS (1ª frase ink, resto
accent); nuvem "criamos para você" com chips de foto inline no texto; peças
autorais em carrossel de UM cartão com setas finas; grids com chip-etiqueta
branco do tipo da peça. PDP com FICHA TÉCNICA (`metadata.especificacoes`:
pares rótulo/valor — Dimensões/Material/Acabamento — separados por fios; sem
specs cai na descrição) e CTA pill sólida com seta. Componentes:
`components/loja/LojaArtesa.tsx` + `ProdutoArtesao.tsx`.

**Vitrine noir gastronômica** (referência The Obscura, [02 §D]): fine dining
em preto, marfim e dourado — hero dramático (glide de 700ms, o mais lento do
sistema) com nome em serifa gigante caps e CTA de CONTORNO RETO em caps
espaçadas; wordmark dourado em itálico no header; CARDÁPIO-LIVRO (nome do
prato em serifa itálica marfim, ingredientes em serifa apagada com " · ",
preço dourado à direita, fios finos); carrossel CENTRAL de pratos (cartão do
meio em destaque, vizinhos encolhidos/apagados, setas circuladas); fecho "O
espaço" com foto da casa. Os itálicos verdadeiros do Cormorant são carregados
junto com o tema (`FONTES_ITALICO` em `lib/store-fonts.ts` +
`fontStyleItalico`). Componentes: `components/loja/LojaNoir.tsx` +
`ProdutoNoir.tsx` (painel preto com fio dourado).

**Demo**: no mock do consumer, `vitrine-fashion` materializa o editorial
(catálogo feminino, banner e logo monograma "V" didone), `urban-wear` o raw
(preset+paleta fixos via LojaSpec, catálogo streetwear e logo estêncil "UW"),
`bella-cosmeticos` o serene (catálogo de skincare/maquiagem e logo
pérola-no-anel), `casa-conforto` o artisan (peças autorais com ficha técnica
e logo arco/portal) e `cantina-bella-italia` o noir (cardápio italiano
refinado e logo taça dourada — `lib/mock/logos.ts`).

Próximos candidatos a layout próprio: `noir` (joias/luxo — mesma gramática em
fundo preto) e `heritage` (alimentação premium).
