import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * Chrome do saguão — a MARQUISE do shopping traduzida para o apex: barra
 * escura com o wordmark e a navegação (Pisos, Explorar) e o convite ao
 * lojista; conteúdo sobre o canvas fumê; fecho com os links da casa.
 * Vocabulário Mallevo (Plus Jakarta Sans, marquee #18181B, accent lima) —
 * aqui não há pele de loja: a pele entra só dentro de cada fachada.
 */
export function ChromeSaguao({ children, ativo }: { children: ReactNode; ativo: 'pisos' | 'explorar' | 'piso' }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-30" style={{ background: '#18181B', color: '#F5F5F0' }}>
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center gap-6 px-6">
          <Link href="/" className="font-display text-[22px] font-extrabold tracking-[-0.6px]" aria-label="Mallevo — início do shopping">
            mallevo<span style={{ color: '#D8FF3E' }}>.</span>
          </Link>
          <nav aria-label="Navegação do shopping" className="flex items-center gap-1 text-[13.5px] font-semibold">
            <ItemNav href="/" ativo={ativo === 'pisos' || ativo === 'piso'}>
              Pisos
            </ItemNav>
            <ItemNav href="/explorar" ativo={ativo === 'explorar'}>
              Explorar
            </ItemNav>
          </nav>
          <a
            href="https://app.mallevo.com.br"
            className="ml-auto hidden h-9 items-center rounded-pill px-4 text-[13px] font-bold sm:inline-flex"
            style={{ background: '#D8FF3E', color: '#111216' }}
          >
            Sou lojista
          </a>
        </div>
      </header>

      <main id="conteudo" className="flex-1">
        {children}
      </main>

      <footer className="mt-16 border-t border-line bg-surface">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-[18px] font-extrabold tracking-[-0.4px]">
              mallevo<span className="text-accent-ink" style={{ color: '#9FBF1A' }}>.</span>
            </p>
            <p className="mt-1 text-[13px] text-ink-muted">O shopping digital de Divinópolis.</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] font-semibold text-ink-muted">
            <a href="https://app.mallevo.com.br" className="hover:text-ink">
              Abra sua loja
            </a>
            <Link href="/termos" className="hover:text-ink">
              Termos
            </Link>
            <Link href="/privacidade" className="hover:text-ink">
              Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function ItemNav({ href, ativo, children }: { href: string; ativo: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={ativo ? 'page' : undefined}
      className="inline-flex h-9 items-center rounded-pill px-3.5 transition-colors"
      style={{
        background: ativo ? 'rgba(255,255,255,0.10)' : 'transparent',
        color: ativo ? '#F5F5F0' : 'rgba(245,245,240,0.62)',
      }}
    >
      {children}
    </Link>
  )
}
