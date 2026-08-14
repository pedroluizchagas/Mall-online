import { create } from 'zustand'

/**
 * Modo imersivo do Explorar.
 *
 * A tab bar vive no layout ((tabs)/_layout.tsx) e não desmonta junto com a
 * tela — por isso o toque que some com os textos do reel precisa avisar o
 * layout por aqui. A tela só declara "estou imersiva"; a coreografia (a barra
 * fechando até virar bolinha no ícone de Explorar) é responsabilidade da
 * TabBar, que é quem conhece a própria geometria.
 */
interface ImersaoState {
  imersivo: boolean
  setImersivo: (v: boolean) => void
}

export const useImersao = create<ImersaoState>((set) => ({
  imersivo: false,
  setImersivo: (imersivo) => set((s) => (s.imersivo === imersivo ? s : { imersivo })),
}))
