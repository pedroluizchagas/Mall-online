# Primitivos de UI do Dashboard

Componentes compartilhados criados na Fase 1, PR 1
(`docs/dashboard-redesign/05-componentes-e-padroes.md`). Adoção pelas
páginas existentes virá nos PRs seguintes.

## PageHeader

```tsx
import { PageHeader } from '@/components/dashboard/page-header'
;<PageHeader
  titulo="Pedidos"
  subtitulo="Acompanhe e gerencie em tempo real."
  badgeCabecalho={{ texto: 'Loja aberta', cor: 'ok' }}
  acoes={<button>Imprimir</button>}
  abas={[{ id: 'novos', label: 'Novos', href: '?aba=novos', badge: 3 }]}
  abaAtiva="novos"
/>
```

## Abas

```tsx
import { Abas } from '@/components/dashboard/abas'
;<Abas searchParam="aba" defs={[{ id: 'geral', label: 'Geral', render: () => <AbaGeral /> }]} />
```

## EmptyState

```tsx
import { Inbox } from 'lucide-react'
import { EmptyState } from '@/components/dashboard/empty-state'
;<EmptyState icone={Inbox} titulo="Sem pedidos hoje" cta={{ label: 'Compartilhar loja', href: '/minha-loja' }} />
```

## BannerStatus

Renderiza no máximo 2 itens (prioridade `erro` > `aviso` > `info`).
Itens `dispensavel: true` salvam estado em `localStorage`.

```tsx
import { BannerStatus } from '@/components/dashboard/banner-status'
;<BannerStatus itens={[{ id: 'estoque_critico', severidade: 'aviso', titulo: '3 produtos críticos', cta: { label: 'Ver', href: '/estoque' }, dispensavel: true }]} />
```

## Toaster + showToast

`<Toaster />` já está montado no layout do dashboard. Default: 4s
sucesso/info, 6s erro.

```tsx
'use client'
import { showToast } from '@/components/ui/toast'
showToast({ tipo: 'sucesso', titulo: 'Alterações salvas' })
```
