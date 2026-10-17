'use client'

import { useCallback, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '@/lib/cx'
import { useFocoNoDialogo } from './hooks/use-foco-no-dialogo'

/**
 * Diálogo da casa: o véu da busca (⌘K) e a folha clara por cima, com o
 * letreiro (sobrelinha + título) e as ações em pílula. Foco preso dentro,
 * Esc e clique no véu fecham, o foco volta a quem abriu.
 *
 * Nasce em `document.body` (portal): dentro da página, o `transform` da
 * animação de entrada (`.slide-up`) prendia o `position: fixed` e o véu
 * cobria só a altura do conteúdo.
 */
export function Dialogo({
  aberto,
  aoFechar,
  sobrelinha,
  titulo,
  children,
  rodape,
  largura = 'max-w-md',
}: {
  aberto: boolean
  aoFechar: () => void
  sobrelinha?: string
  titulo: string
  children?: ReactNode
  rodape: ReactNode
  largura?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const idTitulo = useId()
  const fechar = useCallback(() => aoFechar(), [aoFechar])
  useFocoNoDialogo(aberto, ref, fechar)

  // Só abre depois de um clique, então `document` sempre existe aqui.
  if (!aberto) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-[rgba(9,9,11,0.55)] p-3 backdrop-blur-[3px] sm:items-center sm:p-4"
      onMouseDown={fechar}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className={cx('sobre-claro slide-up w-full rounded-[24px] bg-bg p-6 text-ink shadow-lg sm:p-7', largura)}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {sobrelinha && <p className="micro text-ink-3">{sobrelinha}</p>}
        <h2
          id={idTitulo}
          className={cx('text-[22px] font-semibold leading-tight tracking-[-0.03em] text-ink', sobrelinha && 'mt-2')}
        >
          {titulo}
        </h2>
        {children && <div className="mt-3">{children}</div>}
        <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{rodape}</div>
      </div>
    </div>,
    document.body,
  )
}

const CLASSE_BOTAO =
  'inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-[14px] font-bold transition-colors duration-200 disabled:opacity-60'

/**
 * Botões do diálogo e das listas. `acao` = lima (seguir em frente: aprovar,
 * reativar, salvar); `perigo` = o vermelho de status (suspender, reprovar);
 * `neutro` = contorno; `fantasma` = só texto (cancelar).
 */
export function Botao({
  variante = 'neutro',
  tamanho = 'md',
  carregando = false,
  className,
  children,
  ...props
}: {
  variante?: 'acao' | 'perigo' | 'neutro' | 'fantasma'
  tamanho?: 'md' | 'sm'
  carregando?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || carregando}
      className={cx(
        CLASSE_BOTAO,
        tamanho === 'sm' && 'h-9 px-4 text-[13px]',
        variante === 'acao' && 'bg-brick text-brick-ink hover:bg-brick-dk',
        // Texto na cor da superfície: branco sobre o vermelho do claro, grafite
        // sobre o coral do escuro (branco ali não passa contraste).
        variante === 'perigo' && 'bg-err text-bg hover:bg-err/90',
        variante === 'neutro' && 'bg-bg text-ink ring-1 ring-inset ring-line-2 hover:bg-bg-2',
        variante === 'fantasma' && 'text-ink-2 hover:bg-bg-2 hover:text-ink',
        className,
      )}
    >
      {carregando && (
        <span aria-hidden className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  )
}
