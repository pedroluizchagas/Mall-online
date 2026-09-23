/**
 * Esqueleto do saguão — NOTA DE FRONTEIRA (A-07): um `loading.tsx` abre uma
 * Suspense e o Next manda o status 200 antes de a página decidir. Um
 * `notFound()` lançado ABAIXO dele vira "soft 404" (200 com cara de 404), que
 * é exatamente o que o Google pune. Por isso o esqueleto vive neste grupo de
 * rota (`(corredores)`, que não muda a URL) e cobre só `/` e `/explorar`; `/piso/[slug]` (que 404 em piso inexistente) ficam de
 * fora e continuam devolvendo 404 de verdade.
 */

/**
 * Esqueleto do saguão: a marquise Mallevo já pintada (ela não depende de
 * dado) e, abaixo, as placas dos pisos e os corredores em cinza. Mantém o
 * mesmo enquadramento do `ChromeSaguao` para a página não "pular" ao trocar
 * o esqueleto pelo conteúdo.
 */
export default function CarregandoSaguao() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink" aria-busy="true" aria-label="Carregando o shopping">
      <header className="sticky top-0 z-30" style={{ background: '#18181B', color: '#F5F5F0' }}>
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center px-6">
          <span className="font-display text-[22px] font-extrabold tracking-[-0.6px]">
            mallevo<span style={{ color: '#D8FF3E' }}>.</span>
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-10">
        <div className="animate-pulse">
          <div className="h-7 w-2/5 rounded-pill bg-canvasAlt" />
          <div className="mt-3 h-4 w-3/5 rounded-pill bg-canvasAlt" />

          {/* Diretório: placas dos pisos */}
          <div className="mt-8 flex flex-wrap gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-10 w-32 rounded-pill bg-canvasAlt" />
            ))}
          </div>

          {/* Dois corredores de fachadas */}
          {Array.from({ length: 2 }, (_, c) => (
            <section key={c} className="mt-10">
              <div className="h-5 w-48 rounded-pill bg-canvasAlt" />
              <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="overflow-hidden rounded-md border border-line bg-surface">
                    <div className="h-36 w-full bg-canvasAlt" />
                    <div className="space-y-2 p-4">
                      <div className="h-4 w-3/5 rounded-pill bg-canvasAlt" />
                      <div className="h-3 w-4/5 rounded-pill bg-canvasAlt" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
