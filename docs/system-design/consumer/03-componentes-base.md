# 03 — Componentes base

> Os 8 primitivos visuais do consumer. Cada tela é montada combinando estes blocos. Definidos em `apps/mobile-consumer/components/ui/`.

| Componente | Responsabilidade | Substitui hoje |
|---|---|---|
| `Botao` | Ação clicável (CTA, secundário, ghost, danger) | `components/Botao.tsx` (refactor in-place) |
| `Input` | Campo de texto (single-line, senha, com label/erro) | inputs ad-hoc em `entrar.tsx`, `EditarPerfil.tsx`, `SeletorEndereco.tsx` |
| `Card` | Container retangular (claro ou escuro) com radius e shadow padronizados | `View` com classNames inline em ~15 arquivos |
| `Badge` | Pill de status com ícone opcional | badge inline em `pedidos.tsx`, `LojaCard.tsx`, `LojaCardH.tsx` |
| `Chip` | Pill toggleável (filtro, categoria) | `CategoriaChip.tsx` (refactor) + filtros de `pedidos.tsx` |
| `Skeleton` | Placeholder de loading com pulse | `components/Skeleton.tsx` (refactor) |
| `EmptyState` | Tela/seção vazia (ícone + título + descrição + CTA) | empty inline em `pedidos.tsx`, `buscar.tsx` |
| `LoadingState` | Spinner full-screen ou inline | `ActivityIndicator` solto em ~8 arquivos |

## Onde mora

```
apps/mobile-consumer/components/
├── ConsumerIcon.tsx        # já especificado em 02-iconografia.md
├── ui/
│   ├── Botao.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   ├── Badge.tsx
│   ├── Chip.tsx
│   ├── Skeleton.tsx
│   ├── EmptyState.tsx
│   └── LoadingState.tsx
└── ... (componentes de domínio, ver 04-componentes-dominio.md)
```

A pasta `ui/` agrupa os primitivos. Componentes de domínio (LojaCard, ProdutoCard, …) ficam na raiz de `components/`. Critério: se reutiliza em qualquer tela e não conhece "loja"/"pedido"/"produto", é `ui/`.

## Princípios comuns

1. **Sem hex literal.** Todo `style={{...}}` consome `consumerDesign.colors`/`radius`/`shadow`.
2. **Variantes via prop, não componentes paralelos.** `<Botao variante="ghost">`, não `<BotaoGhost>`.
3. **API em PT-BR**, alinhada com o resto do app (`label`, `carregando`, `desabilitado`, `aoTocar` ou `onPress`).
4. **Acessibilidade mínima**: todo elemento clicável é `TouchableOpacity` com `activeOpacity` apropriado e `accessibilityRole` quando o conteúdo não deixa claro.

---

## 1. `Botao`

### Variantes
| `variante` | Background | Texto | Uso |
|---|---|---|---|
| `primario` (default) | `colors.accent` | `colors.ink` | CTA principal de tela ("Finalizar pedido", "Entrar") |
| `secundario` | `colors.surface` | `colors.ink` | ação alternativa, lado a lado com primário |
| `ghost` | `transparent` | `colors.inkMuted` | "Cancelar", "Esqueci a senha" |
| `dark` | `colors.ink` | `colors.accent` | botão sobre canvas claro com presença forte (header, top de bottom-sheet) |
| `danger` | `colors.danger` | `colors.white` | "Sair da conta", "Excluir endereço" |

### Tamanhos
| `tamanho` | Altura | Padding lateral | Uso |
|---|---|---|---|
| `lg` (default) | 56 | 24 | CTA de tela |
| `md` | 48 | 20 | botão em modal/seção |
| `sm` | 40 | 16 | inline em card |

### API

```tsx
interface BotaoProps {
  label: string
  onPress: () => void
  variante?: 'primario' | 'secundario' | 'ghost' | 'dark' | 'danger'
  tamanho?: 'sm' | 'md' | 'lg'
  carregando?: boolean
  desabilitado?: boolean
  iconeEsquerda?: ConsumerIconName
  iconeDireita?: ConsumerIconName
  largura?: 'auto' | 'completa' // default 'completa' — botão de tela; 'auto' encolhe ao conteúdo
}
```

### Implementação de referência

```tsx
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native'
import { consumerDesign } from '@/lib/consumer-design'
import { ConsumerIcon, ConsumerIconName } from '@/components/ConsumerIcon'

const { colors, radius } = consumerDesign

const VARIANTE_BG = {
  primario: colors.accent,
  secundario: colors.surface,
  ghost: 'transparent',
  dark: colors.ink,
  danger: colors.danger,
} as const

const VARIANTE_TEXTO = {
  primario: colors.ink,
  secundario: colors.ink,
  ghost: colors.inkMuted,
  dark: colors.accent,
  danger: colors.white,
} as const

const TAMANHO = {
  sm: { altura: 40, padX: 16, fonte: 14 },
  md: { altura: 48, padX: 20, fonte: 15 },
  lg: { altura: 56, padX: 24, fonte: 16 },
} as const

export function Botao({
  label,
  onPress,
  variante = 'primario',
  tamanho = 'lg',
  carregando = false,
  desabilitado = false,
  iconeEsquerda,
  iconeDireita,
  largura = 'completa',
}: BotaoProps) {
  const inativo = carregando || desabilitado
  const t = TAMANHO[tamanho]
  const cor = VARIANTE_TEXTO[variante]

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={inativo}
      activeOpacity={0.85}
      style={{
        height: t.altura,
        paddingHorizontal: t.padX,
        borderRadius: radius.pill,
        backgroundColor: VARIANTE_BG[variante],
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        opacity: inativo ? 0.5 : 1,
        alignSelf: largura === 'auto' ? 'flex-start' : 'stretch',
        borderWidth: variante === 'secundario' ? 1 : 0,
        borderColor: variante === 'secundario' ? colors.line : 'transparent',
      }}
    >
      {carregando ? (
        <ActivityIndicator color={cor} />
      ) : (
        <>
          {iconeEsquerda && (
            <ConsumerIcon name={iconeEsquerda} size={tamanho === 'sm' ? 16 : 18} color={cor} strokeWidth={2.1} />
          )}
          <Text style={{ fontSize: t.fonte, fontWeight: '800', color: cor, letterSpacing: 0.2 }}>
            {label}
          </Text>
          {iconeDireita && (
            <ConsumerIcon name={iconeDireita} size={tamanho === 'sm' ? 16 : 18} color={cor} strokeWidth={2.1} />
          )}
        </>
      )}
    </TouchableOpacity>
  )
}
```

### Casos de uso por tela

| Tela | Botão típico |
|---|---|
| Boas-vindas | `<Botao label="Começar" variante="primario" />` |
| Entrar | `<Botao label="Entrar" variante="primario" carregando={loading} />` |
| Loja → Modal produto | `<Botao label="Adicionar — R$ 24,90" variante="primario" iconeDireita="bag" />` |
| Checkout | `<Botao label="Fazer pedido" variante="primario" iconeDireita="check" />` |
| Perfil → Sair | `<Botao label="Sair da conta" variante="danger" iconeEsquerda="logout" />` |
| Modal de confirmação | linha com `<Botao label="Cancelar" variante="ghost" />` + `<Botao label="Confirmar" variante="primario" />` |

### Diferenças vs hoje

| Antes | Depois |
|---|---|
| `bg-verde-profundo` no primário | `bg-accent` (lime) |
| Texto branco no primário | Texto `ink` (preto) — accent lime exige contraste escuro |
| `rounded-2xl` (16) | `radius.pill` (999) |
| 3 variantes | 5 variantes (acrescenta `dark` e `danger`) |
| Sem suporte a ícone | Suporte nativo a ícone esquerda/direita |
| Sem tamanho | 3 tamanhos (`sm`, `md`, `lg`) |

---

## 2. `Input`

Texto de uma única linha. Para multi-line ou observações, é uma variante (`multilinha`).

### API

```tsx
interface InputProps {
  valor: string
  aoMudar: (texto: string) => void
  rotulo?: string                     // label uppercase acima do campo
  placeholder?: string
  erro?: string                        // texto de erro abaixo
  tipo?: 'texto' | 'email' | 'senha' | 'numero' | 'telefone'
  desabilitado?: boolean
  multilinha?: boolean                 // muda altura, alinha topo
  iconeEsquerda?: ConsumerIconName
  acessorioDireita?: React.ReactNode   // pra coisas custom (botão "Aplicar cupom")
  fundoEscuro?: boolean                // true = input sobre surfaceDark (auth screens); também troca o teclado iOS para dark e acende caret/seleção no accent
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  autoFocus?: boolean
}
```

### Comportamento visual

| Estado | Borda | Fundo (modo claro) | Fundo (modo escuro) |
|---|---|---|---|
| Normal | `colors.line` (1.5px) | `colors.surface` | `colors.surfaceDarkSoft` |
| Focado | `colors.accent` (1.5px) | `colors.surface` | `colors.surfaceDarkSoft` |
| Com erro | `colors.danger` (1.5px) | `colors.surface` | `colors.surfaceDarkSoft` |
| Desabilitado | `colors.line` (1.5px) | `colors.canvasAlt` | `colors.surfaceDarkSoft` (opacity 0.5) |

### Implementação de referência

```tsx
import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import { consumerDesign } from '@/lib/consumer-design'
import { ConsumerIcon, ConsumerIconName } from '@/components/ConsumerIcon'

const { colors, radius } = consumerDesign

export function Input({
  valor,
  aoMudar,
  rotulo,
  placeholder,
  erro,
  tipo = 'texto',
  desabilitado = false,
  multilinha = false,
  iconeEsquerda,
  acessorioDireita,
  fundoEscuro = false,
  autoCapitalize = 'sentences',
  autoFocus = false,
}: InputProps) {
  const [focado, setFocado] = useState(false)
  const [senhaVisivel, setSenhaVisivel] = useState(false)

  const corBorda = erro
    ? colors.danger
    : focado
    ? colors.accent
    : fundoEscuro ? colors.lineDark : colors.line

  return (
    <View>
      {rotulo && (
        <Text
          style={{
            fontSize: 12,
            fontWeight: '700',
            color: fundoEscuro ? colors.inkSoft : colors.inkMuted,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          {rotulo}
        </Text>
      )}

      <View
        style={{
          flexDirection: 'row',
          alignItems: multilinha ? 'flex-start' : 'center',
          gap: 10,
          minHeight: multilinha ? 96 : 54,
          borderRadius: radius.md,
          paddingHorizontal: 18,
          paddingVertical: multilinha ? 14 : 0,
          backgroundColor: fundoEscuro
            ? colors.surfaceDarkSoft
            : desabilitado ? colors.canvasAlt : colors.surface,
          borderWidth: 1.5,
          borderColor: corBorda,
          opacity: desabilitado ? 0.7 : 1,
        }}
      >
        {iconeEsquerda && (
          <ConsumerIcon
            name={iconeEsquerda}
            size={18}
            color={focado ? colors.accent : colors.inkSoft}
          />
        )}

        <TextInput
          value={valor}
          onChangeText={aoMudar}
          onFocus={() => setFocado(true)}
          onBlur={() => setFocado(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.inkSoft}
          editable={!desabilitado}
          secureTextEntry={tipo === 'senha' && !senhaVisivel}
          keyboardType={
            tipo === 'email' ? 'email-address'
            : tipo === 'numero' ? 'numeric'
            : tipo === 'telefone' ? 'phone-pad'
            : 'default'
          }
          autoCapitalize={tipo === 'email' || tipo === 'senha' ? 'none' : autoCapitalize}
          autoCorrect={tipo !== 'email' && tipo !== 'senha'}
          autoFocus={autoFocus}
          multiline={multilinha}
          textAlignVertical={multilinha ? 'top' : 'center'}
          style={{
            flex: 1,
            fontSize: 16,
            color: fundoEscuro ? colors.white : colors.ink,
            paddingVertical: 0, // remove padding default Android
          }}
        />

        {tipo === 'senha' && (
          <TouchableOpacity onPress={() => setSenhaVisivel((v) => !v)} activeOpacity={0.7}>
            <ConsumerIcon
              name={senhaVisivel ? 'eye-off' : 'eye'}
              size={20}
              color={colors.inkSoft}
            />
          </TouchableOpacity>
        )}

        {acessorioDireita}
      </View>

      {erro && (
        <Text style={{ fontSize: 13, color: colors.danger, marginTop: 6 }}>
          {erro}
        </Text>
      )}
    </View>
  )
}
```

### Onde substitui inputs ad-hoc

| Arquivo | Hoje | Refactor |
|---|---|---|
| `app/(auth)/entrar.tsx` | TextInput inline com `borderColor` calculado | `<Input fundoEscuro tipo="email" ... />` |
| `components/EditarPerfil.tsx` | TextInput com classes Tailwind | `<Input rotulo="Nome" ... />` |
| `components/SeletorEndereco.tsx` | 6 TextInputs sequenciais | `<Input>` empilhados com `gap: 12` |
| `app/checkout.tsx` (campo de troco) | TextInput estilizado inline | `<Input tipo="numero" rotulo="Troco para" />` |

---

## 3. `Card`

Container fundamental. Tem 2 variantes (claro/escuro) e o consumidor escolhe radius e padding via props.

### API

```tsx
interface CardProps {
  variante?: 'claro' | 'escuro' // default 'claro'
  raio?: 'md' | 'lg' | 'xl'      // default 'lg'
  preenchimento?: 'sm' | 'md' | 'lg' // 12 / 16 / 20 — default 'md'
  sombra?: 'none' | 'soft' | 'medium' | 'floating' // default 'soft' no claro, 'none' no escuro
  semBorda?: boolean              // default false; se true não desenha borda no claro
  estilo?: ViewStyle              // escape hatch
  children: React.ReactNode
}
```

### Comportamento

| Variante | Background | Borda padrão | Sombra padrão |
|---|---|---|---|
| `claro` | `colors.surface` | `colors.line` (1px) | `shadow.soft` |
| `escuro` | `colors.surfaceDark` | nenhuma | `shadow.none` |

### Implementação de referência

```tsx
import { View, ViewStyle } from 'react-native'
import { consumerDesign } from '@/lib/consumer-design'

const { colors, radius, shadow } = consumerDesign

const PAD = { sm: 12, md: 16, lg: 20 } as const
const RADIUS = { md: radius.md, lg: radius.lg, xl: radius.xl } as const

export function Card({
  variante = 'claro',
  raio = 'lg',
  preenchimento = 'md',
  sombra,
  semBorda = false,
  estilo,
  children,
}: CardProps) {
  const sombraResolvida = sombra ?? (variante === 'claro' ? 'soft' : 'none')

  return (
    <View
      style={[
        {
          backgroundColor: variante === 'claro' ? colors.surface : colors.surfaceDark,
          borderRadius: RADIUS[raio],
          padding: PAD[preenchimento],
          borderWidth: variante === 'claro' && !semBorda ? 1 : 0,
          borderColor: colors.line,
        },
        shadow[sombraResolvida],
        estilo,
      ]}
    >
      {children}
    </View>
  )
}
```

### Padrão de uso

```tsx
// Card claro padrão (lista de pedidos, lista de endereços)
<Card>
  <Text>...</Text>
</Card>

// Card escuro de destaque (pedido ativo no home, saldo)
<Card variante="escuro" raio="lg" preenchimento="lg">
  <Text style={{ color: colors.white }}>Pedido em rota</Text>
</Card>

// Card sem borda, com sombra média (banner de oferta no topo do home)
<Card semBorda sombra="medium" raio="xl">
  <Text>...</Text>
</Card>
```

---

## 4. `Badge`

Pill colorido para status, categorias e flags. Cor de fundo é sempre `softColor(corPrincipal)` (alpha 18%) e texto/ícone na cor principal.

### API

```tsx
interface BadgeProps {
  rotulo: string
  cor: string                       // hex sólido (vem dos tokens de status)
  icone?: ConsumerIconName
  tamanho?: 'sm' | 'md'             // default 'sm'
  preenchido?: boolean              // default false; se true, fundo sólido em vez de soft
}
```

### Comportamento

| `preenchido` | Background | Texto/Ícone |
|---|---|---|
| `false` (default) | `softColor(cor)` — alpha 18% | `cor` |
| `true` | `cor` | `colors.white` (ou `ink` se a cor for muito clara, decisão por contraste) |

### Tamanhos

| Tamanho | Altura | Padding lateral | Fonte | Ícone |
|---|---|---|---|---|
| `sm` | 22 | 8 | 11 (`micro`) | 12 |
| `md` | 28 | 12 | 12 (`label`) | 14 |

### Implementação de referência

```tsx
import { View, Text } from 'react-native'
import { consumerDesign, softColor } from '@/lib/consumer-design'
import { ConsumerIcon, ConsumerIconName } from '@/components/ConsumerIcon'

const { radius, colors } = consumerDesign

export function Badge({ rotulo, cor, icone, tamanho = 'sm', preenchido = false }: BadgeProps) {
  const fonte = tamanho === 'sm' ? 11 : 12
  const tracking = tamanho === 'sm' ? 1.2 : 0.5
  const altura = tamanho === 'sm' ? 22 : 28
  const padX = tamanho === 'sm' ? 8 : 12
  const tamIcone = tamanho === 'sm' ? 12 : 14
  const corTexto = preenchido ? colors.white : cor

  return (
    <View
      style={{
        height: altura,
        paddingHorizontal: padX,
        borderRadius: radius.pill,
        backgroundColor: preenchido ? cor : softColor(cor),
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
      }}
    >
      {icone && <ConsumerIcon name={icone} size={tamIcone} color={corTexto} strokeWidth={2.2} />}
      <Text
        style={{
          fontSize: fonte,
          fontWeight: '700',
          color: corTexto,
          letterSpacing: tracking,
          textTransform: 'uppercase',
        }}
      >
        {rotulo}
      </Text>
    </View>
  )
}
```

### Casos de uso

```tsx
// Status de pedido (vem de status-pedido.ts)
<Badge rotulo="Em preparo" cor={colors.warning} icone="chef" />

// Promoção em LojaCard
<Badge rotulo="Frete grátis" cor={colors.success} icone="truck" preenchido />

// Categoria sobre imagem (LojaCard, header)
<Badge rotulo="Hambúrguer" cor={colors.ink} preenchido />
```

---

## 5. `Chip`

Pill clicável e toggleável. Usado em filtros e categorias.

### API

```tsx
interface ChipProps {
  rotulo: string
  ativo: boolean
  aoTocar: () => void
  icone?: ConsumerIconName
  emoji?: string         // suporte temporário pro CategoriaChip atual ("🍔", "🛒")
  tamanho?: 'sm' | 'md'
}
```

### Comportamento

| Estado | Background | Texto | Borda |
|---|---|---|---|
| Inativo | `colors.surfaceMuted` | `colors.inkMuted` | nenhuma |
| Ativo | `colors.ink` | `colors.accent` | nenhuma |

### Implementação de referência

```tsx
import { TouchableOpacity, Text } from 'react-native'
import { consumerDesign } from '@/lib/consumer-design'
import { ConsumerIcon, ConsumerIconName } from '@/components/ConsumerIcon'

const { colors, radius } = consumerDesign

export function Chip({
  rotulo,
  ativo,
  aoTocar,
  icone,
  emoji,
  tamanho = 'md',
}: ChipProps) {
  const altura = tamanho === 'sm' ? 32 : 40
  const padX = tamanho === 'sm' ? 12 : 16
  const fonte = tamanho === 'sm' ? 13 : 14
  const cor = ativo ? colors.accent : colors.inkMuted

  return (
    <TouchableOpacity
      onPress={aoTocar}
      activeOpacity={0.75}
      style={{
        height: altura,
        paddingHorizontal: padX,
        borderRadius: radius.pill,
        backgroundColor: ativo ? colors.ink : colors.surfaceMuted,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {emoji && <Text style={{ fontSize: fonte }}>{emoji}</Text>}
      {icone && <ConsumerIcon name={icone} size={14} color={cor} strokeWidth={2.1} />}
      <Text style={{ fontSize: fonte, fontWeight: ativo ? '700' : '600', color: cor }}>
        {rotulo}
      </Text>
    </TouchableOpacity>
  )
}
```

### Casos de uso

| Tela | Uso |
|---|---|
| Home | linha horizontal de chips de categoria (`CategoriaChip` antigo vira `Chip`) |
| Pedidos | filtros "Todos / Ativos / Histórico" |
| Loja | filtro de categorias internas |

> Após este refactor, **`components/CategoriaChip.tsx` é deletado**. Substituído por `<Chip>` direto nos consumidores.

---

## 6. `Skeleton`

Placeholder pulsante. Refactor do componente atual pra usar tokens.

### API

```tsx
interface SkeletonProps {
  largura: number | `${number}%`
  altura: number
  raio?: number      // default 14 (radius.sm)
}
```

### Implementação (refactor)

```tsx
import { useEffect, useRef } from 'react'
import { Animated } from 'react-native'
import { consumerDesign } from '@/lib/consumer-design'

const { colors, motion } = consumerDesign

export function Skeleton({ largura, altura, raio = 14 }: SkeletonProps) {
  const opacidade = useRef(new Animated.Value(0.5)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacidade, { toValue: 1, duration: motion.pulse / 2, useNativeDriver: true }),
        Animated.timing(opacidade, { toValue: 0.5, duration: motion.pulse / 2, useNativeDriver: true }),
      ])
    ).start()
  }, [opacidade])

  return (
    <Animated.View
      style={{
        width: largura,
        height: altura,
        borderRadius: raio,
        backgroundColor: colors.canvasAlt,
        opacity: opacidade,
      }}
    />
  )
}
```

### Diferenças vs hoje
- `'#E5E7EB'` hardcoded → `colors.canvasAlt` (`#E7E7EA`).
- `arredondado: boolean` (apenas pill) → `raio: number` (qualquer valor).
- Ciclo 800/800ms → 650/650ms (tokens `motion.pulse`), idêntico ao courier.

### Padrão de composição

Não há `<SkeletonCard>` separado. A tela compõe usando `<Skeleton>` simples:

```tsx
<View style={{ gap: 12 }}>
  <Skeleton largura="100%" altura={140} raio={28} />
  <Skeleton largura="60%" altura={18} />
  <Skeleton largura="40%" altura={14} />
</View>
```

---

## 7. `EmptyState`

Estado vazio. Sempre tem ícone + título + descrição. CTA é opcional.

### API

```tsx
interface EmptyStateProps {
  icone: ConsumerIconName
  titulo: string
  descricao?: string
  acao?: {
    label: string
    aoTocar: () => void
    variante?: BotaoProps['variante'] // default 'primario'
  }
  variante?: 'claro' | 'escuro' // default 'claro' — afeta cores do círculo e texto
}
```

### Visual

```
        ┌────────────┐
        │            │
        │  [ícone]   │   ← círculo 80px, accentSoft, ícone accent strokeWidth 1.6
        │            │
        └────────────┘

           Título           ← h2 (22, 800, ink)
       Descrição curta      ← body (14, 500, inkMuted, max 2 linhas, text-center)

         [  CTA  ]          ← Botao opcional, variante primario, tamanho md
```

### Implementação de referência

```tsx
import { View, Text } from 'react-native'
import { consumerDesign } from '@/lib/consumer-design'
import { ConsumerIcon, ConsumerIconName } from '@/components/ConsumerIcon'
import { Botao } from './Botao'

const { colors, radius } = consumerDesign

export function EmptyState({
  icone,
  titulo,
  descricao,
  acao,
  variante = 'claro',
}: EmptyStateProps) {
  const corTitulo = variante === 'claro' ? colors.ink : colors.white
  const corDescricao = variante === 'claro' ? colors.inkMuted : colors.inkSoft

  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingVertical: 48, gap: 16 }}>
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: radius.pill,
          backgroundColor: colors.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ConsumerIcon name={icone} size={36} color={colors.accent} strokeWidth={1.6} />
      </View>

      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: corTitulo, letterSpacing: -0.3, textAlign: 'center' }}>
          {titulo}
        </Text>
        {descricao && (
          <Text style={{ fontSize: 14, fontWeight: '500', color: corDescricao, textAlign: 'center', lineHeight: 20 }}>
            {descricao}
          </Text>
        )}
      </View>

      {acao && (
        <View style={{ marginTop: 8, alignSelf: 'stretch', maxWidth: 280 }}>
          <Botao
            label={acao.label}
            onPress={acao.aoTocar}
            variante={acao.variante ?? 'primario'}
            tamanho="md"
          />
        </View>
      )}
    </View>
  )
}
```

### Casos de uso

| Tela | Uso |
|---|---|
| Pedidos (filtro "Histórico" sem nada) | `<EmptyState icone="package" titulo="Sem pedidos por aqui" descricao="Quando você fizer seu primeiro pedido, ele aparece aqui." acao={{ label: 'Explorar lojas', aoTocar: () => router.push('/(tabs)') }} />` |
| Buscar (sem resultado) | `<EmptyState icone="search" titulo="Nada encontrado" descricao="Tente buscar por outra loja, produto ou categoria." />` |
| Endereços (lista vazia) | `<EmptyState icone="pin" titulo="Nenhum endereço salvo" descricao="Adicione um endereço para receber pedidos." acao={{ label: 'Adicionar endereço', aoTocar: ... }} />` |
| Notificações (lista vazia) | `<EmptyState icone="bell" titulo="Sem novidades" descricao="Você verá aqui novidades sobre seus pedidos e promoções." />` |

---

## 8. `LoadingState`

Spinner com 2 modos: `tela` (full screen, centralizado) e `bloco` (inline em altura definida).

### API

```tsx
interface LoadingStateProps {
  modo?: 'tela' | 'bloco'   // default 'bloco'
  mensagem?: string
  variante?: 'claro' | 'escuro' // default 'claro'
  altura?: number           // só usado em modo 'bloco'; default 200
}
```

### Implementação de referência

```tsx
import { View, Text, ActivityIndicator } from 'react-native'
import { consumerDesign } from '@/lib/consumer-design'

const { colors } = consumerDesign

export function LoadingState({
  modo = 'bloco',
  mensagem,
  variante = 'claro',
  altura = 200,
}: LoadingStateProps) {
  const corFundo = variante === 'claro' ? colors.canvas : colors.surfaceDark
  const corSpinner = variante === 'claro' ? colors.ink : colors.accent
  const corMensagem = variante === 'claro' ? colors.inkMuted : colors.inkSoft

  return (
    <View
      style={{
        flex: modo === 'tela' ? 1 : undefined,
        height: modo === 'tela' ? undefined : altura,
        backgroundColor: corFundo,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
      }}
    >
      <ActivityIndicator size="large" color={corSpinner} />
      {mensagem && (
        <Text style={{ fontSize: 14, fontWeight: '500', color: corMensagem }}>
          {mensagem}
        </Text>
      )}
    </View>
  )
}
```

### Casos de uso

| Onde | Uso |
|---|---|
| Tela carregando inicial (pedidos, perfil) | `<LoadingState modo="tela" mensagem="Carregando..." />` |
| Lista lazy loading | `<LoadingState altura={120} />` |
| Checkout processando pagamento | `<LoadingState modo="tela" variante="escuro" mensagem="Processando pagamento" />` |

> O Lottie de splash (`SplashAnimado.tsx`) **não é substituído** — segue como tela de splash da app, que é diferente de loading. Ver [`05-shell-app.md`](./05-shell-app.md).

---

## Tabela cruzada — qual primitivo usar onde

| Padrão visual hoje | Primitivo |
|---|---|
| Botão verde de finalizar | `Botao variante="primario"` |
| Botão sair vermelho | `Botao variante="danger"` |
| TextInput de email no auth | `Input fundoEscuro tipo="email"` |
| TextInput de nome no perfil | `Input rotulo="Nome"` |
| TextArea de observações no checkout | `Input multilinha rotulo="Observações"` |
| `View` branco com radius 16 e shadow | `Card` |
| `View` cinza-claro arredondado para skeleton | `Skeleton` |
| Chip "Frete grátis" verde sobre imagem | `Badge cor={colors.success} preenchido` |
| Tab "Todos / Ativos / Histórico" | `Chip ativo={...}` |
| Mensagem "Nenhum pedido" centralizada | `EmptyState` |
| `<ActivityIndicator />` no centro | `LoadingState modo="tela"` |

## Critério de aceite (Fase 2)

- [ ] `apps/mobile-consumer/components/ui/{Botao,Input,Card,Badge,Chip,Skeleton,EmptyState,LoadingState}.tsx` existem.
- [ ] APIs em PT-BR conforme spec deste doc.
- [ ] Nenhum hex literal nos arquivos (exceto onde inevitável — comentar o motivo).
- [ ] Imports `from 'lucide-react-native'` ausentes nos 8 arquivos.
- [ ] `pnpm --filter mobile-consumer typecheck` passa.
- [ ] `components/Botao.tsx` antigo deletado (substituído por `components/ui/Botao.tsx`).
- [ ] `components/Skeleton.tsx` antigo deletado (substituído por `components/ui/Skeleton.tsx`).
- [ ] `components/CategoriaChip.tsx` ainda **não** é deletado nesta fase — só na Fase 4 (Home), quando Home/Loja consumirem `Chip` direto.
- [ ] Smoke check: importar cada primitivo numa tela de teste e renderizar 2 variantes valida visualmente.

## Próximos passos

- [`04-componentes-dominio.md`](./04-componentes-dominio.md) consome estes primitivos pra construir LojaCard, ProdutoCard, PedidoCard, etc.
- [`06-status-pedido.md`](./06-status-pedido.md) é o módulo que vai abastecer `<Badge>` em PedidoCard e na timeline.
