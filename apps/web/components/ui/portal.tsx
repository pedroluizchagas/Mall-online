'use client'

import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Véu de diálogo nasce em `document.body`. Dentro da página ele fica preso:
 * a animação de entrada (`.slide-up`, `.entra`) segue em efeito depois de
 * terminar (fill `both`) e o `position: fixed` passa a medir o contêiner, não
 * a janela — o véu cobria só o conteúdo e o diálogo centrava nele.
 *
 * Só para o que abre depois de um clique: no servidor não há `document`.
 */
export function Portal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body)
}
