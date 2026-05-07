# 04 — Componentes de domínio

> Componentes que **conhecem** os modelos do consumer (loja, produto, item de carrinho, pedido, endereço, pagamento). Compõem os primitivos de [`03-componentes-base.md`](./03-componentes-base.md) e consomem tokens de [`01-tokens.md`](./01-tokens.md). Vivem na raiz de `apps/mobile-consumer/components/`.

## Convenções

- API em PT-BR. Props usam `aoTocar`/`onPress`, `loja`, `produto`, `pedido`, `item`, `endereco`, `metodo`.
- Sem hex literal. Tudo via `consumerDesign.colors`.
- Sem `lucide-react-native`. Tudo via `<ConsumerIcon>`.
- Cada componente é responsável **apenas** pela sua apresentação. Lógica de fetch, store update e navegação fica nos consumidores (telas).

## Mapa do refactor

| Antes | Depois | Notas |
|---|---|---|
| `LojaCard.tsx` (vertical, ~150 linhas) | `LojaCard.tsx` (refactor in-place) | dark-friendly, sem placeholder colorido, badges via `<Badge>` |
| `LojaCardH.tsx` (horizontal, ~210 linhas) | `LojaCardH.tsx` (refactor in-place) | mesma DNA, largura `0.62*screen` mantida |
| inline em `loja/[slug].tsx` | `ProdutoCard.tsx` (novo) | extrai card de produto reutilizável |
| `ItemCarrinhoCard.tsx` (~60 linhas) | `ItemCarrinhoCard.tsx` (refactor) | `+`/`-` viram `<ConsumerIcon name="plus|minus">` |
| inline `CardPedido` em `pedidos.tsx` | `PedidoCard.tsx` (novo) | extrai card de pedido reutilizável |
| `ModalProduto.tsx` (~300 linhas) | `ModalProduto.tsx` (refactor) | bottom-sheet dark com handle, CTA `<Botao>` |
| `BannerCarousel.tsx` (mock 3 banners) | `BannerCarousel.tsx` (refactor) | accept `banners` como prop, dark surfaces, accent dot |
| `SeletorEndereco.tsx` | `SeletorEndereco.tsx` (refactor) | usa `<Input>`, `<Card>`, `<Botao>` |
| `SeletorPagamento.tsx` | `SeletorPagamento.tsx` (refactor) | usa `<Card>` e `<ConsumerIcon>` |
| `MapaEntregador.tsx` | `MapaEntregador.tsx` (refactor mínimo) | `pinColor` deriva dos tokens |
| `NotificacoesPopup.tsx` | `NotificacoesPopup.tsx` (refactor) | bottom-sheet dark, ícones via `ConsumerIcon` |
| `EditarPerfil.tsx`, `GerenciarEnderecos.tsx` | refactor in-place | usa primitivos `Input`/`Card`/`Botao` |
| `CategoriaChip.tsx` | **deletado** | substituído por `<Chip>` direto |

---

## 1. `LojaCard` (vertical)

Card de loja em grade, geralmente em busca/categoria.

### Visual alvo

```
┌────────────────────────────┐
│                            │ ← imagem (h: 140) ou placeholder dark com inicial
│   [N]                      │   accent strokeWidth quando placeholder
│                            │
│ [Hambúrguer]    [Grátis]   │ ← Badges absolute top-left / top-right
└────────────────────────────┘
  Burguer do Bairro              ← h3 (18, 700)
  ⏱ 25 min · 🚚 R$ 4,90          ← bodySm muted; verde se grátis
```

### API

```tsx
interface LojaCardProps {
  loja: {
    id: string
    nome: string
    slug: string | null
    logo_url: string | null
    taxa_entrega: number
    tempo_entrega: number | null
    badge?: string         // ex: "Hambúrguer", "Novidade"
  }
  aoTocar: () => void
  largura?: number         // default: '100%' (grid item) ou via parent
}
```

### Comportamento visual

| Elemento | Spec |
|---|---|
| Container | `Card raio="lg" preenchimento="sm" sombra="soft" semBorda` |
| Imagem | altura 140, `borderRadius` igual ao topo do card |
| Placeholder (sem `logo_url`) | `backgroundColor: colors.surfaceDark`, inicial em `colors.accent`, fontSize 64, opacity 0.18, círculo decorativo `colors.accentSoft` no canto |
| Badge categoria | `<Badge rotulo={loja.badge} cor={colors.ink} preenchido tamanho="sm" />` posicionada absolute top-left |
| Badge frete grátis | `<Badge rotulo="Grátis" cor={colors.success} preenchido tamanho="sm" />` posicionada absolute top-right (só se `taxa_entrega === 0`) |
| Nome | fontSize 16, fontWeight 700, color `ink`, numberOfLines 1 |
| Linha meta | flex-row, gap 6, fontSize 13, color `inkMuted`, ícones `clock` e `truck` 12px; cor muda para `success` se frete grátis |

### Diferenças vs hoje

| Antes | Depois |
|---|---|
| `CORES_PLACEHOLDER` array de 6 hex de marca | placeholder único em `surfaceDark` + inicial em `accent` |
| `bg-verde-medio` no badge "Grátis" | `<Badge cor={colors.success} preenchido />` |
| `borderColor: 'rgba(26,26,23,0.06)'` | `Card semBorda` (sombra basta) |
| `Clock`, `Truck` do lucide | `<ConsumerIcon name="clock|truck" />` |

### Nota sobre o "placeholder colorido"

O sistema atual usa um array de 6 cores derivadas do nome da loja para criar avatares coloridos. **Removido**. Justificativa: as 6 cores são todas da marca antiga (verde profundo, ambar, coral) e brigam com o accent lime. Substituídas por placeholder dark único, que dá contraste com a inicial em accent — visualmente coerente com a tab bar e os cards escuros do app.

---

## 2. `LojaCardH` (horizontal)

Variante usada em scroll horizontal no home (lista por seção).

### Visual

Igual ao `LojaCard`, mas:
- Largura fixa: `Math.round(width * 0.62)` (mantém o que existe hoje).
- Imagem: altura 132 (em vez de 140) — encaixe melhor na grid horizontal.
- `flexShrink: 0` para não comprimir no flex parent.

### API

```tsx
interface LojaCardHProps {
  loja: LojaCardProps['loja']
  aoTocar: () => void
}
```

### Estratégia

Internamente é uma especialização de `LojaCard` com largura fixa. Pode-se ou:
- (a) compartilhar o JSX numa função interna `<LojaCardBase>` e usar nas duas variantes, ou
- (b) manter os dois arquivos separados se o JSX divergir mais que esperado.

**Recomendação**: começar separado (b), mais legível. Promover pra base só se aparecer divergência repetida.

---

## 3. `ProdutoCard` (novo)

Hoje os produtos são desenhados inline em `loja/[slug].tsx`. Vira um componente.

### Visual alvo

```
┌──────────┐  Pizza Margherita
│          │  Molho de tomate, mussarela, manjericão
│  [img]   │
│          │  R$ 38,90
└──────────┘
```

### API

```tsx
interface ProdutoCardProps {
  produto: {
    id: string
    nome: string
    descricao: string | null
    preco: number
    imagem_url: string | null
  }
  aoTocar: () => void
  variante?: 'lista' | 'grade'  // default 'lista'
}
```

### Comportamento visual

| Variante | Layout |
|---|---|
| `lista` (default) | flex-row, imagem 88x88 à esquerda, conteúdo à direita, divisor inferior `colors.line` |
| `grade` | coluna, imagem 100% × 120 no topo, conteúdo abaixo |

| Elemento | Spec |
|---|---|
| Imagem | `borderRadius: radius.md`, `backgroundColor: colors.canvasAlt` (placeholder se sem URL) |
| Placeholder | `<ConsumerIcon name="bag" size={32} color={colors.inkSoft} />` centralizado |
| Nome | fontSize 16, fontWeight 700, color `ink`, numberOfLines 1 |
| Descrição | fontSize 13, color `inkMuted`, numberOfLines 2 |
| Preço | fontSize 15, fontWeight 800, color `ink` (não mais verde profundo) |
| Container | `TouchableOpacity activeOpacity={0.75}`, padding 16, gap 12 |

### Migração

Substitui o JSX inline em `loja/[slug].tsx`. Ver detalhamento em [`07-telas.md`](./07-telas.md).

---

## 4. `ItemCarrinhoCard`

Linha de item no carrinho (checkout).

### Visual alvo

```
1× Pizza Margherita                 R$ 38,90
   Sem cebola                       [−] 1 [+]
```

### API

```tsx
interface ItemCarrinhoCardProps {
  item: ItemCarrinho           // do @mallora/types
  // ações vêm do useCartStore — componente lê store internamente
}
```

### Comportamento visual

| Elemento | Spec |
|---|---|
| Container | flex-row, gap 12, padding 16, divisor inferior `colors.line` |
| Nome | fontSize 14, fontWeight 700, color `ink`, numberOfLines 1 |
| Observações | fontSize 12, color `inkMuted`, numberOfLines 1, mt 2 |
| Preço total | fontSize 14, fontWeight 800, color `ink`, mt 4 |
| Botões qty | 32x32 round, ver tabela abaixo |

### Botões de quantidade

| Estado | Background | Ícone | Cor ícone |
|---|---|---|---|
| `−` quando qty > 1 | `colors.surfaceMuted` | `<ConsumerIcon name="minus" size={14} strokeWidth={2.2} />` | `colors.ink` |
| `−` quando qty === 1 (vira "remover") | `softColor(colors.danger)` | `<ConsumerIcon name="close" size={14} strokeWidth={2.2} />` | `colors.danger` |
| `+` | `colors.ink` | `<ConsumerIcon name="plus" size={14} strokeWidth={2.2} />` | `colors.accent` |

### Diferenças vs hoje

| Antes | Depois |
|---|---|
| Texto `×` ou `−` em fontSize 18 | ícone real (`close` ou `minus`) |
| `bg-verde-profundo` no `+` | `bg-ink` com ícone em `accent` |
| `border border-gray-200` no `-` | `bg-surface-muted` sem borda |
| `text-verde-profundo` no preço | `text-ink` (preço discretamente — destaque está no CTA do checkout, não em cada item) |

---

## 5. `PedidoCard` (novo)

Hoje vive como `CardPedido` interno em `pedidos.tsx`. Promovido a componente.

### Visual alvo (resumido)

```
┌─────────────────────────────────────────────────┐
│ [chef icon]  Burguer do Bairro          [→]    │
│              2 itens · R$ 47,80                  │
│                                                  │
│  [▓▓▓▓▓▓░░░░░░░░░░░░░] 52%                     │
│                                                  │
│  [EM PREPARO]                  Hoje, 19:42       │
└─────────────────────────────────────────────────┘
```

### API

```tsx
interface PedidoCardProps {
  pedido: {
    id: string
    status: string
    total: number
    criado_em: string
    stores: { nome: string } | null
    order_items: { nome: string; quantidade: number }[]
  }
  aoTocar: () => void
}
```

### Comportamento visual

| Elemento | Spec |
|---|---|
| Container | `Card raio="lg" preenchimento="md"` |
| Card de pedido ativo | `Card variante="escuro"` ao invés de `claro` (decisão: ver §abaixo) |
| Ícone de status (top-left) | círculo 44x44, `borderRadius: 22`, background `softColor(meta.cor)`, ícone `meta.icone` 20px em `meta.cor` |
| Nome da loja | fontSize 16, fontWeight 700, color `ink` (ou `white` se ativo dark) |
| Resumo de itens | fontSize 13, color `inkMuted`, format: `"2 itens · R$ 47,80"` |
| Chevron | `<ConsumerIcon name="chevron-right" size={18} color={colors.inkSoft} />` |
| Barra de progresso | altura 6, `borderRadius: 3`, track `colors.canvasAlt`, fill `meta.cor`, width: `${meta.progresso * 100}%` |
| Status badge | `<Badge rotulo={meta.rotuloCurto} cor={meta.cor} icone={meta.icone} tamanho="sm" />` |
| Data | fontSize 11, fontWeight 700, color `inkSoft`, letterSpacing 1.2, uppercase |

### Decisão: pedido ativo é `escuro`?

**Sim.** Critério: se `ehAtivo(pedido.status)`, usar `Card variante="escuro"`. Senão, `claro`. Motivo: hierarquia visual — pedido em curso é o que importa agora, então ganha o canvas dark.

```tsx
const meta = metaDoStatus(pedido.status)
const ativo = ehAtivo(pedido.status)

<Card variante={ativo ? 'escuro' : 'claro'} raio="lg" preenchimento="md">
  {/* ... */}
</Card>
```

### Migração

`pedidos.tsx` antes:
```tsx
function CardPedido({ item, ativo }: { item: Pedido; ativo: boolean }) { ... }

<FlatList renderItem={({ item }) => <CardPedido item={item} ativo={...} />} />
```

`pedidos.tsx` depois:
```tsx
import { PedidoCard } from '@/components/PedidoCard'
import { ehAtivo } from '@/lib/status-pedido'

<FlatList renderItem={({ item }) => (
  <PedidoCard pedido={item} aoTocar={() => router.push(`/pedido/${item.id}`)} />
)} />
```

(`ativo` é derivado dentro do `PedidoCard` via `ehAtivo(pedido.status)` — não vem mais como prop.)

---

## 6. `ModalProduto`

Bottom-sheet de produto (detalhe + add to cart). Hoje tem ~300 linhas com overlay, header, descrição, observações, qty, e modal secundário de "trocar loja".

### Visual alvo

```
┌─────────────────────────────────────┐  ← overlay rgba(0,0,0,0.4)
│          ─────                       │  ← drag handle
│                                       │
│   [imagem cobre topo, h: 240]        │
│                                       │
│   Pizza Margherita      R$ 38,90    │  ← linha de título
│   Molho de tomate, mussarela...      │
│                                       │
│   ┌────────────────────────────┐    │
│   │ Observações                 │    │  ← Input multilinha rotulo="Observações"
│   │                              │    │
│   └────────────────────────────┘    │
│                                       │
│   [−]  1  [+]              R$ 38,90  │
│                                       │
│   ┌────────────────────────────┐    │
│   │  Adicionar — R$ 38,90      │    │  ← Botao primário tamanho="lg" largura="completa"
│   └────────────────────────────┘    │
└─────────────────────────────────────┘
```

### Comportamento visual

| Elemento | Spec |
|---|---|
| Overlay | `colors.ink + opacity 0.4` (literal `rgba(17, 18, 22, 0.4)` — ou usar token `opacity.overlay`) |
| Sheet | `backgroundColor: colors.surface`, `borderTopLeftRadius: radius.xl`, `borderTopRightRadius: radius.xl`, altura ~85% screen |
| Drag handle | barra 36x4, `colors.line`, `borderRadius: 2`, alignSelf center, mt 12 |
| Imagem | width 100%, height 240, sem borderRadius (encosta no topo do sheet menos o handle); placeholder = canvas-alt + ícone bag |
| Botão fechar | `<ConsumerIcon name="close" />` em círculo 36x36 `colors.surface` com sombra, top-right absoluto |
| Título e preço | flex-row space-between; nome `fontSize: 20, fontWeight: 800, color: ink`; preço `fontSize: 18, fontWeight: 800, color: ink` |
| Descrição | fontSize 14, color `inkMuted`, lineHeight 20 |
| Observações | `<Input multilinha rotulo="Observações (opcional)" placeholder="Ex.: sem cebola" />` |
| Qty controls | mesmas regras de `ItemCarrinhoCard` |
| CTA | `<Botao label={\`Adicionar — \${formatarReais(...)}\`} variante="primario" tamanho="lg" iconeDireita="bag" />` |

### Modal secundário "trocar loja"

Quando o usuário tem itens de outra loja no carrinho, hoje aparece um confirm dialog. Permanece, mas refatorado:

```tsx
<Modal transparent visible animationType="fade">
  <View style={{ flex: 1, backgroundColor: 'rgba(17,18,22,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
    <Card raio="lg" preenchimento="lg" semBorda style={{ width: '100%', maxWidth: 360 }}>
      <ConsumerIcon name="info" size={32} color={colors.warning} />
      <Text style={{ fontSize: 18, fontWeight: 800, color: colors.ink, marginTop: 12 }}>
        Trocar de loja?
      </Text>
      <Text style={{ fontSize: 14, color: colors.inkMuted, marginTop: 6, lineHeight: 20 }}>
        Você já tem itens de outra loja no carrinho. Adicionar este vai esvaziá-lo.
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
        <View style={{ flex: 1 }}>
          <Botao label="Cancelar" variante="ghost" tamanho="md" onPress={cancelar} />
        </View>
        <View style={{ flex: 1 }}>
          <Botao label="Trocar" variante="primario" tamanho="md" onPress={confirmar} />
        </View>
      </View>
    </Card>
  </View>
</Modal>
```

---

## 7. `BannerCarousel`

Carrossel auto-rotativo no topo do home.

### Mudanças

1. **Recebe `banners` como prop** em vez de hardcoded. Móvel pra hoje (mock array em `lib/banners-mock.ts`) e fácil de plugar depois quando vier do backend.
2. **Cores usam tokens.** Cada banner especifica `tom: 'primario' | 'sucesso' | 'destaque'` e o componente decide a cor:
   - `primario`: background `colors.ink`, accent `colors.accent` em tag/título
   - `sucesso`: background `colors.success`, ink em texto
   - `destaque`: background `colors.surfaceDark`, accent
3. **Indicadores (dots)** usam `colors.accent` quando ativo, `colors.inkSoft` quando inativo. Largura ativa 18, inativa 6 (mantido).
4. **Círculos decorativos** mantidos, mas opacidade derivada (`rgba(255,255,255,0.07)`).

### API

```tsx
interface Banner {
  id: string
  tom: 'primario' | 'sucesso' | 'destaque'
  tag: string             // "Novidade", "Promo"
  titulo: string
  subtitulo: string
  aoTocar?: () => void    // futuro: link p/ promoção
}

interface BannerCarouselProps {
  banners: Banner[]
  intervalo?: number  // default 4000
}
```

### Estrutura interna

```tsx
const TOM_BG = {
  primario: colors.ink,
  sucesso: colors.success,
  destaque: colors.surfaceDark,
} as const

const TOM_TEXTO = {
  primario: colors.white,
  sucesso: colors.ink,
  destaque: colors.white,
} as const

const TOM_ACCENT = {
  primario: colors.accent,
  sucesso: colors.ink,
  destaque: colors.accent,
} as const
```

Todo o resto (scroll, paging, indicadores) preservado.

---

## 8. `SeletorEndereco`

Componente do checkout. Lista endereços do usuário, permite selecionar e adicionar novo.

### Visual alvo

```
ENDEREÇO DE ENTREGA                    ← label uppercase

┌──────────────────────────────────┐
│ [pin]  Rua das Flores, 123       │  ← Card claro, ícone pin em accent soft
│        Centro · Divinópolis       │
│                                ▷  │
└──────────────────────────────────┘

[+ Adicionar endereço]                ← Botao secundario tamanho md iconeEsquerda="plus"
```

### API

```tsx
interface SeletorEnderecoProps {
  enderecoSelecionado: Endereco | null
  enderecos: Endereco[]
  aoSelecionar: (endereco: Endereco) => void
  aoAdicionar: (endereco: NovoEndereco) => Promise<void>
}
```

### Estrutura

| Bloco | Composição |
|---|---|
| Label de seção | `<Text style={typography.label}>Endereço de entrega</Text>` |
| Card de endereço selecionado | `<Card>` com `<TouchableOpacity>` interno; flex-row: ícone pin (accent soft 36x36) + endereço + chevron |
| Modal de seleção/criação | bottom-sheet com `<Card>` interno; lista de endereços + form de novo via `<Input rotulo="CEP" />` etc. |
| Botão de novo endereço | `<Botao label="Adicionar endereço" variante="secundario" tamanho="md" iconeEsquerda="plus" />` |
| Form do novo endereço | inputs `<Input>` com integração `viaCEP` mantida |

### Migração

Substitui inputs e botões inline por `<Input>` e `<Botao>`. Lógica de busca CEP (`fetchCEP`) preservada.

---

## 9. `SeletorPagamento`

Lista de métodos com radio button custom.

### Visual alvo

```
PAGAMENTO                              ← label

┌──────────────────────────────────┐
│ ○  [wallet] Cartão online        │
└──────────────────────────────────┘
┌──────────────────────────────────┐
│ ●  [cash]   Dinheiro              │  ← selecionado, borda accent
└──────────────────────────────────┘
```

### API

```tsx
interface SeletorPagamentoProps {
  metodoSelecionado: MetodoPagamento
  aoSelecionar: (metodo: MetodoPagamento) => void
}

type MetodoPagamento = 'online_cartao' | 'dinheiro' | 'pix'
```

### Estrutura

| Estado | Borda do card | Background | Bolinha |
|---|---|---|---|
| Selecionado | `colors.accent` 1.5px | `softColor(colors.accent)` | preenchida `colors.ink` (com check inside) |
| Não selecionado | `colors.line` 1px | `colors.surface` | vazia |

```tsx
{METODOS.map((m) => {
  const ativo = metodoSelecionado === m.id
  return (
    <TouchableOpacity
      key={m.id}
      onPress={() => aoSelecionar(m.id)}
      activeOpacity={0.75}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        padding: 16, borderRadius: radius.md,
        backgroundColor: ativo ? softColor(colors.accent) : colors.surface,
        borderWidth: ativo ? 1.5 : 1,
        borderColor: ativo ? colors.accent : colors.line,
      }}
    >
      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: ativo ? colors.ink : colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: ativo ? colors.ink : 'transparent' }}>
        {ativo && <ConsumerIcon name="check" size={12} color={colors.accent} strokeWidth={2.5} />}
      </View>
      <ConsumerIcon name={m.icone} size={20} color={colors.ink} />
      <Text style={{ flex: 1, fontSize: 15, fontWeight: 600, color: colors.ink }}>{m.label}</Text>
    </TouchableOpacity>
  )
})}
```

### Tabela de métodos

| `id` | `label` | `icone` |
|---|---|---|
| `online_cartao` | Cartão online | `wallet` |
| `dinheiro` | Dinheiro | `cash` |
| `pix` | Pix | `phone` *(provisório — adicionar `qr` à `ConsumerIconName` se virar permanente)* |

> Se a app passa a oferecer PIX como permanente, abrir issue pra adicionar ícone `qr` à `ConsumerIcon` na próxima rodada de iconografia (não bloqueante).

---

## 10. `MapaEntregador`

Refactor mínimo. Pinos derivam dos tokens.

### Antes
```tsx
<Marker pinColor="#1A4D3A" />        // entregador
<Marker pinColor="#F5A623" />        // destino
```

### Depois
```tsx
import { consumerDesign } from '@/lib/consumer-design'

<Marker pinColor={consumerDesign.colors.accent} />     // entregador (accent lime)
<Marker pinColor={consumerDesign.colors.ink} />         // destino (ink, contraste)
```

> `react-native-maps` aceita um conjunto limitado de cores nativas para `pinColor` (cores Android) — nem sempre o hex exato é renderizado. Se a fidelidade não for boa, usar `<Marker><Custom view /></Marker>` com `colors.accent` e `colors.ink`. Decisão deferida para a Fase 7 (pedidos).

---

## 11. `NotificacoesPopup`

Bottom-sheet de notificações.

### Visual alvo

- Sheet `colors.surfaceDark`, `borderTopLeftRadius/Right: radius.xl`, com handle.
- Lista de notificações: cada item é um `<Card variante="escuro">` com `softColor(corPorTipo)` no ícone-circle e texto branco.
- Botão "Marcar todas como lidas" (`<Botao variante="ghost" iconeEsquerda="check-double" />`).
- Botão fechar superior direito (`<ConsumerIcon name="close" size={20} color={colors.inkSoft} />`).

### Mapa de tipos → ícone + cor

| `tipo` | `ConsumerIcon` | Cor |
|---|---|---|
| `pedido` | `bike` | `colors.info` |
| `promo` | `tag` | `colors.warning` |
| `novidade` | `spark` | `colors.accent` |
| `sistema` | `info` | `colors.inkSoft` |

### Migração

- Hoje usa `BlurView` do `expo-blur` por cima de uma view escura. Manter o BlurView, ajustar `tint="dark"` e `intensity={40}` para casar com o `surfaceDark`.
- Mock data permanece neste PR; conexão com backend é trabalho futuro fora do escopo do redesign.
- Constante `NOTIFICACOES_NAO_LIDAS` exportada permanece (consumida pelo bell badge no header da home).

---

## 12. `EditarPerfil` e `GerenciarEnderecos`

Componentes de seção do perfil. Refactor consiste em:

1. Substituir `View` containers por `<Card>` quando há agrupamento visual, ou apenas usar tokens diretos quando é seção transparente.
2. Trocar `TextInput` por `<Input rotulo="..." />`.
3. Trocar botões por `<Botao>` (primário/secundário/danger).
4. Trocar texto "Remover" em vermelho por `<Botao variante="danger" tamanho="sm" iconeEsquerda="close" />` em endereços.
5. Trocar ícones lucide por `<ConsumerIcon>`.

Sem novidade visual além do que já está nos primitivos. Detalhamento das telas em [`07-telas.md`](./07-telas.md).

---

## 13. `CategoriaChip` — DELETADO

`components/CategoriaChip.tsx` é removido. Os 2 consumidores atuais (home, buscar) passam a usar `<Chip>` direto:

```tsx
// antes
<CategoriaChip nome="Hambúrguer" emoji="🍔" ativo={ativo} aoTocar={...} />

// depois
<Chip rotulo="Hambúrguer" emoji="🍔" ativo={ativo} aoTocar={...} />
```

Idêntico funcionalmente. A diferença é que `<Chip>` está em `ui/`, é genérico, e não vai duplicar regra visual.

---

## Critério de aceite (Fases 4–7, parte componentes)

- [ ] Cada componente de domínio listado existe em `apps/mobile-consumer/components/`.
- [ ] Nenhum hex literal (exceto `MapaEntregador` se a decisão for adiada).
- [ ] Nenhum import `from 'lucide-react-native'` nos arquivos refatorados.
- [ ] Nenhuma classe Tailwind morta (`bg-verde-*`, `text-verde-*`, `bg-creme`, `text-ambar`, etc.).
- [ ] `components/CategoriaChip.tsx` deletado e referências atualizadas.
- [ ] `pnpm --filter mobile-consumer typecheck` passa após cada PR.
- [ ] PRs anexam screenshot/video comparativo.

## Próximos

- [`05-shell-app.md`](./05-shell-app.md) — tab bar flutuante, header, layouts e splash.
- [`07-telas.md`](./07-telas.md) — montagem das telas usando estes componentes.
