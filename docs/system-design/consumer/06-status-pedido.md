# 06 — Status de pedido (single source of truth)

> Hoje os 7 status do pedido vivem em **dois** arquivos com **duas** definições divergentes (cor, label, descrição). Esta dor é eliminada com `lib/status-pedido.ts` — um único módulo que toda tela consome.

## 1. O problema atual

| status | `app/(tabs)/pedidos.tsx` | `app/pedido/[id].tsx` | Cor (hoje) |
|---|---|---|---|
| novo | "Aguardando confirmação" | "Pedido recebido" | `#D4A04A` |
| confirmado | "Confirmado" | "Pedido confirmado" | `#5B8DEF` |
| em_preparo | "Em preparo" | "Em preparo" | `#9B6BDF` |
| aguardando_entregador | "Aguardando entregador" | "Aguardando entregador" | `#F97316` |
| saiu_para_entrega | "Saindo para entrega" | "Saiu para entrega" | `#0BA5C3` |
| entregue | "Entregue" | "Entregue" | `#287D5C` |
| cancelado | "Cancelado" | "Cancelado" | `#C75B3A` |

E ainda:
- `pedidos.tsx` tem `PROGRESSO_STATUS` (mapa de progresso 0-1) — `pedido/[id].tsx` calcula com `ORDEM_STATUS` separada.
- `pedidos.tsx` tem helper `iconeStatus(status)` com 5 ícones do lucide — `pedido/[id].tsx` redesenha sua própria timeline com os mesmos ícones.
- Nenhum dos dois usa tokens.

## 2. A solução

Um módulo `apps/mobile-consumer/lib/status-pedido.ts` que centraliza:

1. Tipo TypeScript `StatusPedido` (literal union dos 7 valores).
2. Metadados de cada status (cor, label curto, label longo, descrição, ícone, progresso, ordem).
3. Helpers (`metaDoStatus`, `progressoDoStatus`, `proximosStatus`, `ehAtivo`, `ehFinalizado`).

Tudo derivado dos tokens de `consumer-design.ts`. **Zero hex literal.**

## 3. Mapeamento alvo

Os labels e cores convergem para **uma** versão canônica:

| status | Cor (token) | Label curto | Label longo | Descrição | Ícone | Progresso | Ordem |
|---|---|---|---|---|---|---|---|
| `novo` | `colors.warning` `#F2B84B` | "Novo" | "Aguardando confirmação" | "A loja está revisando seu pedido." | `clock` | 0.10 | 0 |
| `confirmado` | `colors.info` `#5BB7FF` | "Confirmado" | "Pedido confirmado" | "A loja confirmou seu pedido." | `check-circle` | 0.28 | 1 |
| `em_preparo` | `colors.warning` `#F2B84B` | "Em preparo" | "Em preparo" | "Seu pedido está sendo preparado." | `chef` | 0.52 | 2 |
| `aguardando_entregador` | `colors.warning` `#F2B84B` | "Aguardando" | "Aguardando entregador" | "Procurando um entregador disponível." | `bike` | 0.72 | 3 |
| `saiu_para_entrega` | `colors.info` `#5BB7FF` | "A caminho" | "Saiu para entrega" | "Seu pedido está a caminho." | `truck` | 0.88 | 4 |
| `entregue` | `colors.success` `#8ED14F` | "Entregue" | "Entregue" | "Pedido entregue. Bom apetite!" | `check-circle` | 1.00 | 5 |
| `cancelado` | `colors.danger` `#FF6D5E` | "Cancelado" | "Cancelado" | "Seu pedido foi cancelado." | `close-circle` | 0.00 | -1 |

### Decisões e justificativas

1. **Apenas 4 cores semânticas** (`warning`, `info`, `success`, `danger`) em vez de 7 cores únicas. Razão: cor demais polui. O usuário não precisa diferenciar visualmente "novo" de "em_preparo" — os ícones já fazem isso. A cor codifica o **tipo** do estado (em andamento normal vs. positivo vs. negativo), não cada step.
2. **Label curto vs longo**: `pedidos.tsx` usa label curto em badge, `pedido/[id].tsx` usa label longo no header da timeline. Ambos são úteis, ambos vivem no módulo.
3. **Descrição** é o subtítulo da timeline em `pedido/[id].tsx`. Hoje está num mapa separado; vai junto.
4. **Ordem**: `cancelado = -1` é convenção que diz "fora do fluxo". Helpers ignoram esse caso.
5. **`info` é cor nova** (não existia no courier). Documentada em [`01-tokens.md` §2](./01-tokens.md). Permite distinguir visualmente "confirmado" e "saiu para entrega" do amarelo de "em_preparo" sem inventar 4 hexes diferentes.

## 4. Conteúdo do arquivo

```ts
// apps/mobile-consumer/lib/status-pedido.ts
import { consumerDesign } from './consumer-design'
import type { ConsumerIconName } from '../components/ConsumerIcon'

const { colors } = consumerDesign

export type StatusPedido =
  | 'novo'
  | 'confirmado'
  | 'em_preparo'
  | 'aguardando_entregador'
  | 'saiu_para_entrega'
  | 'entregue'
  | 'cancelado'

export interface MetaStatus {
  status: StatusPedido
  cor: string
  rotuloCurto: string
  rotuloLongo: string
  descricao: string
  icone: ConsumerIconName
  progresso: number   // 0-1, usado em barras de progresso e ordenação visual
  ordem: number       // posição no fluxo positivo; -1 = fora do fluxo (cancelado)
}

export const META_STATUS: Record<StatusPedido, MetaStatus> = {
  novo: {
    status: 'novo',
    cor: colors.warning,
    rotuloCurto: 'Novo',
    rotuloLongo: 'Aguardando confirmação',
    descricao: 'A loja está revisando seu pedido.',
    icone: 'clock',
    progresso: 0.10,
    ordem: 0,
  },
  confirmado: {
    status: 'confirmado',
    cor: colors.info,
    rotuloCurto: 'Confirmado',
    rotuloLongo: 'Pedido confirmado',
    descricao: 'A loja confirmou seu pedido.',
    icone: 'check-circle',
    progresso: 0.28,
    ordem: 1,
  },
  em_preparo: {
    status: 'em_preparo',
    cor: colors.warning,
    rotuloCurto: 'Em preparo',
    rotuloLongo: 'Em preparo',
    descricao: 'Seu pedido está sendo preparado.',
    icone: 'chef',
    progresso: 0.52,
    ordem: 2,
  },
  aguardando_entregador: {
    status: 'aguardando_entregador',
    cor: colors.warning,
    rotuloCurto: 'Aguardando',
    rotuloLongo: 'Aguardando entregador',
    descricao: 'Procurando um entregador disponível.',
    icone: 'bike',
    progresso: 0.72,
    ordem: 3,
  },
  saiu_para_entrega: {
    status: 'saiu_para_entrega',
    cor: colors.info,
    rotuloCurto: 'A caminho',
    rotuloLongo: 'Saiu para entrega',
    descricao: 'Seu pedido está a caminho.',
    icone: 'truck',
    progresso: 0.88,
    ordem: 4,
  },
  entregue: {
    status: 'entregue',
    cor: colors.success,
    rotuloCurto: 'Entregue',
    rotuloLongo: 'Entregue',
    descricao: 'Pedido entregue. Bom apetite!',
    icone: 'check-circle',
    progresso: 1.0,
    ordem: 5,
  },
  cancelado: {
    status: 'cancelado',
    cor: colors.danger,
    rotuloCurto: 'Cancelado',
    rotuloLongo: 'Cancelado',
    descricao: 'Seu pedido foi cancelado.',
    icone: 'close-circle',
    progresso: 0,
    ordem: -1,
  },
}

/** Sequência canônica de status no fluxo positivo (sem cancelado). Usado pra timeline. */
export const ORDEM_FLUXO: StatusPedido[] = [
  'novo',
  'confirmado',
  'em_preparo',
  'aguardando_entregador',
  'saiu_para_entrega',
  'entregue',
]

/** Lookup defensivo. Aceita string e cai num fallback se não bater. */
export function metaDoStatus(status: string): MetaStatus {
  return META_STATUS[status as StatusPedido] ?? META_STATUS.novo
}

/** Conveniência. */
export function progressoDoStatus(status: string): number {
  return metaDoStatus(status).progresso
}

/** Pedido está em curso (não foi concluído nem cancelado). */
export function ehAtivo(status: string): boolean {
  return status !== 'entregue' && status !== 'cancelado'
}

/** Pedido finalizou (positivo ou negativo). */
export function ehFinalizado(status: string): boolean {
  return status === 'entregue' || status === 'cancelado'
}

/** Lista de status até o atual, marcando concluídos vs pendente — usado na timeline. */
export function timelineDoStatus(statusAtual: string): Array<{
  meta: MetaStatus
  estado: 'concluido' | 'atual' | 'pendente'
}> {
  const atual = metaDoStatus(statusAtual)

  if (statusAtual === 'cancelado') {
    return [{ meta: atual, estado: 'atual' }]
  }

  return ORDEM_FLUXO.map((s) => {
    const meta = META_STATUS[s]
    if (meta.ordem < atual.ordem) return { meta, estado: 'concluido' as const }
    if (meta.ordem === atual.ordem) return { meta, estado: 'atual' as const }
    return { meta, estado: 'pendente' as const }
  })
}
```

## 5. Como cada tela consome

### `app/(tabs)/pedidos.tsx`

**Antes** (resumido):
```tsx
const LABELS_STATUS = { novo: 'Aguardando confirmação', ... }
const CORES_STATUS = { novo: '#D4A04A', ... }
const PROGRESSO_STATUS = { novo: 0.1, ... }

const cor = CORES_STATUS[item.status] ?? '#8A8A7E'
// ...
<View style={{ backgroundColor: `${cor}14` }}>
  <Clock size={15} color={cor} />
  <Text style={{ color: cor }}>{LABELS_STATUS[item.status]}</Text>
</View>
```

**Depois**:
```tsx
import { metaDoStatus, progressoDoStatus } from '@/lib/status-pedido'
import { Badge } from '@/components/ui/Badge'

const meta = metaDoStatus(item.status)
const progresso = progressoDoStatus(item.status)
// ...
<Badge rotulo={meta.rotuloCurto} cor={meta.cor} icone={meta.icone} />
```

A barra de progresso fica uma linha:
```tsx
<View style={{ height: 4, borderRadius: 2, backgroundColor: colors.canvasAlt, overflow: 'hidden' }}>
  <View style={{ height: 4, width: `${progresso * 100}%`, backgroundColor: meta.cor }} />
</View>
```

### `app/pedido/[id].tsx`

**Antes**:
```tsx
const LABELS_STATUS = { novo: 'Pedido recebido', ... }
const DESCRICAO_STATUS = { novo: 'Aguardando confirmação...', ... }
const ORDEM_STATUS = ['novo', 'confirmado', ...]

// Header
<Text>{LABELS_STATUS[statusAtual]}</Text>

// Timeline
{ORDEM_STATUS.map((status) => {
  const ativo = ORDEM_STATUS.indexOf(statusAtual) >= ORDEM_STATUS.indexOf(status)
  // ...
})}
```

**Depois**:
```tsx
import { metaDoStatus, timelineDoStatus } from '@/lib/status-pedido'

const meta = metaDoStatus(statusAtual)
const passos = timelineDoStatus(statusAtual)

// Header
<Text>{meta.rotuloLongo}</Text>
<Text>{meta.descricao}</Text>

// Timeline
{passos.map(({ meta: m, estado }) => (
  <PassoTimeline key={m.status} meta={m} estado={estado} />
))}
```

`PassoTimeline` é interno à tela (não reutilizado) — recebe `meta` e `estado` e desenha. Estilos:

| `estado` | Círculo | Linha | Texto |
|---|---|---|---|
| `concluido` | `colors.accent`, ícone `check` | `colors.accent` | `colors.ink`, weight 600 |
| `atual` | `meta.cor`, ícone `meta.icone`, **com pulse animation** | `colors.line` | `colors.ink`, weight 800 |
| `pendente` | `colors.canvasAlt`, ícone `meta.icone` color `inkSoft` | `colors.line` | `colors.inkSoft`, weight 500 |

### `app/(tabs)/index.tsx` — banner de pedido ativo

Hoje a home tem um "banner de pedido ativo" que pega o status do `useOrderStore`. Refactor:

```tsx
import { metaDoStatus, ehAtivo } from '@/lib/status-pedido'

const { pedidoAtivoId, statusAtual } = useOrderStore()

if (pedidoAtivoId && ehAtivo(statusAtual)) {
  const meta = metaDoStatus(statusAtual)
  return (
    <Card variante="escuro" raio="lg" preenchimento="lg">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{
          width: 44, height: 44, borderRadius: 22,
          backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center',
        }}>
          <ConsumerIcon name={meta.icone} size={20} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.inkSoft, letterSpacing: 1.2, textTransform: 'uppercase' }}>
            Pedido em andamento
          </Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.white, marginTop: 2 }}>
            {meta.rotuloLongo}
          </Text>
        </View>
        <ConsumerIcon name="chevron-right" size={20} color={colors.inkSoft} />
      </View>
    </Card>
  )
}
```

## 6. Regras de uso

1. **Nunca declare `LABELS_STATUS`, `CORES_STATUS`, `PROGRESSO_STATUS`, `DESCRICAO_STATUS`, `ORDEM_STATUS` em qualquer outro lugar.** Se está fazendo isso, está errado — abrir issue / corrigir antes de mergear.
2. **Nunca compare status contra strings literais** se a mesma checagem couber em `ehAtivo()`/`ehFinalizado()`. Ex.: `!['entregue', 'cancelado'].includes(p.status)` vira `ehAtivo(p.status)`.
3. **Use `metaDoStatus(status)` em vez de `META_STATUS[status]` direto.** O helper já faz fallback defensivo se vier um status inesperado da API.
4. **Não importe `consumerDesign.colors` na tela só pra pegar a cor de um status.** A cor já vem em `meta.cor`.

## 7. Migração — passo a passo

### PR único da Fase 2
1. Criar `apps/mobile-consumer/lib/status-pedido.ts` com o conteúdo da §4.
2. Refatorar `app/(tabs)/pedidos.tsx`:
   - Apagar os 3 mapas locais (`LABELS_STATUS`, `CORES_STATUS`, `PROGRESSO_STATUS`).
   - Apagar a função `iconeStatus`.
   - Trocar import de lucide por `ConsumerIcon`.
   - Trocar badge inline por `<Badge>`.
   - Trocar barra de progresso pela versão de §5.
3. Refatorar `app/pedido/[id].tsx`:
   - Apagar `LABELS_STATUS`, `DESCRICAO_STATUS`, `ORDEM_STATUS` locais.
   - Trocar timeline pela versão de §5 (com `timelineDoStatus`).
   - Trocar header pelo `meta.rotuloLongo` + `meta.descricao`.
4. Refatorar banner de pedido ativo em `app/(tabs)/index.tsx`.
5. Refatorar `MapaEntregador.tsx` se ele referencia cor de status (usa apenas accent/ink — sem mudança aqui).

### Não nesta fase
- Telas que ainda não consomem status (perfil, loja, etc.) — sem ação.
- Mudar nomes de status na DB ou em queries Supabase — sem ação.

## 8. Critério de aceite (Fase 2, parte status-pedido)

- [ ] `apps/mobile-consumer/lib/status-pedido.ts` existe e exporta tudo de §4.
- [ ] `pedidos.tsx` e `pedido/[id].tsx` consomem `metaDoStatus()` / `timelineDoStatus()` em vez de mapas locais.
- [ ] `grep -nE "(LABELS_STATUS|CORES_STATUS|PROGRESSO_STATUS|DESCRICAO_STATUS|ORDEM_STATUS)" apps/mobile-consumer/` retorna apenas matches em `lib/status-pedido.ts`.
- [ ] Nenhum hex literal de cor de status nas telas refatoradas.
- [ ] Banner de pedido ativo no home consome `meta.rotuloLongo`, `meta.icone`, `meta.cor` do módulo.
- [ ] `pnpm --filter mobile-consumer typecheck` passa.

## 9. Evolução futura

Se aparecer um novo status (ex.: `pronto_para_retirada` em fluxos sem entrega):

1. Adicionar a literal em `StatusPedido`.
2. Adicionar a entrada em `META_STATUS`.
3. Decidir se entra em `ORDEM_FLUXO` (e onde).
4. Verificar `progresso` para manter a curva monotônica.
5. Nada mais. Telas pegam de graça.
