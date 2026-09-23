'use client'

import { useEffect } from 'react'

/**
 * Último anteparo: erro no layout RAIZ (antes de qualquer pele ou fonte).
 * Precisa renderizar `<html>`/`<body>` porque substitui o layout inteiro —
 * por isso nada de Tailwind dirigido por tema aqui: estilo inline, cores
 * Mallevo cruas.
 */
export default function ErroGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error({ rota: 'global', mensagem: error.message, digest: error.digest })
  }, [error])

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, background: '#F1F1F3', color: '#111216', fontFamily: 'system-ui, sans-serif' }}>
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: 24,
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.6px' }}>
            mallevo<span style={{ color: '#9FBF1A' }}>.</span>
          </p>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Algo saiu do lugar</h1>
          <p style={{ margin: 0, maxWidth: '44ch', fontSize: 14, lineHeight: 1.45, color: '#5E6168' }}>
            A página não pôde ser montada. Tente de novo em instantes.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              height: 44,
              padding: '0 24px',
              border: 0,
              borderRadius: 999,
              background: '#D8FF3E',
              color: '#111216',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Tentar de novo
          </button>
          {error.digest && <p style={{ margin: 0, fontSize: 11, color: '#8B8E94' }}>ref {error.digest}</p>}
        </main>
      </body>
    </html>
  )
}
