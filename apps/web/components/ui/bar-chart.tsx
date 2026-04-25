'use client'

import { useEffect, useState } from 'react'

interface Bar {
  h: string
  n: number
}

interface Props {
  data: Bar[]
  height?: number
  autoplay?: boolean
}

export function BarChart({ data, height = 120, autoplay = true }: Props) {
  const [activeIdx, setActiveIdx] = useState(-1)

  useEffect(() => {
    if (!autoplay || !data.length) return
    const i = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % data.length)
    }, 1800)
    return () => clearInterval(i)
  }, [autoplay, data.length])

  const max = Math.max(...data.map((d) => d.n), 1)

  return (
    <div className="flex items-end gap-1.5 relative" style={{ height, padding: '4px 0' }}>
      {data.map((d, i) => (
        <div
          key={i}
          className="flex-1 flex flex-col items-center gap-1.5 cursor-pointer h-full justify-end"
          onMouseEnter={() => setActiveIdx(i)}
        >
          <div
            className="w-full rounded-md relative transition-all duration-300"
            style={{
              height: `${(d.n / max) * 100}%`,
              background: i === activeIdx ? 'var(--brick-dk)' : 'var(--brick)',
              minHeight: 4,
            }}
          >
            {i === activeIdx && (
              <div
                className="absolute left-1/2 -translate-x-1/2 px-2 py-1 rounded-md whitespace-nowrap font-bold"
                style={{
                  top: -32,
                  background: 'var(--ink)',
                  color: 'var(--bg)',
                  fontSize: 10,
                }}
              >
                {d.n} pedidos
              </div>
            )}
          </div>
          <div className="text-[10px] text-ink-3 font-medium">{d.h}</div>
        </div>
      ))}
    </div>
  )
}
