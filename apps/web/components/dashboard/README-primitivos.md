# Primitivos de UI do Dashboard

Componentes compartilhados do painel. Desde out/2026 o painel fala a língua
do app do lojista e da landing (marquise + folha): tokens em
`app/globals.css`, peças da fachada em `marquise.tsx` (Sobrelinha,
Statement, PlacaVidro, CartaoVidro, MoedaVidro, PontoAoVivo, BarraProgresso),
peças do salão em `folha.tsx` (Folha, SecaoFolha, CartaoFolha) e os ícones
da casa em `components/ui/partner-icon.tsx` (nomes, não componentes).

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
;<Abas searchParam="aba" defs={[{ id: 'geral', label: 'Geral', content: <AbaGeral /> }]} />
```

## EmptyState

```tsx
import { EmptyState } from '@/components/dashboard/empty-state'
;<EmptyState icone="inbox" titulo="Sem pedidos hoje" cta={{ label: 'Compartilhar loja', href: '/minha-loja' }} />
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
