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
