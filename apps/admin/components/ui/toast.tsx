'use client'

import { useSyncExternalStore } from 'react'
import { PartnerIcon, type PartnerIconName } from './partner-icon'

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

const ESTILOS: Record<ToastTipo, { cor: string; icone: PartnerIconName }> = {
  sucesso: { cor: 'var(--ok-vivo)', icone: 'check-circle' },
  erro: { cor: 'var(--err-vivo)', icone: 'close-circle' },
  info: { cor: 'var(--sky-vivo)', icone: 'info' },
}

/**
 * Toaster — a cápsula de vidro escuro do app (o material da tab bar),
 * flutuando sobre a folha. Ícone no tom do momento, texto branco.
 */
export function Toaster() {
  const itens = useSyncExternalStore(inscrever, lerFila, lerFilaServidor)

  return (
    <div
      aria-live="polite"
      role="status"
      className="pointer-events-none fixed bottom-4 left-1/2 z-[70] flex w-[calc(100vw-2rem)] -translate-x-1/2 flex-col gap-2 sm:bottom-6 sm:left-auto sm:right-6 sm:w-96 sm:translate-x-0"
    >
      {itens.map((toast) => {
        const estilo = ESTILOS[toast.tipo]
        return (
          <div
            key={toast.id}
            className="sobre-escuro slide-up pointer-events-auto flex items-start gap-3 rounded-[20px] p-3.5 pl-4 text-white shadow-lg ring-1 ring-inset ring-[color:var(--m-line)] backdrop-blur-xl"
            style={{ background: 'rgba(17, 18, 22, 0.94)' }}
          >
            <PartnerIcon
              name={estilo.icone}
              size={19}
              strokeWidth={2}
              className="mt-px shrink-0"
              color={estilo.cor}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold leading-snug">{toast.titulo}</p>
              {toast.descricao && (
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-[color:var(--m-ink-2)]">{toast.descricao}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => remover(toast.id)}
              aria-label="Fechar"
              className="-my-1 -mr-1 flex size-7 shrink-0 items-center justify-center rounded-full text-[color:var(--m-ink-2)] transition-colors hover:bg-[color:var(--m-glass-2)] hover:text-white"
            >
              <PartnerIcon name="close" size={15} strokeWidth={2} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
