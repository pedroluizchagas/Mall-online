import { create } from 'zustand'

/**
 * Transição de saída de loja → shopping (Mallevo).
 *
 * A tela da loja não pode animar a própria saída: ao navegar, ela desmonta e
 * leva junto qualquer overlay local. O véu vive no layout raiz
 * (components/TransicaoMallevo.tsx) e é disparado por aqui: a tela registra a
 * navegação + a COR da sua paleta + o ponto do toque; o véu expande um círculo
 * dessa cor a partir do toque, navega escondido e dissolve para o Mallevo.
 */
export interface SaidaConfig {
  /** Ação de navegação — executada quando o círculo cobre a tela. */
  acao: () => void
  /** Cor da paleta da loja que cobre a tela. Default: ink Mallevo. */
  cor?: string
  /** Origem da expansão radial (coordenadas de página do toque). Default: centro. */
  origem?: { x: number; y: number }
}

interface TransicaoSaidaState {
  config: SaidaConfig | null
  /** Inicia a transição. Chamadas com uma transição em curso são ignoradas. */
  iniciar: (config: SaidaConfig) => void
  limpar: () => void
}

export const useTransicaoSaida = create<TransicaoSaidaState>((set) => ({
  config: null,
  iniciar: (config) => set((s) => (s.config ? s : { config })),
  limpar: () => set({ config: null }),
}))
