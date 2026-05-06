interface Props {
  label: string
  count: number
  color: string
  bg: string
  live?: boolean
}

export function StatusBucket({ label, count, color, bg, live }: Props) {
  return (
    <div
      className="rounded-lg relative overflow-hidden"
      style={{ padding: 14, background: bg }}
    >
      {live && (
        <div className="absolute top-2.5 right-2.5">
          <span
            className="pulse-dot inline-block rounded-full"
            style={{ background: color, width: 6, height: 6 }}
          />
        </div>
      )}
      <div className="text-[11px] font-semibold" style={{ color, opacity: 0.75 }}>
        {label}
      </div>
      <div
        className="font-display mt-0.5 leading-none"
        style={{ fontSize: 30, color }}
      >
        {count}
      </div>
    </div>
  )
}
