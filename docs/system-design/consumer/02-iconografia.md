# 02 — Iconografia

> Substitui `lucide-react-native` por uma biblioteca SVG própria, espelho do `CourierIcon` do courier. Mesma assinatura, mesmo stroke, mesmo viewBox. Resultado: ícones consistentes em peso e estilo entre os dois apps.

## 1. Por que custom em vez de lucide

| Critério | Lucide | ConsumerIcon (custom) |
|---|---|---|
| Coerência com courier | ❌ courier não usa | ✅ mesma DNA |
| Stroke uniforme | parcial (lucide varia entre 1.5 e 2) | ✅ stroke fixo configurável (default 1.9) |
| Bundle | ~todo o pacote (tree-shaking incompleto no RN) | ✅ só os ícones que usamos |
| Personalização | difícil sobrescrever um ícone | ✅ um `case` no switch |
| Familiaridade visual | "estilo lucide" — comum, genérico | "estilo Mallora" — proprietário |

A trade-off: precisamos manter o arquivo. Compensa porque o conjunto é pequeno (~45 ícones) e estável.

## 2. Onde mora

```
apps/mobile-consumer/
└── components/
    └── ConsumerIcon.tsx   # único arquivo, ~300 linhas no estado final
```

Localização espelha o courier (`apps/mobile-courier/components/CourierIcon.tsx`).

## 3. Assinatura

```tsx
import Svg, { Circle, Path, Rect, Line } from 'react-native-svg'

export type ConsumerIconName =
  // Navegação principal (tabs)
  | 'home' | 'reels' | 'orders' | 'user'
  // Comuns (espelho do courier)
  | 'search' | 'pin' | 'clock' | 'package' | 'back' | 'phone'
  | 'check' | 'logout' | 'shield' | 'spark' | 'eye' | 'eye-off' | 'camera'
  | 'store' | 'cash' | 'wallet' | 'trend' | 'power'
  // Específicos do consumer
  | 'bell' | 'bike' | 'truck' | 'tag' | 'heart' | 'comment' | 'send'
  | 'play' | 'volume' | 'volume-off' | 'edit' | 'file' | 'info'
  | 'bag' | 'chef' | 'check-double' | 'check-circle' | 'close' | 'close-circle'
  | 'chevron-down' | 'chevron-right' | 'chevron-left' | 'chevron-up'
  | 'plus' | 'minus'

interface ConsumerIconProps {
  name: ConsumerIconName
  size?: number       // default 20
  color?: string      // default consumerDesign.colors.ink ('#111216')
  strokeWidth?: number // default 1.9
}

export function ConsumerIcon({
  name,
  size = 20,
  color = '#111216',
  strokeWidth = 1.9,
}: ConsumerIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {renderIcon(name, color, strokeWidth)}
    </Svg>
  )
}

function renderIcon(name: ConsumerIconName, color: string, strokeWidth: number) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (name) {
    // ... ver §6
  }
}
```

**Convenções fixas (não-negociáveis):**
- `viewBox="0 0 24 24"` — todos os ícones desenhados nesse grid.
- `fill="none"` no `<Svg>` raiz; ícone é stroke-only.
- `strokeLinecap: 'round'` e `strokeLinejoin: 'round'` em todos os paths.
- `strokeWidth` default `1.9` (igual courier). Variar só em casos específicos (ver §7).

## 4. Tabela completa de ícones

### 4.1 Navegação (tab bar)
| Nome | Equivalente lucide hoje | Onde aparece |
|---|---|---|
| `home` | `Home` | tab "Início" |
| `reels` | `Clapperboard` | tab "Explorar" |
| `orders` | `ClipboardList` | tab "Pedidos" |
| `user` | `User` | tab "Perfil" |

### 4.2 Reaproveitados do courier (21)
| Nome | Uso no consumer |
|---|---|
| `search` | header da home, tela buscar |
| `pin` | endereços, mapa |
| `clock` | tempo de entrega, timeline |
| `package` | empty state de pedidos, item do carrinho |
| `back` | botão de voltar (custom header) |
| `phone` | contatar entregador / loja |
| `check` | confirmação inline |
| `logout` | tela perfil |
| `shield` | "Termos e privacidade" no perfil |
| `spark` | promo, novidades |
| `eye` / `eye-off` | toggle senha (auth) |
| `camera` | upload de foto (perfil — futuro) |
| `store` | placeholder de loja sem logo |
| `cash` | método de pagamento dinheiro |
| `wallet` | método de pagamento online |
| `trend` | métricas (futuro) |
| `power` | toggles |
| `route` | tracking (link "ver rota") |

### 4.3 Específicos do consumer (24)
| Nome | Equivalente lucide | Onde aparece |
|---|---|---|
| `bell` | `Bell` | header da home (notificações) |
| `bike` | `Bike` | NotificacoesPopup, status pedido |
| `truck` | `Truck` | LojaCard (taxa de entrega) |
| `tag` | `Tag` | promoções, NotificacoesPopup |
| `heart` | `Heart` | reels (curtir) |
| `comment` | `MessageCircle` | reels (comentar) |
| `send` | `Send` | reels (compartilhar) |
| `play` | `Play` | reels (gallery → play) |
| `volume` | `Volume2` | reels (com som) |
| `volume-off` | `VolumeX` | reels (mudo) |
| `edit` | `Edit3` | EditarPerfil, endereço |
| `file` | `FileText` | "Documentos legais" no perfil |
| `info` | `Info` | NotificacoesPopup, tooltips |
| `bag` | `ShoppingBag` | reels (botão "Comprar"), header |
| `chef` | `ChefHat` | status `em_preparo` |
| `check-double` | `CheckCheck` | NotificacoesPopup ("marcar como lidas") |
| `check-circle` | `CheckCircle2` | status `entregue`, success modal |
| `close` | `X` | fechar modal, dismiss notificação |
| `close-circle` | `XCircle` | status `cancelado` |
| `chevron-down` | `ChevronDown` | seletores |
| `chevron-right` | `ChevronRight` | list items navegáveis |
| `chevron-left` | (interno) | navegação reversa |
| `chevron-up` | (interno) | dropdown invertido |
| `plus` | (interno) | qty +1 no carrinho |
| `minus` | (interno) | qty -1 no carrinho |

> `package-search` (presente em `pedidos.tsx` hoje) **não vira ícone próprio** — substituído pela combinação visual `package` em empty state. Reduz superfície da biblioteca.

## 5. Mapeamento `lucide → consumer-icon` (cheatsheet de migração)

Tabela que vai colar em todo PR de refactor. Encontrou um `import { X } from 'lucide-react-native'`? Troca conforme abaixo.

| Lucide | ConsumerIcon |
|---|---|
| `Bell` | `<ConsumerIcon name="bell" />` |
| `Bike` | `<ConsumerIcon name="bike" />` |
| `CheckCheck` | `<ConsumerIcon name="check-double" />` |
| `CheckCircle2` | `<ConsumerIcon name="check-circle" />` |
| `ChefHat` | `<ConsumerIcon name="chef" />` |
| `ChevronDown` | `<ConsumerIcon name="chevron-down" />` |
| `ChevronRight` | `<ConsumerIcon name="chevron-right" />` |
| `Clapperboard` | `<ConsumerIcon name="reels" />` |
| `ClipboardList` | `<ConsumerIcon name="orders" />` |
| `Clock` | `<ConsumerIcon name="clock" />` |
| `Edit3` | `<ConsumerIcon name="edit" />` |
| `FileText` | `<ConsumerIcon name="file" />` |
| `Heart` | `<ConsumerIcon name="heart" />` |
| `Home` | `<ConsumerIcon name="home" />` |
| `Info` | `<ConsumerIcon name="info" />` |
| `LogOut` | `<ConsumerIcon name="logout" />` |
| `MapPin` | `<ConsumerIcon name="pin" />` |
| `MessageCircle` | `<ConsumerIcon name="comment" />` |
| `PackageSearch` | `<ConsumerIcon name="package" />` (com label de empty state) |
| `Play` | `<ConsumerIcon name="play" />` |
| `Search` | `<ConsumerIcon name="search" />` |
| `Send` | `<ConsumerIcon name="send" />` |
| `Shield` | `<ConsumerIcon name="shield" />` |
| `ShoppingBag` | `<ConsumerIcon name="bag" />` |
| `Sparkles` | `<ConsumerIcon name="spark" />` |
| `Tag` | `<ConsumerIcon name="tag" />` |
| `Truck` | `<ConsumerIcon name="truck" />` |
| `User` | `<ConsumerIcon name="user" />` |
| `Volume2` | `<ConsumerIcon name="volume" />` |
| `VolumeX` | `<ConsumerIcon name="volume-off" />` |
| `X` | `<ConsumerIcon name="close" />` |
| `XCircle` | `<ConsumerIcon name="close-circle" />` |

### Diferença de props

| Lucide (antes) | ConsumerIcon (depois) |
|---|---|
| `<Search size={20} color="#111" strokeWidth={2} />` | `<ConsumerIcon name="search" size={20} color="#111" strokeWidth={2} />` |
| `<Bell color={cor} />` | `<ConsumerIcon name="bell" color={cor} />` |

API é idêntica (`size`, `color`, `strokeWidth`), só muda a forma de selecionar o ícone (prop `name` em vez do componente importado).

## 6. Implementação dos paths SVG

Cada ícone segue o padrão do `CourierIcon`. Lista completa abaixo (paths foram desenhados pra encaixar no grid 24×24 com stroke 1.9).

> Esta seção serve como referência durante a Fase 1. Ao implementar, copiar o switch direto.

### Reaproveitados do courier
Copiar **literalmente** os 21 cases de `apps/mobile-courier/components/CourierIcon.tsx` (`home`, `route`, `wallet`, `user`, `search`, `power`, `store`, `pin`, `clock`, `cash`, `package`, `back`, `phone`, `check`, `trend`, `logout`, `shield`, `spark`, `eye`, `eye-off`, `camera`).

### Novos ícones — paths de referência

```tsx
// Tab bar
case 'reels':
  return (
    <>
      <Rect {...common} x="3" y="5.5" width="18" height="13" rx="2" />
      <Path {...common} d="M3 9.5h18M7.5 5.5L9.5 9.5M12 5.5L14 9.5M16.5 5.5L18.5 9.5" />
    </>
  )
case 'orders':
  return (
    <>
      <Rect {...common} x="6" y="4" width="12" height="17" rx="2" />
      <Path {...common} d="M9 3.5h6v3H9zM9 11h6M9 15h6M9 19h4" />
    </>
  )

// Comuns consumer
case 'bell':
  return (
    <>
      <Path {...common} d="M6 9.5a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5z" />
      <Path {...common} d="M10 19.5a2 2 0 0 0 4 0" />
    </>
  )
case 'bike':
  return (
    <>
      <Circle {...common} cx="5.5" cy="17" r="3.25" />
      <Circle {...common} cx="18.5" cy="17" r="3.25" />
      <Path {...common} d="M5.5 17l3.5-7h5l3.5 7M9 10l-1.5-3.5H5M14 10l1-3.5h2.5" />
    </>
  )
case 'truck':
  return (
    <>
      <Rect {...common} x="2.5" y="7.5" width="11" height="9" rx="1.5" />
      <Path {...common} d="M13.5 10.5h4l3 3.5v2.5h-7" />
      <Circle {...common} cx="7" cy="17" r="2" />
      <Circle {...common} cx="17" cy="17" r="2" />
    </>
  )
case 'tag':
  return (
    <>
      <Path {...common} d="M3.5 11.5V4.5h7L20.5 14.5l-6 6L3.5 11.5z" />
      <Circle {...common} cx="8" cy="8" r="1.25" />
    </>
  )
case 'heart':
  return (
    <Path {...common} d="M12 20.5s-7.5-4.5-7.5-10A4 4 0 0 1 12 7.5 4 4 0 0 1 19.5 10.5c0 5.5-7.5 10-7.5 10z" />
  )
case 'comment':
  return (
    <Path {...common} d="M20.5 12c0 4.5-3.5 7.5-8.5 7.5a10 10 0 0 1-3.5-.6L4 20.5l1.6-4.4A8 8 0 0 1 3.5 12c0-4.5 3.5-7.5 8.5-7.5s8.5 3 8.5 7.5z" />
  )
case 'send':
  return (
    <>
      <Path {...common} d="M21 3.5L3 11l7.5 2 2 7.5L21 3.5z" />
      <Path {...common} d="M10.5 13L21 3.5" />
    </>
  )
case 'play':
  return (
    <Path {...common} d="M7 4.5v15l13-7.5L7 4.5z" />
  )
case 'volume':
  return (
    <>
      <Path {...common} d="M4.5 9.5h3l5-4v13l-5-4h-3v-5z" />
      <Path {...common} d="M16 8.5a5 5 0 0 1 0 7M18.5 5.5a8.5 8.5 0 0 1 0 13" />
    </>
  )
case 'volume-off':
  return (
    <>
      <Path {...common} d="M4.5 9.5h3l5-4v13l-5-4h-3v-5z" />
      <Path {...common} d="M17 9l5 5M22 9l-5 5" />
    </>
  )
case 'edit':
  return (
    <>
      <Path {...common} d="M4 20l1-4 11-11 3 3-11 11-4 1z" />
      <Path {...common} d="M14 7l3 3" />
    </>
  )
case 'file':
  return (
    <>
      <Path {...common} d="M6 3.5h7l5 5v12H6v-17z" />
      <Path {...common} d="M13 3.5v5h5M9 12.5h6M9 16h6" />
    </>
  )
case 'info':
  return (
    <>
      <Circle {...common} cx="12" cy="12" r="8.25" />
      <Path {...common} d="M12 11v5M12 8v0.01" />
    </>
  )
case 'bag':
  return (
    <>
      <Path {...common} d="M5 7.5h14l-1 13H6l-1-13z" />
      <Path {...common} d="M9 10V7a3 3 0 0 1 6 0v3" />
    </>
  )
case 'chef':
  return (
    <>
      <Path {...common} d="M6 11a3.5 3.5 0 1 1 1.5-6.6A4 4 0 0 1 16.5 4.4 3.5 3.5 0 1 1 18 11v3H6v-3z" />
      <Path {...common} d="M6 14h12v5.5H6z" />
    </>
  )
case 'check-double':
  return (
    <>
      <Path {...common} d="M3 12.5l4 4 9-9" />
      <Path {...common} d="M9 16.5l4 4 9-9" />
    </>
  )
case 'check-circle':
  return (
    <>
      <Circle {...common} cx="12" cy="12" r="8.25" />
      <Path {...common} d="M8.5 12.5l3 3 4-5" />
    </>
  )
case 'close':
  return <Path {...common} d="M5 5l14 14M19 5L5 19" />
case 'close-circle':
  return (
    <>
      <Circle {...common} cx="12" cy="12" r="8.25" />
      <Path {...common} d="M9 9l6 6M15 9l-6 6" />
    </>
  )
case 'chevron-down':
  return <Path {...common} d="M6 9.5l6 6 6-6" />
case 'chevron-right':
  return <Path {...common} d="M9.5 6l6 6-6 6" />
case 'chevron-left':
  return <Path {...common} d="M14.5 6l-6 6 6 6" />
case 'chevron-up':
  return <Path {...common} d="M6 14.5l6-6 6 6" />
case 'plus':
  return <Path {...common} d="M12 5v14M5 12h14" />
case 'minus':
  return <Path {...common} d="M5 12h14" />
```

> Os paths acima foram desenhados pra estética coerente com os do courier. Pequenos ajustes podem aparecer durante a implementação (alinhamento óptico) — o documento serve de baseline.

## 7. Quando ajustar `strokeWidth`

| Caso | Stroke recomendado |
|---|---|
| Tab bar inativo | `1.8` |
| Tab bar ativo | `2.2` |
| Ícone padrão (botão, list item) | `1.9` (default) |
| Ícone sobre fundo escuro pequeno (≤16px) | `2.0` |
| Ícone hero (≥40px) | `1.6` (mais leve) |

Tab bar ativa segue exatamente o courier: `strokeWidth: 2.2` + `color: colors.accent`.

## 8. Padrões de uso comuns

### 8.1 Ícone em botão primário
```tsx
<TouchableOpacity
  className="rounded-pill flex-row items-center justify-center gap-2 py-4"
  style={{ backgroundColor: colors.accent }}
  activeOpacity={0.85}
>
  <ConsumerIcon name="bag" size={18} color={colors.ink} strokeWidth={2.1} />
  <Text className="text-ink font-extrabold">Finalizar pedido</Text>
</TouchableOpacity>
```

### 8.2 Ícone em círculo (avatar de seção)
```tsx
<View
  className="items-center justify-center"
  style={{
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
  }}
>
  <ConsumerIcon name="bell" size={18} color={colors.accent} />
</View>
```

### 8.3 Ícone em status badge
```tsx
<View
  className="flex-row items-center gap-1 px-2 py-1"
  style={{
    borderRadius: radius.pill,
    backgroundColor: softColor(colors.warning), // utilitário do consumer-design
  }}
>
  <ConsumerIcon name="chef" size={12} color={colors.warning} strokeWidth={2.2} />
  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.warning, letterSpacing: 1.2 }}>
    EM PREPARO
  </Text>
</View>
```

### 8.4 Ícone em chip de toggle (qty)
```tsx
<TouchableOpacity
  className="items-center justify-center"
  style={{
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ativo ? colors.ink : colors.surfaceMuted,
  }}
  activeOpacity={0.75}
>
  <ConsumerIcon
    name="plus"
    size={16}
    color={ativo ? colors.accent : colors.ink}
    strokeWidth={2.2}
  />
</TouchableOpacity>
```

## 9. Estratégia de migração

### Fase 1 (Foundation)
- `ConsumerIcon.tsx` é criado com **todos** os ícones já implementados — mesmo que ainda não sejam usados.
- `lucide-react-native` permanece no `package.json` durante toda a transição.

### Fases 3 a 9 (telas)
- A cada arquivo refatorado, o import `from 'lucide-react-native'` é removido e substituído por `ConsumerIcon`.
- Não criar wrappers temporários (`<IconCompat>`) — mistura prolonga a transição. Refator de tela troca tudo de uma vez.

### Critério para remover lucide do `package.json`
```bash
grep -r "from 'lucide-react-native'" apps/mobile-consumer/ --include="*.tsx" --include="*.ts"
```
Quando este comando retornar vazio, abrir PR de cleanup que:
1. Remove `lucide-react-native` de `apps/mobile-consumer/package.json`.
2. Atualiza lockfile (`pnpm install`).
3. Remove eventuais `.d.ts` órfãos.

Esse PR de cleanup é o último da Fase 9.

## 10. Como adicionar um novo ícone

1. **Confirmar que não existe um equivalente** na lista atual. Procurar primeiro reaproveitar (ex.: usar `package` em vez de criar `box`).
2. Desenhar no grid 24×24 com stroke 1.9, linecap round.
3. Adicionar o nome em `ConsumerIconName` (manter ordem alfabética dentro do grupo: navegação / comuns / consumer).
4. Adicionar o `case` no switch, seguindo a convenção de `<Path {...common} d="..." />`.
5. Documentar na tabela apropriada deste arquivo (§4).
6. Se está substituindo um lucide existente, atualizar §5.

**Não adicionar um ícone só porque uma tela "talvez precise".** A biblioteca cresce sob demanda, com PRs reais.

## 11. Critério de aceite (Fase 1, parte iconografia)

- [ ] `apps/mobile-consumer/components/ConsumerIcon.tsx` existe.
- [ ] Exporta `ConsumerIcon` e `ConsumerIconName`.
- [ ] Todos os ~46 ícones listados em §4 estão implementados.
- [ ] `pnpm --filter mobile-consumer typecheck` passa.
- [ ] **Nenhum** arquivo em `apps/mobile-consumer/` ainda foi migrado de lucide → ConsumerIcon (isso é trabalho das fases seguintes).
- [ ] `lucide-react-native` permanece no `package.json` (remoção é o último PR da Fase 9).
- [ ] Importar `ConsumerIcon` em uma tela de teste e renderizar 3 ícones diferentes valida visualmente o output (smoke check, não precisa virar teste automatizado).

## 12. Referências

- Courier (origem do padrão): [`apps/mobile-courier/components/CourierIcon.tsx`](../../../apps/mobile-courier/components/CourierIcon.tsx)
- Tokens consumidos: [`01-tokens.md`](./01-tokens.md)
- Aplicação dos ícones em componentes: [`03-componentes-base.md`](./03-componentes-base.md) e [`04-componentes-dominio.md`](./04-componentes-dominio.md)
