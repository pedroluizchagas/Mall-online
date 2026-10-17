'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PartnerIcon } from '@/components/ui/partner-icon'
import type { Comando } from './comandos'

/**
 * Command palette (⌘K / Ctrl+K) — navegação rápida do dashboard
 * (dashboard-redesign Fase 5 §1). Sem dependências: filtro por substring
 * (nome + palavras-chave, sem acentos), navegação por setas, Enter abre,
 * Esc fecha. Montado uma vez no layout do dashboard.
 */

function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

export function CommandPalette({ comandos }: { comandos: Comando[] }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [indice, setIndice] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listaRef = useRef<HTMLDivElement>(null)

  // Atalho global de abertura + Esc para fechar; abre também via evento
  // (gatilho "Buscar" na sidebar dispara `mallevo:cmdk`, sem lift de estado).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setAberto((a) => !a)
      } else if (e.key === 'Escape' && aberto) {
        setAberto(false)
      }
    }
    function onAbrir() {
      setAberto(true)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mallevo:cmdk', onAbrir)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mallevo:cmdk', onAbrir)
    }
  }, [aberto])

  // Ao abrir: reseta busca/seleção e foca o input.
  useEffect(() => {
    if (aberto) {
      setBusca('')
      setIndice(0)
      // rAF garante que o input já está montado.
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [aberto])

  const filtrados = useMemo(() => {
    const q = normalizar(busca)
    if (!q) return comandos
    const termos = q.split(/\s+/)
    return comandos.filter((c) => {
      const alvo = normalizar(`${c.label} ${c.grupo} ${c.palavras ?? ''}`)
      return termos.every((t) => alvo.includes(t))
    })
  }, [busca, comandos])

  // Mantém a seleção dentro dos limites quando a lista encolhe.
  useEffect(() => {
    setIndice((i) => Math.min(i, Math.max(0, filtrados.length - 1)))
  }, [filtrados.length])

  function selecionar(c: Comando | undefined) {
    if (!c) return
    setAberto(false)
    router.push(c.href)
  }

  function onKeyLista(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndice((i) => Math.min(i + 1, filtrados.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndice((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      selecionar(filtrados[indice])
    }
  }

  // Rola o item ativo para dentro da vista.
  useEffect(() => {
    const el = listaRef.current?.querySelector<HTMLElement>(`[data-idx="${indice}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [indice])

  if (!aberto) return null

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center bg-[rgba(9,9,11,0.55)] p-4 pt-[12vh] backdrop-blur-[3px]"
      onMouseDown={() => setAberto(false)}
    >
      {/* A busca é o concierge da marquise: vidro escuro, neon no canto. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navegação rápida"
        className="sobre-escuro slide-up relative isolate w-full max-w-xl overflow-hidden rounded-[24px] text-white shadow-lg ring-1 ring-inset ring-[color:var(--m-line)]"
        style={{ background: 'rgba(24, 24, 27, 0.97)' }}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyLista}
      >
        <div aria-hidden className="glow-marquise pointer-events-none absolute inset-0 -z-10 opacity-80" />

        {/* Busca */}
        <div className="flex h-14 items-center gap-3 border-b border-[color:var(--m-line)] px-5">
          <PartnerIcon name="search" size={18} strokeWidth={2} className="shrink-0 text-[color:var(--brick)]" />
          <input
            ref={inputRef}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Ir para… (páginas, ações)"
            className="flex-1 border-none bg-transparent text-[15px] text-white outline-none focus-visible:outline-none placeholder:text-[color:var(--m-ink-3)]"
          />
          <kbd className="rounded-full bg-[color:var(--m-glass-2)] px-2 py-0.5 font-mono text-[10.5px] text-[color:var(--m-ink-2)]">
            esc
          </kbd>
        </div>

        {/* Resultados */}
        <div ref={listaRef} className="max-h-[52vh] overflow-y-auto p-2">
          {filtrados.length === 0 ? (
            <p className="px-4 py-8 text-center text-[14px] text-[color:var(--m-ink-2)]">
              Nada encontrado para “{busca}”.
            </p>
          ) : (
            filtrados.map((c, i) => {
              const ativo = i === indice
              return (
                <button
                  key={c.id}
                  data-idx={i}
                  type="button"
                  onMouseEnter={() => setIndice(i)}
                  onClick={() => selecionar(c)}
                  className="flex w-full items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-left transition-colors"
                  style={{ background: ativo ? 'var(--m-glass-2)' : 'transparent' }}
                >
                  <span className="micro w-20 shrink-0 text-[color:var(--m-ink-3)]">{c.grupo}</span>
                  <span className={`flex-1 text-[14px] font-medium ${ativo ? 'text-white' : 'text-[color:var(--m-ink-2)]'}`}>
                    {c.label}
                  </span>
                  {ativo && <PartnerIcon name="arrow-right" size={16} strokeWidth={2.2} className="shrink-0 text-[color:var(--brick)]" />}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
