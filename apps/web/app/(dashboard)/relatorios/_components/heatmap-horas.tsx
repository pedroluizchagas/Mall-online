import { Card } from '@/components/ui/card'

/**
 * Heatmap dia da semana × hora (04 §4.2, aba Visão geral): onde os pedidos
 * se concentram. Intensidade = pedidos na célula / máximo do período.
 */

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const HORA_INICIO = 8
const HORA_FIM = 23 // inclusive

export function HeatmapHoras({ pedidos }: { pedidos: { criado_em: string }[] }) {
  const horas: number[] = []
  for (let h = HORA_INICIO; h <= HORA_FIM; h++) horas.push(h)

  // matriz [dia][hora] = contagem
  const matriz: number[][] = DIAS.map(() => horas.map(() => 0))
  let maximo = 0
  for (const p of pedidos) {
    const d = new Date(p.criado_em)
    const hora = d.getHours()
    if (hora < HORA_INICIO || hora > HORA_FIM) continue
    const celula = ++matriz[d.getDay()][hora - HORA_INICIO]
    if (celula > maximo) maximo = celula
  }

  return (
    <Card>
      <h2 className="font-bold text-base text-ink mb-1">Pedidos por dia e hora</h2>
      <p className="text-xs text-ink-3 mb-4">
        Concentração de pedidos no período — células mais escuras = mais pedidos.
      </p>
      {maximo === 0 ? (
        <p className="text-sm text-ink-3">Sem pedidos no período.</p>
      ) : (
        <div className="overflow-x-auto">
          <div
            className="grid gap-[3px] min-w-[560px]"
            style={{ gridTemplateColumns: `44px repeat(${horas.length}, 1fr)` }}
          >
            {/* Cabeçalho de horas */}
            <span />
            {horas.map((h) => (
              <span key={h} className="text-[10px] text-ink-3 text-center tabular-nums">
                {h}h
              </span>
            ))}

            {DIAS.map((dia, di) => (
              <HeatmapLinha key={dia} dia={dia} valores={matriz[di]} maximo={maximo} />
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

function HeatmapLinha({
  dia,
  valores,
  maximo,
}: {
  dia: string
  valores: number[]
  maximo: number
}) {
  return (
    <>
      <span className="text-[11px] text-ink-3 font-medium self-center">{dia}</span>
      {valores.map((v, i) => {
        const intensidade = maximo === 0 ? 0 : v / maximo
        return (
          <span
            key={i}
            title={`${dia} ${i + 8}h — ${v} pedido${v === 1 ? '' : 's'}`}
            className="h-6 rounded-[4px]"
            style={{
              background:
                v === 0
                  ? 'var(--bg-2)'
                  : `color-mix(in srgb, var(--brick) ${Math.round(20 + intensidade * 80)}%, var(--bg-2))`,
            }}
          />
        )
      })}
    </>
  )
}
