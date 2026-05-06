const PALETTE = [
  { bg: '#f4c9b8', fg: '#b43a1b' },
  { bg: '#cce4cf', fg: '#2f7a3a' },
  { bg: '#c5dde8', fg: '#3a6e8a' },
  { bg: '#f5dfa7', fg: '#b67a12' },
  { bg: '#ead4e0', fg: '#8a2e4a' },
]

interface Props {
  name: string
  size?: number
}

export function ProductThumb({ name, size = 48 }: Props) {
  const p = PALETTE[name.charCodeAt(0) % PALETTE.length]
  const letter = (name[0] ?? '?').toUpperCase()
  return (
    <div
      className="rounded-md flex items-center justify-center flex-shrink-0 italic font-normal"
      style={{
        width: size,
        height: size,
        background: p.bg,
        color: p.fg,
        fontSize: size * 0.5,
        fontFamily: 'Georgia, "Instrument Serif", serif',
        border: '1px solid rgba(0,0,0,0.04)',
      }}
    >
      {letter}
    </div>
  )
}
