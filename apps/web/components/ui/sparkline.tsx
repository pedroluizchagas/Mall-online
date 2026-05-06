interface Props {
  data: number[]
  color?: string
  height?: number
  fill?: boolean
}

export function Sparkline({ data, color = 'var(--brick)', height = 40, fill = true }: Props) {
  if (!data.length) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const w = 100
  const h = 100
  const step = w / (data.length - 1 || 1)
  const points = data.map((v, i) => [i * step, h - ((v - min) / (max - min || 1)) * h * 0.9 - 5] as const)
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ')
  const fillPath = `${path} L${w},${h} L0,${h} Z`
  const last = points[points.length - 1]
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
      {fill && <path d={fillPath} fill={color} opacity="0.12" />}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last[0]} cy={last[1]} r="2" fill={color} />
    </svg>
  )
}
