# 05 — Componentes e Padrões Compartilhados

*Versão 1.0 — 09/05/2026*

Padrões aplicáveis a todas as páginas redesenhadas. Inclui contratos
de props para criar/refatorar.

---

## 5.1 Header de Página (`<PageHeader />`)

Toda página interna passa a usar:

```tsx
// components/dashboard/page-header.tsx
interface PageHeaderProps {
  titulo: string
  subtitulo?: string
  acoes?: React.ReactNode      // botões à direita
  abas?: { id: string; label: string; href: string; badge?: number }[]
  abaAtiva?: string
  badgeCabecalho?: { texto: string; cor: 'ok'|'warn'|'err'|'info' }
}
```

Layout:
```
┌─────────────────────────────────────────────────────────┐
│  Título (font-display, 28-32px)         [ações]        │
│  Subtítulo (text-ink-3, 13px)                          │
│  [Aba 1] [Aba 2] [Aba 3]   ← se abas ≠ vazio           │
└─────────────────────────────────────────────────────────┘
```

Substitui as marcações inline atuais nas páginas
(`<h1 className="font-display text-[32px]...">`).

---

## 5.2 Sidebar (`<SidebarDashboard />`)

Refator do componente atual para suportar **grupos** e **subitens
expansíveis** (Catálogo).

```tsx
type NavGroup = {
  label: string                  // "OPERAR", "ANALISAR", ...
  items: NavItem[]
}

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  badge?: number | (() => number)   // count() pode ser reativo via realtime
  subitems?: { href: string; label: string }[]
}
```

Mudanças:
- Remoção do bloco "Próximo evento" (estático).
- Botão "Sair" no grupo `CONTA`.
- Indicador de versão no rodapé (`v0.x.y` lido de `package.json`).
- Estado expandido/colapsado de grupo persistido em `localStorage`
  por usuário.

---

## 5.3 Command Palette (`⌘K`)

```tsx
// components/dashboard/command-palette.tsx
type Command = {
  id: string
  titulo: string
  hint?: string
  group: 'Navegação'|'Ações'|'Pedidos'|'Produtos'|'Clientes'
  href?: string
  acao?: () => void | Promise<void>
}
```

Comandos do MVP:
- Navegação para todas as rotas do menu.
- Ações: "Pausar loja", "Reativar loja", "Imprimir comanda do
  pedido…", "Marcar pedido como pronto".
- Busca de pedido por número (debounce 200ms).
- Busca de produto por nome.
- Busca de cliente por telefone/nome.

Implementação base com [`cmdk`](https://github.com/pacocoursey/cmdk) ou
componente custom.

---

## 5.4 Empty State (`<EmptyState />`)

```tsx
interface EmptyStateProps {
  icone: LucideIcon
  titulo: string
  descricao?: string
  cta?: { label: string; href?: string; onClick?: () => void }
  cta2?: { label: string; href?: string; onClick?: () => void }
}
```

Aplicar em todas as listas vazias (Pedidos sem nada, Entregadores sem
ninguém, Avaliações zeradas, Mensagens sem conversa, etc.).

---

## 5.5 KPI Card (`<KPI />`)

Já existe (`components/ui/kpi.tsx`). Estender para suportar:
- `comparativo` (Δ % vs período anterior).
- `loading` (skeleton).
- `tooltipExplicacao` em hover do label.

```tsx
interface KPIProps {
  label: string
  value: string
  prefix?: string
  suffix?: string
  icon: LucideIcon
  spark?: number[]
  color?: string
  comparativo?: { delta: number; sentido: 'sobe'|'desce' }
  loading?: boolean
  tooltipExplicacao?: string
}
```

---

## 5.6 Filtros de Período (`<SeletorPeriodo />`)

```tsx
type Periodo = 'hoje' | '7d' | '30d' | 'mes_atual' | '12m' | { de: string; ate: string }

interface SeletorPeriodoProps {
  valor: Periodo
  onChange: (p: Periodo) => void   // seta searchParams
  permitidos?: Periodo[]
  permitirComparar?: boolean
}
```

Sempre vai em `searchParams` para deeplink. Convenção:
`?periodo=30d` ou `?de=2026-04-01&ate=2026-04-30`.

---

## 5.7 Toast e Confirmação

- Toast: usar **um único provider** no layout (`sonner` ou shadcn
  toast).
- Confirmação destrutiva: componente `<ConfirmDialog />` com
  `tipo: 'destrutiva'|'normal'` e título obrigatório.
- Toda Server Action que altera dado relevante retorna
  `{ sucesso: true } | { erro: string }` — o componente decide se
  mostra toast verde ou vermelho.

---

## 5.8 Tabelas (lista densa)

Padrão para listas de Pedidos, Produtos, Avaliações, Entregadores:

```
┌───────────────────────────────────────────────────────────┐
│ [✓] Coluna1  Coluna2  ...                  [Ações em massa] │
├───────────────────────────────────────────────────────────┤
│ [✓] linha 1                                               │
│     ↳ ações inline (hover): editar · ver · ...            │
└───────────────────────────────────────────────────────────┘
```

Características:
- Linhas com `hover:bg-bg-2`.
- Click na linha abre detalhe lateral (`?abrir=…`).
- Ações em massa só aparecem quando há seleção.
- Paginação por cursor server-side quando > 50 itens.

---

## 5.9 Banner de Status Global

Componente unificado de banners de status:

```tsx
type BannerStatus = {
  id: 'assinatura_atraso'|'manutencao'|'avaliacao_baixa'|'estoque_critico'
  severidade: 'info'|'aviso'|'erro'
  titulo: string
  descricao?: string
  cta?: { label: string; href: string }
  dispensavel?: boolean
}
```

Layout no topo do `<main>`. Exibe **no máximo 2** banners empilhados
(prioridade: erro > aviso > info).

---

## 5.10 Realtime — convenção de hooks

```tsx
// components/dashboard/hooks/use-realtime-count.ts
function useRealtimeCount<T>(opts: {
  table: 'orders' | 'messages' | 'store_reviews'
  filter: string                       // ex.: "tenant_id=eq.{id}&status=eq.novo"
  initialCount: number
}): number
```

A sidebar e os badges de pedidos/mensagens consomem este hook.

---

## 5.11 Tokens visuais

Mantém os tokens existentes em `globals.css`. Padronização adicional:

| Token | Uso |
|-------|-----|
| `var(--brick)` | CTA primário, item ativo na sidebar. |
| `var(--ok)` | Sucesso, status "ativo". |
| `var(--warn)` | Aviso, atenção, em atraso. |
| `var(--err)` | Erro, ação destrutiva. |
| `var(--leaf)` | KPIs positivos (verde). |
| `var(--mustard)` | KPI estrela / qualidade. |
| `var(--sky)` | KPI ticket médio / neutro azul. |

Espaçamento em containers de página: `p-9` (mantém atual). Cards:
`p-5 rounded-xl border border-line bg-bg`. Border-radius pesado
(`rounded-2xl`) só para cards de identidade visual em `/minha-loja`.

---

## 5.12 Acessibilidade dos componentes

- Todo botão sem texto (ícone-só) tem `aria-label`.
- Toggle de status da loja: `role="switch"` + `aria-checked`.
- Tabs (config, minha-conta, relatorios): `role="tablist"`,
  `role="tab"`, `aria-selected`.
- Modal de pedido: `role="dialog"` + `aria-modal=true` + foco preso.
- Toda lista navegável via teclado com `tab` + `enter`.
- Cores devem manter contraste AA (verificar especialmente texto sobre
  `var(--bg-3)`).

Detalhamento em `07-acessibilidade-responsividade.md`.

---

## 5.13 Como migrar componentes atuais

| Atual | Refatorar para |
|-------|----------------|
| `configuracoes-abas.tsx` (não usado), `configuracoes-abas-loja.tsx`, `configuracoes-abas-conta.tsx` | uma única abstração `<Abas />` que aceita `defs[]` e `searchParam`. |
| `home-header.tsx` | virar caso particular do `<PageHeader />`. |
| `setup-wizard.tsx` | continua, mas componente "saúde da loja" reutiliza partes. |
| Banner inline no `layout.tsx` | sair para `<BannerStatus />`. |
| Toggle de status em `aba-geral.tsx` | virar `<StoreStatusToggle />` no header de `/minha-loja`. |

Nada é apagado de uma vez — fase de transição mantém componentes
antigos como deprecated (vide `08-roadmap-implementacao.md`).
