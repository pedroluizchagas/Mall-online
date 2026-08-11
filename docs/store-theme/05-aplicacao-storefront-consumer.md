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

## 5.6 Layouts por arquétipo — editorial, raw, serena, artesã, noir, volt, clínica, torra, magazine, smash, ritual, horta, forno e passarela

Além da **pele** (tokens), um arquétipo pode carregar um **layout próprio** no
consumer. `StoreDesign.arquetipo` (mobile, [04 §4.4]) expõe o código do preset
exatamente para isso. Implementados: **editorial** (moda/beleza), **raw**
(streetwear), **serene** (beleza/joias delicadas), **artisan**
(casa/decoração), **noir** (fine dining), **volt** (fitness), **clinic**
(farmácia/saúde), **roast** (cafeterias), **magazine** (departamento),
**smash** (hamburgueria/fast-food), **ritual** (açaíterias/alimentação
lifestyle), **garden** (comida saudável), **slice** (pizzarias/cantinas) e
**mono** (moda monocromática).

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
  catálogo padrão até ganharem layout próprio);
- `volt` + categoria ∈ {`vestuario-calcados`, `saude-bem-estar`} (fitness);
- `clinic` + categoria ∈ {`farmacia-medicamentos`, `saude-bem-estar`,
  `veterinaria`};
- `roast` + categoria `alimentos-bebidas` (cafeterias/confeitarias);
- `smash` + categoria `alimentos-bebidas` (hamburguerias/fast-food);
- `ritual` + categoria `alimentos-bebidas` (açaíterias/alimentação lifestyle);
- `garden` + categoria ∈ {`alimentos-bebidas`, `saude-bem-estar`}
  (`CATEGORIAS_VITRINE_HORTA` — comida saudável);
- `slice` + categoria `alimentos-bebidas` (pizzarias/cantinas);
- `mono` + categoria `vestuario-calcados` (moda monocromática — o editorial
  veste a mesma categoria, mas o gate é por ARQUÉTIPO: os dois nunca disputam
  a mesma loja);
- `magazine` + categoria `outros` (lojas de departamento).

**Vitrine magazine** (referência Revive, [02 §A3]): varejo clássico —
faixa-anúncio no topo, header claro com WORDMARK EM SERIFA, hero com CAIXA
EMOLDURADA translúcida centrada (eyebrow + título serif caps + parágrafo +
pill escura "Ver ofertas ›"), "Compre por categoria" em TILES de foto cheia
que rolam até a seção, grids com chip NOVO, coração, CHIP VERDE de oferta e
"Adicionar" em pill contornada no próprio cartão (adição rápida; carrinho de
outra loja abre o detalhe), "Ver tudo ›" em pill escura. PDP varejista:
galeria contida, título serif, linhas Entrega/Vendido/Troca e barra de
compra fixa. Componentes: `components/loja/LojaMagazine.tsx` +
`ProdutoMagazine.tsx`.

**Vitrine smash** (referência Stack N Snack, [02 §A4]): hamburgueria — hero
bordô com pill de entrega de contorno laranja, MANCHETE DE APETITE em caps
pesadíssimas ("DEU FOME? / PEDE. CHEGOU."), CTAs em pill (sólida laranja +
fantasma creme que rolam até cardápio/ofertas) e MOLDURAS COLORIDAS
(laranja/rosa/céu) emoldurando fotos dos destaques; FOLHA CREME do cardápio
com chips de categoria (ativa em OURO) e itens em PAGER de um cartão por vez
— palco de foto (`metadata.recorte` → cutout "solto" em `contain`), nome em
caps bordô, preço laranja e CTA "PEDIR AGORA" em pílula bordô — com dots;
FAIXA MARQUEE dourada rolando as categorias (estática com "reduzir
movimento"); bloco de ofertas com banner "CHUVA DE OFERTAS" (fotos espiando
pelas bordas em molduras creme) e cards de combo LARANJA com selo
"ECONOMIZE R$X" em ouro, itens em bullets (descrição "item + item + item" é
quebrada no `+`), preço grande e CTA "PEGAR OFERTA"; header e barra de menu
em PÍLULA FLUTUANTE bordô (a pílula do header só aparece ao rolar sobre o
creme). Componentes: `components/loja/LojaSmash.tsx` + `ProdutoSmash.tsx`
(folha creme, palco branco de galeria, CTA bordô que pisca OURO "NA SACOLA ✓"
ao confirmar).

**Vitrine ritual** (referência OCHA, [02 §A5]): açaíteria lifestyle — a página
inteira é ROSA e cada seção é um cartão de canto bem redondo FLUTUANDO nela (o
gutter rosa fica visível ao redor de tudo); o chrome se resume a um PILL
FLUTUANTE centrado no topo (voltar · "• Aberto para pedidos" · disco rosa da
sacola) que não sai da tela o scroll inteiro — **sem barra de menu inferior**
nesta vitrine, a saída da loja é só o chevron. Hero é cartão-foto de altura
quase cheia com o WORDMARK GROOVY (Shrikhand, DNA do layout e não token) em
rosa gigante sobre a imagem, statement da casa em caps condensadas creme e, na
base, uma fileira de MINIATURAS que troca a foto do hero por crossfade (só no
toque — sem autoplay) acima da linha "ABERTO · N MIN · HH:MM" com RELÓGIO VIVO;
o manifesto vem logo abaixo sem cartão nenhum, direto no rosa nu em caps no
accent. ESPECIAIS é o cartão-assinatura: a palavra "ESPECIAIS" GIGANTE fica
FIXA no cartão accent, sangrando pelas bordas, e os produtos passam POR CIMA
dela em pager (`metadata.recorte` → cutout "solto" em `contain`), enquanto os
nomes dos itens VIZINHOS aparecem ROTACIONADOS (±20°) e cortados nos cantos
inferiores, deslizando junto com o scroll — é esse o affordance do carrossel,
no lugar dos dots. O cardápio é um cartão CREME por seção, puramente
tipográfico (nome em caps + preço em rosa, respiro generoso, sem foto nem
descrição), e o fecho repete a foto da casa com a wordmark em miniatura. A
palavra gigante e o wordmark usam `bg` sobre `accent`, então as paletas
`matcha`/`pitaya` repintam tudo sem código novo. Componentes:
`components/loja/LojaRitual.tsx` + `ProdutoRitual.tsx` (PDP com o NOME DO
PRODUTO gigante fixo ATRÁS da galeria — eco direto do especiais — ficha sobre
o rosa e barra de compra em pill roxa que pisca "NA SACOLA ✓" ao confirmar).

**Vitrine horta** (referência Sonder & Sprout, [02 §A6]): comida saudável — a
página é CREME e as seções são FULL-BLEED empilhadas, o oposto dos cartões
flutuantes da ritual. O chrome se resume a DOIS BOTÕES-ADESIVO circulares
creme (voltar e sacola com contador), fixos, com fio e sombra para lerem tanto
sobre o verde quanto sobre o creme — **sem barra de menu inferior e sem FAB**.
Hero verde-floresta com o WORDMARK GIGANTE em caps gordas ROSA quebrado em
duas linhas e um SELO RECORTADO (escalopado, SVG polar `r = R(0,9 + 0,1·cos
12θ)`) carimbado ENTRE elas carregando o "&" do nome — sem conector no nome, o
selo leva a inicial; blobs tom-sobre-tom no fundo, rabisco de arco a mão livre
e uma FOTO-ADESIVO (moldura branca de cantos assimétricos, girada −2,5°) que
se pendura na virada do verde para o creme. Faixa MARQUEE verde com o
manifesto separado por ✦ (estática com "reduzir movimento"). FAVORITOS é o
carrossel-assinatura: cartões PASTEL alternados (rosa/caramelo) com a foto
escapando por cima da borda (`metadata.recorte` → cutout `contain`) e selo
verde girado no canto (OFERTA/DA CASA), com a ficha escrita DIRETO no creme
— rótulo tan em caps, nome em serifa macia, linha de ingredientes e preço. O
bloco SOBRE traz o texto da casa, a assinatura MANUSCRITA e uma pill rosa que
rola até o cardápio (que é uma lista serifada sóbria, thumb + nome + linha de
ingredientes + preço). VISITE é faixa CARAMELO com o horário de HOJE derivado
de `stores.horarios`, tempo e taxa, pill rosa e outra foto-adesivo; o fecho é
faixa verde com selo, nome e o relógio vivo "ABERTO · N MIN · HH:MM". Texto
sobre pastel usa uma tinta verde FIXA (as paletas trocam a tinta do tema e a
levariam abaixo de AA). Componentes: `components/loja/LojaHorta.tsx` +
`ProdutoHorta.tsx` (palco pastel escolhido de forma estável pelo id, selo no
canto e CTA rosa que vira verde "NA SACOLA ✓"), com o vocabulário gráfico
compartilhado em `components/loja/horta-ui.tsx` (selo, rabisco, foto-adesivo,
botão-adesivo). A Baloo 2 do wordmark e a Caveat da assinatura são DNA do
layout, não token — carregadas localmente, como o Shrikhand da ritual.

**Vitrine forno** (referência Restaurin / "Pizza Lounge", [02 §A7]): pizzarias
e cantinas — a página creme é FATIADA em blocos chapados full-bleed que trocam
de cor por seção, e a tipografia troca de cor junto. O chrome se resume a DOIS
BOTÕES circulares creme (voltar e sacola com contador), fixos, com fio e sombra
para lerem sobre os três palcos por onde passam — **sem barra de menu inferior
e sem FAB**. Hero em PRETO DE FORNO (veios de mármore em branco a 3% de alfa)
com a COROA em ouro isolada acima do WORDMARK empilhado em Archivo Black ouro,
o CTA em retângulo vermelho "VER CARDÁPIO ⌄" que rola até a lista, e o DISCO
GIGANTE de pizza (`banner_url`, recorte redondo puro) que desce por cima do
bloco seguinte — o overlap da referência. O hero **não** imprime a descrição da
casa: a referência é wordmark, botão e pizza, e o texto tem duas outras vozes
adiante. O CARDÁPIO-PÔSTER é a seção-assinatura: bloco OURO full-bleed com um
item por vez (disco de 72% da largura + nome em caps VERMELHAS gigantes +
preço), elegendo a seção pelo regex `/pizza|favorit|destaque|especia|da casa/`.
Diferente da ritual e da horta, a seção eleita só SAI do cardápio quando o
cartaz mostra todos os seus itens: aqui o regex casa com a seção principal de
qualquer pizzaria ("Pizzas"), e como o cartaz leva no máximo 4 discos, removê-la
esconderia os demais sabores do app inteiro — repetir 4 itens é barato, perder
produto não. Depois vêm o STATEMENT (a 1ª oração da descrição em caps vermelhas
gigantes, ou a frase de DNA quando ela é curta/longa demais), o ALVO (cartão vermelho
com anéis concêntricos atrás da pizza e o nome da casa em ouro atravessando e
sendo CORTADO pelas bordas do cartão) e o cartão da CASA (badges circulares com
coroa e fatia, e line-art fantasma de garfo/raminho a 9% de alfa). A descrição
é REPARTIDA entre essas duas vozes — a 1ª oração vira o statement e o resto vai
para o cartão da casa —, para o mesmo texto não aparecer duas vezes na mesma
rolagem; casa sem "resto" simplesmente não ganha o cartão. O
cardápio é uma lista sóbria na mesma voz (thumb redondo, nome, descrição,
preço) e o fecho é bloco preto com coroa, nome em ouro e o relógio vivo "HOJE
HH:MM–HH:MM · N MIN · HH:MM". **Zero animação contínua** — a referência não tem
marquee, então só a transição de saída (radial no PRETO) se move. Texto sobre o
preto e sobre o ouro usa creme/preto FIXOS (as paletas trocam a tinta do tema);
o vermelho sobre o ouro só carrega DISPLAY grande, régua AA large travada em
`__tests__`. Componentes: `components/loja/LojaForno.tsx` + `ProdutoForno.tsx`
(palco de anéis concêntricos com a pizza no centro, badge coroado girado e CTA
vermelho que vira PRETO com "NA SACOLA ✓" em ouro), com o vocabulário gráfico
compartilhado em `components/loja/forno-ui.tsx` (coroa, fatia, pizza redonda,
anéis, line-art, botão). A Archivo Black 900 é DNA do layout, não token —
carregada localmente, como o Shrikhand da ritual; o resto da vitrine fala a
Archivo do tema, que aqui serve display E corpo.

**Vitrine passarela** (referência Homelander, [02 §A8]): moda monocromática —
a única vitrine em que **a compra acontece na grade**. Cada card tem uma PILL
CLARA de adição flutuando sobre a foto: tocar nela põe a peça na sacola sem
abrir o produto; tocar na foto abre o produto (a pill é IRMÃ da foto no palco,
não filha, para os dois gestos nunca se confundirem). Antes de adicionar, a
vitrine consulta `product_option_groups`/`product_modifier_groups` — peça com
variação NUNCA entra às cegas (roupa tem tamanho), ela abre o PDP; falha de
rede também abre o PDP, nunca vende no escuro. A consulta é cacheada por peça
num `useRef`, e a guarda de troca de loja mora AQUI (e não só no PDP), porque
é aqui que a compra nasce. Hero de foto full-bleed sob o `GRADIENTE_HERO` da
casa (o mesmo PNG de duas bandas dos outros heros full-bleed — denso no topo
para o relógio do sistema, denso na base para o texto), com eyebrow, manchete
e pill branca "VER PEÇAS"; loja sem foto degrada para bloco de tinta com o
monograma. O gradiente não é luxo aqui: a moda desta vitrine é fotografada em
fundo BRANCO de estúdio, e um véu chapado leve deixaria o título abaixo de AA. Depois vêm
a COLUNA de destaques (até 3 cards quase full-width) e as GRADES DE 2, cada
uma com o título em peso **400 gigante** — subir para bold aqui mata o
arquétipo. A ficha é a linha NOME à esquerda / PREÇO à direita escrita direto
na página. O CHIP LARANJA (`LARANJA_ESTOQUE`, a única cor do arquétipo, AA
travado em `__tests__`) acende com `metadata.estoque ≤ 40` ou, sem estoque
informado, com promoção. A seção eleita para a coluna só sai das grades quando
a coluna mostra todos os seus itens — a mesma regra que a vitrine forno
aprendeu do jeito difícil. Fecho com monograma coroado, nome em caps espaçadas
e o relógio vivo; saída radial na TINTA. **Zero animação contínua.** A
estética P&B vem da FOTOGRAFIA: o RN não aplica grayscale sem dependência
nova, então as lojas-demo dessaturam na origem (`fotoPB` → `sat=-100` no CDN
da Unsplash) e a foto do lojista entra como ele a enviou. Componentes:
`components/loja/LojaPassarela.tsx` + `ProdutoPassarela.tsx` (mesmo palco
cinza, ficha nome/preço e CTA que INVERTE para claro com fio ao confirmar —
no mono não há cor para onde ir), com o vocabulário gráfico em
`components/loja/passarela-ui.tsx` (botão, monograma coroado, chip, pill de
adição). Primeira vitrine **sem fonte-DNA local**: a voz é o peso da Manrope
do tema, não uma família extra.

**Vitrine torra** (referência Kafoska, [02 §A2]): pôster retrô — a palavra da
casa repetida em degradê âmbar com o produto flutuando por cima, trocando
por CROSSFADE morno (700ms/4,5s). O efeito verdadeiro do pôster usa
`products.metadata.recorte` (PNG de fundo TRANSPARENTE enviado pelo lojista
→ renderizado `contain`, sem máscara); sem recorte, a foto ganha MÁSCARA DE
CÁPSULA (arco vertical) que lê como objeto. "MENU" em LETRAS EMPILHADAS de
pé acompanhando a coluna; cardápio em CARTÕES ÂMBAR com a marca d'água do
título repetida ao fundo, itens em caps escuras e preço forte. Componentes:
`components/loja/LojaTorra.tsx` + `ProdutoTorra.tsx` (painel verde-floresta
com pill âmbar).

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
accent); "O que fazemos" em BANDAS DE FOTO empilhadas de borda a borda
(título claro sobre a imagem escurecida, linha de apoio e seta circulada
que abre a peça — uma banda por tipo, derivada do catálogo); peças autorais
em carrossel de UM cartão RETRATO (1,5×) com setas finas e contador
"01 / 06"; grids com chip-etiqueta branco do tipo da peça. PDP com FICHA
TÉCNICA (`metadata.especificacoes`: pares rótulo/valor —
Dimensões/Material/Acabamento — separados por fios; sem specs cai na
descrição) e CTA pill sólida com seta. Componentes:
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

**Vitrine volt** (referência Nivest, [02 §D3]): fitness — FAIXA-ANÚNCIO fixa
no topo (oferta agregada) + header branco com wordmark pesado + TICKER
MARQUEE no accent rolando benefícios em loop contínuo (Animated.loop com
cópias duplicadas; estático com "reduzir movimento"); hero de caps
pesadíssimas com CTA em PILL BRANCA e o carrossel mais RÁPIDO do sistema
(glide 300ms, dwell 3,8s); grid 2-col no palco cinza com chip "Popular"
preto / "-N%" vermelho, coração em círculo, preço promocional em vermelho e
links "↳ Ver tudo". PDP com pill preta de largura cheia que pisca no accent
ao confirmar. Componentes: `components/loja/LojaVolt.tsx` + `ProdutoVolt.tsx`.

**Vitrine clínica** ([02 §G]): função com o padrão visual das irmãs — hero
de FOTOS com carrossel calmo (glide 550ms/5s), saudação "Como podemos cuidar
de você hoje?" na campanha, CTA fantasma e indicadores de linha; BUSCA
FLUTUANTE sobreposta à borda do hero, filtrando em tempo real
(nome/princípio ativo, resultados em grade); faixa de confiança elevada
(discos verde-suave), cartão de oferta com a FOTO do item em promoção;
categorias como ABAS escritas no topo e produtos em CARTÕES QUADRADOS
roláveis na horizontal com o cartão "VER TODOS (N)" no fim do trilho →
expande em grade ("Ver menos" recolhe). ADIÇÃO RÁPIDA no próprio cartão
("+" com pouso elástico) — item com `metadata.exige_receita` ganha selo
"RECEITA" e abre o detalhe em vez de adicionar às cegas (mesmo contrato do
ModalProduto). PDP informacional: foto em palco contido, aviso de receita,
linhas de entrega/procedência e barra de compra fixa. Componentes:
`components/loja/LojaClinica.tsx` + `ProdutoClinico.tsx`.

**Demo**: no mock do consumer, `vitrine-fashion` materializa o editorial
(catálogo feminino, banner e logo monograma "V" didone), `urban-wear` o raw
(preset+paleta fixos via LojaSpec, catálogo streetwear e logo estêncil "UW"),
`bella-cosmeticos` o serene (catálogo de skincare/maquiagem e logo
pérola-no-anel), `casa-conforto` o artisan (peças autorais com ficha técnica
e logo arco/portal), `cantina-bella-italia` o noir (cardápio italiano
refinado e logo taça dourada), `arena-fit` o volt (performance + suplementos
e logo raio), `farmacia-saude-mais` o clinic (medicamentos com selo de
receita e logo cruz), `cafe-aroma` o roast (pôster verde+âmbar, logo xícara)
`acai-da-praca` o roast na paleta Açaí (pôster roxo+orquídea, logo tigela —
MESMA vitrine, outra pele: a tese das paletas), `burger-house` o smash
(smash burgers, combos com bullets e logo glifo de hambúrguer), `roxa-acai`
o ritual (tigelas e batidos em rosa chiclete + roxo-açaí, logo tigela em
glifo geométrico chapado) e `lojao-central` o magazine (do carrinho de bebê
à furadeira, logo etiqueta de preço) — `lib/mock/logos.ts`. As duas
açaíterias convivem **de propósito**: `acai-da-praca` continua sendo a demo
da tese das paletas do roast (mesma vitrine-pôster, pele Açaí) e `roxa-acai`
mostra o mesmo nicho vestindo OUTRO arquétipo — nicho sugere a pele, não a
determina. Da auditoria de tom (2026-08), também têm conteúdo
real dentro de vitrines: `passo-certo-calcados` (raw sinal),
`sushi-yamato` (noir prata), `adega-premium` (noir rubi), `jardim-flor`
(artesã, categoria floricultura) e `otica-visao-clara` (editorial).

Próximos candidatos a layout próprio: `noir` (joias/luxo — mesma gramática em
fundo preto) e `heritage` (alimentação premium).
