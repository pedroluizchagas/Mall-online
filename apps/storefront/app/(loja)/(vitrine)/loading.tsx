/**
 * Esqueleto da home da loja — NOTA DE FRONTEIRA (A-07): um `loading.tsx` abre uma
 * Suspense e o Next manda o status 200 antes de a página decidir. Um
 * `notFound()` lançado ABAIXO dele vira "soft 404" (200 com cara de 404), que
 * é exatamente o que o Google pune. Por isso o esqueleto vive neste grupo de
 * rota (`(vitrine)`, que não muda a URL) e cobre só a vitrine em `/`; `/produto/[id]`, `/checkout`, `/pedido/[id]` e `/preview` ficam de
 * fora e continuam devolvendo 404 de verdade.
 */

/**
 * Esqueleto da home da loja enquanto o catálogo carrega — na PELE da loja
 * (as vars já estão no `:root` pelo layout): hero, régua de status e seis
 * cartões, o molde comum às 18 vitrines. Server component: nenhum JS vai
 * para o cliente por causa dele.
 */
export default function CarregandoLoja() {
  return (
    <main className="min-h-screen bg-canvas" aria-busy="true" aria-label="Carregando a loja">
      <div className="animate-pulse">
        {/* Hero */}
        <div className="h-[220px] w-full bg-surfaceMuted" />

        {/* Régua de status: logo + nome + chip de abertura */}
        <div className="mx-screen-x -mt-6 flex items-center gap-3 rounded-md bg-surface p-card shadow-soft">
          <div className="h-11 w-11 shrink-0 rounded-sm bg-surfaceMuted" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-1/2 rounded-pill bg-surfaceMuted" />
            <div className="h-3 w-2/3 rounded-pill bg-surfaceMuted" />
          </div>
        </div>

        {/* Seis cartões de produto */}
        <div className="mx-screen-x mt-section grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="rounded-md border border-line bg-surface p-2">
              <div className="aspect-square w-full rounded-sm bg-surfaceMuted" />
              <div className="mt-2 h-3 w-4/5 rounded-pill bg-surfaceMuted" />
              <div className="mt-2 h-3 w-1/2 rounded-pill bg-surfaceMuted" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
