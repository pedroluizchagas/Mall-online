import { Skeleton } from '@/components/ui/skeleton'

/**
 * Esqueletos de página: o desenho das telas reais (letreiro + filtros +
 * linhas de cartão; ou a marquise com a folha subindo), sem números, para a
 * chegada dos dados não dar salto. O wrapper anuncia "Carregando" uma vez.
 */

export function SkeletonLista({ linhas = 6 }: { linhas?: number }) {
  return (
    <div role="status" aria-label="Carregando" className="p-6 sm:p-9">
      <div className="mb-8">
        <Skeleton className="h-3 w-20 rounded-full" />
        <Skeleton className="mt-4 h-9 w-56 rounded-[12px]" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full rounded-full" />
      </div>
      <div className="mb-6 flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-full" />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: linhas }).map((_, i) => (
          <div key={i} className="cartao flex items-center gap-4 p-4">
            <Skeleton className="size-11 shrink-0 rounded-[12px]" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-48 max-w-full rounded-full" />
              <Skeleton className="mt-2 h-3 w-72 max-w-full rounded-full" />
            </div>
            <Skeleton className="hidden h-6 w-24 rounded-full sm:block" />
            <Skeleton className="hidden h-6 w-24 rounded-full md:block" />
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Visão geral carregando: vidro sobre a moldura e a folha por cima. */
export function SkeletonVisaoGeral() {
  return (
    <div role="status" aria-label="Carregando">
      <div className="px-6 pb-16 pt-8 sm:px-10 sm:pt-10">
        <div className="h-3 w-52 rounded-full bg-[color:var(--m-glass-2)]" />
        <div className="mt-6 h-11 w-[min(440px,80%)] rounded-[14px] bg-[color:var(--m-glass-2)]" />
        <div className="mt-3 h-11 w-[min(260px,60%)] rounded-[14px] bg-[color:var(--m-glass)]" />
        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 xl:max-w-[58%]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[104px] rounded-[18px] bg-[color:var(--m-glass)] ring-1 ring-inset ring-[color:var(--m-line)]" />
          ))}
        </div>
      </div>
      <div className="vidro-fosco relative -mt-6 min-h-[50vh] rounded-t-[28px] px-6 pt-10 sm:px-10">
        <div className="grid gap-5 xl:grid-cols-12">
          <div className="cartao p-5 xl:col-span-8">
            <Skeleton className="h-8 w-56 rounded-full" />
            <Skeleton className="mt-6 h-40 w-full rounded-[14px]" />
          </div>
          <div className="cartao p-5 xl:col-span-4">
            <Skeleton className="h-3 w-24 rounded-full" />
            <Skeleton className="mt-4 h-2.5 w-full rounded-full" />
            <Skeleton className="mt-8 h-3 w-24 rounded-full" />
            <Skeleton className="mt-4 h-2.5 w-full rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
