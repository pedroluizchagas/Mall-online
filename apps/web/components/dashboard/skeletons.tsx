import { Skeleton } from '@/components/ui/skeleton'

/**
 * Skeletons de página (dashboard-redesign Fase 5 §6). Espelham o esqueleto
 * das telas reais (PageHeader + conteúdo com `p-9`) para reduzir o "salto"
 * quando os dados chegam. Consumidos pelos `loading.tsx` de cada rota.
 *
 * O wrapper carrega `role="status"` + label, então leitores de tela anunciam
 * "Carregando…" uma vez; os blocos internos são `aria-hidden`.
 */

function Header({ comAbas = false }: { comAbas?: boolean }) {
  return (
    <div className="mb-6">
      <Skeleton className="h-8 w-52" />
      <Skeleton className="h-4 w-72 mt-3" />
      {comAbas && (
        <div className="flex gap-4 mt-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-24" />
          ))}
        </div>
      )}
    </div>
  )
}

/** Grade de KPIs + área de gráfico — usada em Início, Financeiro, Relatórios. */
export function SkeletonCards() {
  return (
    <div role="status" aria-label="Carregando" className="p-9">
      <Header />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-5"
            style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
          >
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-28 mt-3" />
            <Skeleton className="h-3 w-16 mt-3" />
          </div>
        ))}
      </div>
      <div
        className="rounded-xl mt-6 p-5"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
      >
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-52 w-full mt-4" />
      </div>
    </div>
  )
}

/** Barra de filtros + linhas de tabela — Pedidos, Produtos, Estoque, etc. */
export function SkeletonTabela({ linhas = 8 }: { linhas?: number }) {
  return (
    <div role="status" aria-label="Carregando" className="p-9">
      <Header />
      <div className="flex gap-2 mb-5">
        <Skeleton className="h-10 flex-1 max-w-sm" />
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-28" />
      </div>
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
      >
        {Array.from({ length: linhas }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-5 py-4"
            style={{ borderBottom: i < linhas - 1 ? '1px solid var(--line)' : 'none' }}
          >
            <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
            <div className="flex-1 min-w-0">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24 mt-2" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Lista de cards em coluna — Avaliações, Mensagens, Entregadores. */
export function SkeletonLista({ itens = 5 }: { itens?: number }) {
  return (
    <div role="status" aria-label="Carregando" className="p-9">
      <Header />
      <div className="flex flex-col gap-3">
        {Array.from({ length: itens }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-5 flex items-start gap-4"
            style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
          >
            <Skeleton className="h-11 w-11 rounded-full shrink-0" />
            <div className="flex-1 min-w-0">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-full max-w-md mt-3" />
              <Skeleton className="h-3 w-2/3 mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Colunas de formulário — Configurações, Minha conta, Minha loja. */
export function SkeletonForm() {
  return (
    <div role="status" aria-label="Carregando" className="p-9">
      <Header comAbas />
      <div
        className="rounded-xl p-6 max-w-2xl flex flex-col gap-5"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-10 w-full mt-2" />
          </div>
        ))}
        <Skeleton className="h-10 w-32 mt-2" />
      </div>
    </div>
  )
}
