interface Props {
  name: string
  size?: number
}

/**
 * Lugar da foto quando o produto ainda não tem uma: a inicial na voz da casa
 * (Jakarta) sobre o fumê. Sem pastel por letra, sem serifa — o produto ganha
 * cor quando ganha foto.
 */
export function ProductThumb({ name, size = 48 }: Props) {
  const letter = (name.trim()[0] ?? '?').toUpperCase()
  return (
    <div
      aria-hidden
      className="flex flex-shrink-0 items-center justify-center rounded-[12px] bg-bg-2 font-bold text-ink-3"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        letterSpacing: '-0.03em',
      }}
    >
      {letter}
    </div>
  )
}
