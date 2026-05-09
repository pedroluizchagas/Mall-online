'use client'

import { useSyncExternalStore } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

export type ToastTipo = 'sucesso' | 'erro' | 'info'

export interface ToastInput {
  tipo: ToastTipo
  titulo: string
  descricao?: string
  duracaoMs?: number
}

type Toast = Required<Pick<ToastInput, 'tipo' | 'titulo' | 'duracaoMs'>> & {
  id: number
  descricao?: string
}

const DURACAO_PADRAO: Record<ToastTipo, number> = { sucesso: 4000, info: 4000, erro: 6000 }
const FILA_VAZIA: Toast[] = []

let proximoId = 1
let fila: Toast[] = []
const ouvintes = new Set<() => void>()

const notificar = () => ouvintes.forEach((cb) => cb())
const inscrever = (cb: () => void) => {
  ouvintes.add(cb)
  return () => ouvintes.delete(cb)
}
const lerFila = () => fila
const lerFilaServidor = () => FILA_VAZIA

function remover(id: number) {
  const proxima = fila.filter((t) => t.id !== id)
  if (proxima.length !== fila.length) {
    fila = proxima
    notificar()
  }
}

export function showToast(input: ToastInput): void {
  const id = proximoId++
  const duracaoMs = input.duracaoMs ?? DURACAO_PADRAO[input.tipo]
  fila = [...fila, { id, tipo: input.tipo, titulo: input.titulo, descricao: input.descricao, duracaoMs }]
  notificar()
  if (duracaoMs > 0 && typeof window !== 'undefined') {
    window.setTimeout(() => remover(id), duracaoMs)
  }
}

const ESTILOS = {
  sucesso: { barra: 'var(--ok)', Icone: CheckCircle2 },
  erro: { barra: 'var(--err)', Icone: AlertCircle },
  info: { barra: 'var(--sky)', Icone: Info },
} as const

export function Toaster() {
  const itens = useSyncExternalStore(inscrever, lerFila, lerFilaServidor)

  return (
    <div
      aria-live="polite"
      role="status"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] sm:w-96 pointer-events-none"
    >
      {itens.map((toast) => {
        const estilo = ESTILOS[toast.tipo]
        const { Icone } = estilo
        return (
          <div
            key={toast.id}
            className="slide-up rounded-xl shadow-lg border border-line bg-bg flex items-start gap-3 p-3.5 pointer-events-auto relative overflow-hidden"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: estilo.barra }} />
            <Icone className="w-5 h-5 shrink-0 mt-0.5 ml-1" style={{ color: estilo.barra }} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">{toast.titulo}</p>
              {toast.descricao && (
                <p className="text-xs text-ink-3 mt-0.5 leading-relaxed">{toast.descricao}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => remover(toast.id)}
              aria-label="Fechar"
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-bg-2 transition-colors shrink-0"
            >
              <X className="w-4 h-4 text-ink-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
