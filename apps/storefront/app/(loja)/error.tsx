'use client'

import { useEffect } from 'react'

/**
 * Fronteira de erro do grupo `(loja)` — vestida com a pele da loja, porque o
 * `StoreThemeRoot` do layout já pôs as CSS vars no `:root` acima desta
 * árvore: `bg-canvas`/`text-ink` e o botão no `accent` do lojista.
 *
 * Sem Sentry no storefront (A-07): o registro é um `console.error`
 * estruturado, que o log da Vercel indexa por campo.
 */
export default function ErroDaLoja({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error({ rota: '(loja)', mensagem: error.message, digest: error.digest })
  }, [error])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-screen-x text-center text-ink">
      <h1 className="font-display text-display-md font-extrabold">Algo saiu do lugar</h1>
      <p className="max-w-[34ch] font-body text-[14px] leading-5 text-ink-muted">
        Não conseguimos carregar esta página da loja agora. Tente de novo em instantes.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-1 inline-flex h-11 items-center rounded-pill bg-accent px-6 font-body text-[14px] font-bold text-accent-ink transition-opacity hover:opacity-90 active:opacity-80"
      >
        Tentar de novo
      </button>
      <a href="/" className="font-body text-[13px] font-semibold text-ink-muted underline underline-offset-4">
        Voltar para o início da loja
      </a>
      {error.digest && (
        <p className="font-mono text-[11px] text-ink-soft">ref {error.digest}</p>
      )}
    </main>
  )
}
