import { CSSProperties, HTMLAttributes, ReactNode } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  hoverable?: boolean
  style?: CSSProperties
  className?: string
}

/**
 * Cartão da folha (CartaoFolha do app): superfície branca que acende sobre o
 * fumê — sem borda visível, sombra curta. `hoverable` sobe 1px e aprofunda.
 */
export function Card({ children, hoverable, className = '', style, ...rest }: Props) {
  return (
    <div
      className={`cartao p-5 transition-[box-shadow,transform] duration-300 ease-entrada ${
        hoverable ? 'cursor-pointer hover:-translate-y-px hover:shadow-md' : ''
      } ${className}`}
      style={style}
      {...rest}
    >
      {children}
    </div>
  )
}
