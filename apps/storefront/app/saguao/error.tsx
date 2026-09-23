'use client'

import { useEffect } from 'react'

/**
 * Fronteira de erro do saguão (apex). Sem pele de loja: vocabulário Mallevo,
 * o mesmo do `ChromeSaguao` (marquise #18181B, accent lima), porque o
 * `ChromeSaguao` vive DENTRO de cada página e não sobrevive ao erro.
 */
export default function ErroDoSaguao({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error({ rota: 'saguao', mensagem: error.message, digest: error.digest })
  }, [error])

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-30" style={{ background: '#18181B', color: '#F5F5F0' }}>
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center px-6">
          <span className="font-display text-[22px] font-extrabold tracking-[-0.6px]">
            mallevo<span style={{ color: '#D8FF3E' }}>.</span>
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <h1 className="font-display text-[26px] font-extrabold tracking-[-0.6px]">O shopping travou por um instante</h1>
        <p className="max-w-[46ch] text-[14px] leading-5 text-ink-muted">
          Não conseguimos montar as vitrines agora. Tente de novo — costuma ser passageiro.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-1 inline-flex h-11 items-center rounded-pill px-6 text-[14px] font-bold transition-opacity hover:opacity-90 active:opacity-80"
          style={{ background: '#D8FF3E', color: '#111216' }}
        >
          Tentar de novo
        </button>
        {error.digest && <p className="font-mono text-[11px] text-ink-soft">ref {error.digest}</p>}
      </main>
    </div>
  )
}
