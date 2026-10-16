interface Props {
  data: number[]
  color?: string
  height?: number
  fill?: boolean
}

/**
 * Linha fina de tendência. Traço em tinta (lima não se lê sobre branco); o
 * último ponto — o agora — é o micro-momento aceso: ponto accent com aro de
 * tinta. O ponto é HTML posicionado, não `<circle>`: o SVG estica sem manter
 * proporção e o círculo viraria elipse.
 */
export function Sparkline({ data, color = 'var(--ink)', height = 40, fill = true }: Props) {
  if (!data.length) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const w = 100
  const h = 100
  const step = w / (data.length - 1 || 1)
  const plano = max === min
  const points = data.map((v, i) => [i * step, plano ? h - 8 : h - ((v - min) / (max - min)) * h * 0.82 - 8] as const)
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ')
  const fillPath = `${path} L${w},${h} L0,${h} Z`
  const last = points[points.length - 1]

  return (
    <div className="relative w-full" style={{ height }}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="block h-full w-full" aria-hidden>
        {fill && <path d={fillPath} fill={color} fillOpacity={0.06} />}
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span
        aria-hidden
        className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          left: `${last[0]}%`,
          top: `${last[1]}%`,
          background: 'var(--brick)',
          boxShadow: `0 0 0 2px ${color}`,
        }}
      />
    </div>
  )
}
