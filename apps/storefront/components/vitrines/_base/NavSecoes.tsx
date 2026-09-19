'use client'

import { useEffect, useState } from 'react'

export interface SecaoNav {
  chave: string
  titulo: string
}

/** id DOM de uma seção do catálogo — compartilhado com `MenuSection`. */
export function idDaSecao(chave: string): string {
  return `secao-${chave}`
}

/**
 * Régua de seções do catálogo: chips que rolam até a seção e acendem conforme
 * a leitura avança (IntersectionObserver). Grudada no topo da coluna. Só vale
 * a pena com mais de uma seção.
 */
export function NavSecoes({ secoes }: { secoes: SecaoNav[] }) {
  const [ativa, setAtiva] = useState<string | null>(secoes[0]?.chave ?? null)

  useEffect(() => {
    if (secoes.length < 2 || typeof IntersectionObserver === 'undefined') return
    const alvos = secoes
      .map((s) => document.getElementById(idDaSecao(s.chave)))
      .filter((el): el is HTMLElement => el !== null)
    if (alvos.length === 0) return

    const visiveis = new Map<string, number>()
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) visiveis.set(e.target.id, e.boundingClientRect.top)
          else visiveis.delete(e.target.id)
        }
        if (visiveis.size === 0) return
        // A seção visível mais alta na tela é a "atual".
        const [topoId] = [...visiveis.entries()].sort((a, b) => a[1] - b[1])[0]
        const chave = secoes.find((s) => idDaSecao(s.chave) === topoId)?.chave
        if (chave) setAtiva(chave)
      },
      { rootMargin: '-96px 0px -55% 0px', threshold: [0, 0.1] },
    )
    alvos.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [secoes])

  if (secoes.length < 2) return null

  return (
    <nav
      aria-label="Seções"
      className="sticky top-0 z-10 -mx-px border-b border-line bg-canvas/90 backdrop-blur"
    >
      <ul className="flex gap-2 overflow-x-auto px-screen-x py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {secoes.map((s) => {
          const atual = s.chave === ativa
          return (
            <li key={s.chave} className="shrink-0">
              <a
                href={`#${idDaSecao(s.chave)}`}
                aria-current={atual ? 'true' : undefined}
                onClick={() => setAtiva(s.chave)}
                className={`inline-flex h-9 items-center whitespace-nowrap rounded-pill px-4 text-[13px] font-bold transition-colors ${
                  atual
                    ? 'bg-ink text-canvas'
                    : 'bg-surfaceMuted text-ink-muted hover:text-ink'
                }`}
              >
                {s.titulo}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
