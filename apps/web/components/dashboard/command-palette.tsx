'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, CornerDownLeft } from 'lucide-react'
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
      className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]"
      style={{ background: 'rgba(15,15,13,0.5)' }}
      onMouseDown={() => setAberto(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navegação rápida"
        className="w-full max-w-lg rounded-2xl overflow-hidden shadow-xl"
        style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyLista}
      >
        {/* Busca */}
        <div
          className="flex items-center gap-2.5 px-4"
          style={{ borderBottom: '1px solid var(--line)', height: 52 }}
        >
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--ink-3)' }} />
          <input
            ref={inputRef}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Ir para… (páginas, ações)"
            className="flex-1 bg-transparent border-none outline-none text-sm"
            style={{ color: 'var(--ink)' }}
          />
          <kbd
            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{ background: 'var(--bg-2)', color: 'var(--ink-3)' }}
          >
            esc
          </kbd>
        </div>

        {/* Resultados */}
        <div ref={listaRef} className="max-h-[52vh] overflow-y-auto py-1.5">
          {filtrados.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm" style={{ color: 'var(--ink-3)' }}>
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
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                  style={{ background: ativo ? 'var(--bg-2)' : 'transparent' }}
                >
                  <span
                    className="text-[10px] uppercase font-semibold tracking-wider w-16 flex-shrink-0"
                    style={{ color: 'var(--ink-3)' }}
                  >
                    {c.grupo}
                  </span>
                  <span className="flex-1 text-sm font-medium" style={{ color: 'var(--ink)' }}>
                    {c.label}
                  </span>
                  {ativo && (
                    <CornerDownLeft className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--ink-3)' }} />
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
