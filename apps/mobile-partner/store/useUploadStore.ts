import { create } from 'zustand'

// Estado da publicação em andamento (docs/partner-app/09 §5) —
// 1 publicação robusta por vez; fila multi-item é pós-MVP.

export type EstadoUpload =
  | 'idle'
  | 'comprimindo'
  | 'enviando'
  | 'criando-registro'
  | 'concluido'
  | 'erro'

interface UploadState {
  estado: EstadoUpload
  /** 0–1 do envio da mídia principal. */
  progresso: number
  erro: string | null
  /** Cancela o upload TUS em andamento (setado pelo pipeline). */
  cancelarAtual: (() => void) | null
  setEstado: (e: EstadoUpload) => void
  setProgresso: (p: number) => void
  setErro: (msg: string | null) => void
  setCancelarAtual: (fn: (() => void) | null) => void
  resetar: () => void
}

export const useUploadStore = create<UploadState>((set) => ({
  estado: 'idle',
  progresso: 0,
  erro: null,
  cancelarAtual: null,
  setEstado: (estado) => set({ estado }),
  setProgresso: (progresso) => set({ progresso }),
  setErro: (erro) => set({ erro, estado: erro ? 'erro' : 'idle' }),
  setCancelarAtual: (cancelarAtual) => set({ cancelarAtual }),
  resetar: () => set({ estado: 'idle', progresso: 0, erro: null, cancelarAtual: null }),
}))
