import { CSSProperties, HTMLAttributes, ReactNode } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  hoverable?: boolean
  style?: CSSProperties
  className?: string
}

export function Card({ children, hoverable, className = '', style, ...rest }: Props) {
  return (
    <div
      className={`bg-bg border border-line rounded-lg p-5 transition-all ${
        hoverable ? 'hover:border-line-2 hover:shadow-md hover:-translate-y-px cursor-pointer' : ''
      } ${className}`}
      style={style}
      {...rest}
    >
      {children}
    </div>
  )
}
