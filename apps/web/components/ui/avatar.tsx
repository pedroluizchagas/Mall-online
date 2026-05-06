interface Props {
  name: string
  size?: number
  color?: string
}

export function Avatar({ name, size = 32, color }: Props) {
  const initials = name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const bg = color ?? 'var(--brick)'
  const fg = color ? '#fff' : 'var(--brick-ink)'
  return (
    <div
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        fontSize: size * 0.38,
      }}
      className="rounded-full flex items-center justify-center font-bold flex-shrink-0 tracking-tight"
    >
      {initials}
    </div>
  )
}
