# Mobile Consumer — Visão geral do redesign

> **Decisão de marca**: port literal do system design do `mobile-courier`. O consumer adota a mesma paleta dark + accent lime, os mesmos tokens de raio, a mesma hierarquia de cards e o mesmo conjunto de padrões. Os dois apps passam a falar a mesma língua visual.

## 1. Objetivo

Substituir o design atual do `apps/mobile-consumer` (verde profundo + creme + âmbar, execução inconsistente) pelo system design já consolidado em `apps/mobile-courier`, **mantendo intacta**:

- a estrutura de rotas (`(auth)`, `(tabs)`, `loja/[slug]`, `pedido/[id]`, `checkout`)
- a lógica de navegação (Expo Router)
- as stores Zustand (`useAuthStore`, `useCartStore`, `useOrderStore`)
- as integrações (Supabase, Stripe, push notifications, mapa do entregador)

O escopo é **puramente visual e de organização de UI**. Nenhuma feature é adicionada ou removida.

## 2. Princípios

1. **Tokens primeiro, classNames depois.** Toda cor, raio, tipografia ou espaçamento sai de `lib/consumer-design.ts`. Hex inline é proibido fora desse arquivo (exceções documentadas em [01-tokens.md](./01-tokens.md)).
2. **Um componente, uma fonte de verdade.** Nada de `LojaCard` e `LojaCardH` divergindo no estilo. Cada padrão visual mora em um único componente; variantes são props.
3. **Status só vive em um lugar.** Cor, label e ícone de cada status de pedido moram em `lib/status-pedido.ts`. Nenhuma tela pode redeclarar.
4. **Dark é o canvas de destaque, claro é o canvas de conteúdo.** Cards escuros (`surfaceDark`) marcam ações primárias, saldo, pedido ativo, header de loja. O resto vive em `surface`/`canvas`.
5. **Lime é caro.** O accent (`#D8FF3E`) só aparece em CTAs primários, estados ativos e indicadores essenciais. Spam de accent mata a hierarquia.
6. **Radius nomeado, não em hex.** `radius.sm | md | lg | xl | pill`. Nenhum `borderRadius: 17` aleatório.

## 3. Comparativo courier ↔ consumer

| Eixo | Courier (referência) | Consumer (hoje) | Consumer (alvo) |
|---|---|---|---|
| Tokens | `lib/courier-design.ts` | espalhados inline | `lib/consumer-design.ts` (espelho) |
| Background app | `canvas #F3F3F1` | `creme #F4F0EB` | `canvas #F3F3F1` |
| Accent | `lime #D8FF3E` | verde profundo `#1A4D3A` + âmbar `#D4A04A` | `lime #D8FF3E` |
| Texto principal | `ink #111216` | `ink-900 #1C1C19` | `ink #111216` |
| Tab bar | flutuante, dark, pill `radius.xl` | branca, fixa, com top-bar verde no ativo | flutuante, dark, pill `radius.xl` |
| Cards | dark (`#2F3034`) ou claro (`#FFFFFF`), `radius.lg 28` | branco, `rounded-2xl 16` ou `rounded-20` | dark/claro, `radius.lg 28` ou `radius.xl 34` |
| Status badge | `${cor}18` (alpha 18%) + texto na cor | duplicado em 2 telas, hardcoded | `${cor}18` + helper único |
| Ícones | `CourierIcon` SVG custom (~25) | `lucide-react-native` (32 distintos) | `ConsumerIcon` SVG custom |
| Tipografia | sistema (SF / Roboto), pesos 400→800, tracking negativo nos títulos | sistema, mistura `serif` em headers | sistema, escala única (ver `01-tokens.md`) |
| Splash | `#1A4D3A` (Lottie escura) | `#FFF8ED` (Lottie em creme) | `#111216` (ink), Lottie em accent lime |
| App icon adaptive bg | `#1A4D3A` | `#1A4D3A` | `#111216` (alinhar com nova marca) |

## 4. O que muda — visão macro

### Vai morrer
- A paleta `verde-profundo / verde-medio / verde-100 / verde-500` no Tailwind do consumer.
- As cores `ambar #D4A04A`, `coral #C75B3A`, `gold #C5975B`, `creme #F4F0EB`, `warm #E8E0D4`.
- A escala `ink-{200,300,400,500,700,900}` (substituída por `ink / inkMuted / inkSoft / line`).
- Os 6 placeholders de loja (`['#1A4D3A', '#2D6A4F', ...]`) — viram derivações do accent + dark.
- `fontFamily: 'serif'` nos headers de seção do home.
- A barrinha colorida lateral nos títulos de "piso" do home.
- A cor âmbar dos action buttons da Reels.

### Vai nascer
- `apps/mobile-consumer/lib/consumer-design.ts` (espelho do courier).
- `apps/mobile-consumer/lib/status-pedido.ts` (cor + label + ícone por status, único arquivo).
- `apps/mobile-consumer/components/ConsumerIcon.tsx` (SVG, ~30 ícones).
- Componentes base: `Botao` (refactor), `Input`, `Card`, `Badge`, `Chip`, `Skeleton` (refactor), `EmptyState`, `LoadingState`.
- Tab bar flutuante dark.
- Header pattern unificado.

### Vai sobreviver com refactor
- Todas as telas em `app/`. Estrutura de rotas e lógica preservadas; só a camada visual é trocada.
- Stores Zustand: intocadas.
- `lib/supabase.ts`, `lib/stripe.ts`, `lib/notificacoes.ts`: intocados.
- `hooks/useLocalizacaoCourier.ts`: intocado.
- `MapaEntregador.tsx`: pinos passam a usar `colors.accent` e `colors.ink` em vez de `#1A4D3A` e `#F5A623`.

## 5. Regras de "não fazer"

1. **Não criar variantes "warm" ou "creme"** durante a transição. Ou é dark-courier ou é claro-courier; meio-termo polui.
2. **Não importar de `lucide-react-native`** em código novo. Lucide pode ficar como dependência durante a migração, mas qualquer arquivo refatorado já consome `ConsumerIcon`. Quando o último import sumir, removemos do `package.json`.
3. **Não usar `bg-verde-profundo`, `text-verde-medio`, `bg-creme`, `bg-ambar`, `bg-coral`, `text-ink-700`** etc. nos arquivos refatorados. Tailwind do consumer será reescrito com as classes do courier (`bg-ink`, `bg-canvas`, `bg-surface`, `bg-accent`, …).
4. **Não usar `fontFamily: 'serif'`** em lugar nenhum. A diferenciação de hierarquia vem de `fontSize` + `fontWeight` + `letterSpacing`.
5. **Não criar componentes "Pro"/"V2"/"New"** ao lado dos antigos. Refatoramos no lugar; se precisar transição, fazemos por fase com PRs pequenos.
6. **Não tocar em `apps/mobile-courier`**. Esse trabalho é one-way: courier → consumer.

## 6. Estrutura desta documentação

| Arquivo | Conteúdo | Status |
|---|---|---|
| `00-visao-geral.md` | este documento | feito |
| `01-tokens.md` | `consumer-design.ts` completo + tabelas de cor / raio / tipografia / spacing / motion | feito |
| `02-iconografia.md` | `ConsumerIcon` — lista de ícones, mapeamento `lucide → consumer-icon`, padrão de stroke | feito |
| `03-componentes-base.md` | Botao, Input, Card, Badge, Chip, Skeleton, EmptyState, LoadingState | pendente |
| `04-componentes-dominio.md` | LojaCard(H), ProdutoCard, ItemCarrinhoCard, PedidoCard, ModalProduto, BannerCarousel, SeletorEndereco, SeletorPagamento, MapaEntregador, NotificacoesPopup | pendente |
| `05-shell-app.md` | tab bar flutuante, header pattern, layouts (`_layout.tsx`, `(auth)`, `(tabs)`), splash | pendente |
| `06-status-pedido.md` | `lib/status-pedido.ts` — single source of truth dos 7 estados | pendente |
| `07-telas.md` | Redesenho tela-a-tela (home, buscar, explorar, pedidos, perfil, loja, checkout, pedido, boas-vindas, entrar) | pendente |
| `08-roadmap.md` | Sequência de PRs/fases, dependências, checklist de aceite | pendente |

## 7. Sequência de execução (resumo)

```
Fase 1  Foundation       tokens + ConsumerIcon + tailwind.config + global.css + status-pedido
Fase 2  Base components  Botao Input Card Badge Chip Skeleton EmptyState LoadingState
Fase 3  Shell            tab bar flutuante + header unificado + layouts + splash
Fase 4  Home + Buscar    BannerCarousel novo + LojaCardH novo + reorganização de "pisos"
Fase 5  Loja + Modal     header animado + ProdutoCard + ModalProduto refeito
Fase 6  Checkout         ItemCarrinhoCard + Seletores + CTA fixo
Fase 7  Pedidos          PedidoCard + tracking timeline + MapaEntregador realinhado
Fase 8  Perfil + (auth)  Boas-vindas (3 slides dark) + Entrar (form dark) + Perfil reorganizado
Fase 9  Explorar (reels) accents lime + overlays padronizados + ações realinhadas
```

Cada fase = um PR. Detalhamento em [`08-roadmap.md`](./08-roadmap.md).

## 8. Critérios de pronto (por fase)

Uma fase só é considerada pronta quando:

1. Nenhum hex literal aparece em código de UI da fase (busca `grep -E "#[0-9A-Fa-f]{6}"` nos arquivos tocados retorna vazio, exceto em `consumer-design.ts`).
2. Nenhum `from 'lucide-react-native'` aparece em código de UI da fase.
3. Nenhuma classe Tailwind morta (`verde-*`, `creme`, `ambar`, `coral`, `ink-*`) aparece em código de UI da fase.
4. As telas afetadas abrem sem warning de estilo, build (`pnpm --filter mobile-consumer typecheck`) passa.
5. Screenshot/comparativo visual anexado ao PR para revisão.

## 9. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Inconsistência durante a transição (telas refatoradas convivendo com não-refatoradas) | Tokens são aditivos — `consumer-design.ts` entra na Fase 1 e telas antigas continuam funcionando. Quebra controlada por PR. |
| Perda de identidade de marca | Decisão consciente do produto. Marca consumer atual já se sobrepunha à da courier; unificar reforça a operação Mallora. |
| Splash e ícone do app exigem novos assets gráficos | Tratado na Fase 3 (Shell). Enquanto não chegam novos PNGs, ajustamos só o `backgroundColor`. |
| Reels com fundo dark conflitando com canvas claro do resto | Já era assim antes; a Fase 9 só padroniza tokens, não muda a base. |
| Lucide ainda referenciado em arquivos não refatorados | Remoção da dependência fica para o último PR (Fase 9), depois que `grep -r lucide` retorna vazio. |

## 10. Glossário rápido

- **canvas**: cor de fundo do app (claro). `#F3F3F1`.
- **surface**: cor de card/painel claro. `#FFFFFF`.
- **surfaceDark**: cor de card/painel escuro de destaque. `#2F3034`.
- **ink**: cor de texto principal (também usada como fundo de tab bar). `#111216`.
- **accent**: lime de CTA primário e estados ativos. `#D8FF3E`.
- **pill**: `radius.pill 999`, usado em badges, chips e botões redondos.
- **soft (de uma cor)**: a mesma cor com 18% de alpha, usada em backgrounds de badge.
