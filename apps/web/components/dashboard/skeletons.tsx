import { Skeleton } from '@/components/ui/skeleton'

/**
 * Skeletons de página. Espelham o esqueleto das telas reais (PageHeader +
 * cartões da folha com `p-9`) para a chegada dos dados não dar "salto".
 * Consumidos pelos `loading.tsx` de cada rota.
 *
 * O wrapper carrega `role="status"` + label, então leitores de tela anunciam
 * "Carregando" uma vez; os blocos internos são `aria-hidden`.
 */

function Header({ comAbas = false }: { comAbas?: boolean }) {
  return (
    <div className="mb-8">
      <Skeleton className="h-3 w-24 rounded-full" />
      <Skeleton className="mt-4 h-9 w-64 rounded-[12px]" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full rounded-full" />
      {comAbas && (
        <div className="mt-6 flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-28 rounded-full" />
          ))}
        </div>
      )}
    </div>
  )
}

/** Grade de KPIs + área de gráfico — Financeiro, Relatórios, módulos. */
export function SkeletonCards() {
  return (
    <div role="status" aria-label="Carregando" className="p-6 sm:p-9">
      <Header />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="cartao p-5">
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="mt-4 h-8 w-28 rounded-[10px]" />
            <Skeleton className="mt-4 h-3 w-16 rounded-full" />
          </div>
        ))}
      </div>
      <div className="cartao mt-6 p-5">
        <Skeleton className="h-4 w-32 rounded-full" />
        <Skeleton className="mt-5 h-52 w-full rounded-[14px]" />
      </div>
    </div>
  )
}

/** Barra de filtros + linhas de tabela — Pedidos, Produtos, Estoque, etc. */
export function SkeletonTabela({ linhas = 8 }: { linhas?: number }) {
  return (
    <div role="status" aria-label="Carregando" className="p-6 sm:p-9">
      <Header />
      <div className="mb-5 flex gap-2">
        <Skeleton className="h-10 max-w-sm flex-1 rounded-full" />
        <Skeleton className="h-10 w-28 rounded-full" />
        <Skeleton className="h-10 w-28 rounded-full" />
      </div>
      <div className="cartao overflow-hidden">
        {Array.from({ length: linhas }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-5 py-4"
            style={{ borderBottom: i < linhas - 1 ? '1px solid var(--line)' : 'none' }}
          >
            <Skeleton className="size-10 shrink-0 rounded-[12px]" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-40 rounded-full" />
              <Skeleton className="mt-2 h-3 w-24 rounded-full" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Lista de cards em coluna — Avaliações, Mensagens, Entregadores. */
export function SkeletonLista({ itens = 5 }: { itens?: number }) {
  return (
    <div role="status" aria-label="Carregando" className="p-6 sm:p-9">
      <Header />
      <div className="flex flex-col gap-3">
        {Array.from({ length: itens }).map((_, i) => (
          <div key={i} className="cartao flex items-start gap-4 p-5">
            <Skeleton className="size-11 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-36 rounded-full" />
              <Skeleton className="mt-3 h-3 w-full max-w-md rounded-full" />
              <Skeleton className="mt-2 h-3 w-2/3 rounded-full" />
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
    <div role="status" aria-label="Carregando" className="p-6 sm:p-9">
      <Header comAbas />
      <div className="cartao flex max-w-2xl flex-col gap-5 p-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-3.5 w-28 rounded-full" />
            <Skeleton className="mt-2.5 h-11 w-full rounded-[14px]" />
          </div>
        ))}
        <Skeleton className="mt-2 h-11 w-32 rounded-full" />
      </div>
    </div>
  )
}

/**
 * Início carregando: a marquise (vidro sobre a moldura escura) e a folha
 * subindo por cima — o mesmo desenho da tela, sem números.
 */
export function SkeletonInicio() {
  return (
    <div role="status" aria-label="Carregando">
      <div className="px-6 pb-16 pt-8 sm:px-10 sm:pt-10">
        <div className="h-3 w-44 rounded-full bg-[color:var(--m-glass-2)]" />
        <div className="mt-6 h-11 w-[min(420px,80%)] rounded-[14px] bg-[color:var(--m-glass-2)]" />
        <div className="mt-3 h-11 w-[min(520px,90%)] rounded-[14px] bg-[color:var(--m-glass)]" />
        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[104px] rounded-[18px] bg-[color:var(--m-glass)] ring-1 ring-inset ring-[color:var(--m-line)]" />
          ))}
        </div>
      </div>
      <div className="vidro-fosco relative -mt-6 min-h-[50vh] rounded-t-[28px] px-6 pt-10 sm:px-10">
        <div className="grid gap-5 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="cartao p-5">
              <Skeleton className="h-3 w-20 rounded-full" />
              <Skeleton className="mt-3 h-5 w-40 rounded-full" />
              <Skeleton className="mt-6 h-32 w-full rounded-[14px]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
