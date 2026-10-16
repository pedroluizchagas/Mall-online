interface Props {
  name: string
  size?: number
  /** Fundo explícito (ex.: cor da loja). Sem ele, a moeda é neutra. */
  color?: string
  /** `acesa` = iniciais tinta sobre o accent (o tijolo da casa). */
  tom?: 'neutro' | 'acesa'
}

/** Iniciais numa moeda — monocromática por padrão (regra da casa). */
export function Avatar({ name, size = 32, color, tom = 'neutro' }: Props) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const bg = color ?? (tom === 'acesa' ? 'var(--brick)' : 'var(--bg-3)')
  const fg = color ? 'var(--on-color)' : tom === 'acesa' ? 'var(--brick-ink)' : 'var(--ink)'
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        fontSize: Math.round(size * 0.36),
      }}
      className="flex flex-shrink-0 items-center justify-center rounded-full font-bold tracking-[-0.02em]"
    >
      {initials || '·'}
    </div>
  )
}
