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

## 5.6 Layouts por arquétipo — a vitrine editorial (moda/beleza)

Além da **pele** (tokens), um arquétipo pode carregar um **layout próprio** no
consumer. `StoreDesign.arquetipo` (mobile, [04 §4.4]) expõe o código do preset
exatamente para isso. Primeiro caso implementado: **editorial**.

**Gate** (em `app/loja/[slug].tsx`): arquétipo `editorial` **e** categoria ∈
{`vestuario-calcados`, `beleza-cosmeticos`, `acessorios-joias`}
(`CATEGORIAS_VITRINE_EDITORIAL`). Qualquer loja real que satisfaça os dois
critérios veste o layout automaticamente; os demais arquétipos/categorias
seguem no catálogo padrão.

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

**Demo**: no mock do consumer, `vitrine-fashion` materializa o tema completo
(catálogo feminino com fotos reais, banner editorial e logo monograma em data
URI — `lib/mock/logos.ts`).

Próximos candidatos a layout próprio: `noir` (joias/luxo — mesma gramática em
fundo preto) e `heritage` (alimentação premium).
