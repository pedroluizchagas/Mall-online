import { Card } from '@/components/ui/card'
import { BarChart } from '@/components/ui/bar-chart'

interface Props {
  hourly: { h: string; n: number }[]
  pico: { h: string; n: number }
  agora: number
}

export function MovimentoCard({ hourly, pico, agora }: Props) {
  return (
    <Card className="!p-[22px]">
      <div className="mb-2">
        <h3 className="m-0 text-[17px] font-bold tracking-tight">Movimento do dia</h3>
        <div className="text-ink-3 text-xs">pedidos por hora</div>
      </div>

      <div className="mt-5">
        <BarChart data={hourly} />
      </div>

      <div
        className="mt-4 pt-4 flex justify-between border-t"
        style={{ borderColor: 'var(--line)' }}
      >
        <div>
          <div className="text-[10px] text-ink-3 uppercase font-semibold tracking-wider">Pico</div>
          <div className="font-bold text-[15px] mt-0.5">
            {pico.h} <span className="text-ink-3 font-normal">· {pico.n}</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] text-ink-3 uppercase font-semibold tracking-wider">Agora</div>
          <div className="font-bold text-[15px] mt-0.5" style={{ color: 'var(--brick-dk)' }}>
            {agora} pedidos
          </div>
        </div>
      </div>
    </Card>
  )
}
