'use client'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const DADOS = [
  { gmv: 8200, comissao: 2600 },
  { gmv: 9100, comissao: 2900 },
  { gmv: 7800, comissao: 2400 },
  { gmv: 10400, comissao: 3300 },
  { gmv: 9800, comissao: 3100 },
  { gmv: 11200, comissao: 3600 },
  { gmv: 10800, comissao: 3400 },
  { gmv: 9200, comissao: 2900 },
  { gmv: 12000, comissao: 3800 },
  { gmv: 8600, comissao: 2700 },
  { gmv: 11600, comissao: 3700 },
  { gmv: 13200, comissao: 4200 },
]

const MAX = Math.max(...DADOS.map((d) => d.gmv))
const CHART_H = 190

export function GraficoGMV() {
  const mesAtual = new Date().getMonth()

  return (
    <div>
      <div className="flex gap-3">
        {/* Y-axis */}
        <div
          className="flex flex-col justify-between items-end pr-2 pb-6 text-[10px] text-ink-3 select-none"
          style={{ height: CHART_H }}
        >
          {[MAX, MAX * 0.75, MAX * 0.5, MAX * 0.25, 0].map((v, i) => (
            <span key={i}>{(v / 1000).toFixed(0)}K</span>
          ))}
        </div>

        {/* Bars */}
        <div className="flex-1">
          <div className="relative" style={{ height: CHART_H }}>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
              <div
                key={pct}
                className="absolute w-full border-t border-line"
                style={{ bottom: `${pct * 100}%` }}
              />
            ))}

            {/* Bar columns */}
            <div className="absolute inset-0 flex items-end">
              {DADOS.map((dado, i) => {
                const hGmv = (dado.gmv / MAX) * 100
                const hComissao = (dado.comissao / MAX) * 100
                const isActive = i === mesAtual

                return (
                  <div
                    key={i}
                    className="flex-1 flex items-end justify-center gap-[2px] px-[3px] group relative"
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block
                      text-[11px] rounded-lg px-3 py-2 whitespace-nowrap z-20
                      pointer-events-none"
                      style={{
                        background: 'var(--ink)',
                        color: 'var(--bg)',
                        boxShadow: 'var(--shadow-lg)',
                      }}
                    >
                      <p className="font-semibold text-brick">GMV R$ {(dado.gmv / 1000).toFixed(1)}K</p>
                      <p className="text-ink-3" style={{ color: 'rgba(245,245,240,0.55)' }}>
                        Comissão R$ {(dado.comissao / 1000).toFixed(1)}K
                      </p>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent"
                        style={{ borderTopColor: 'var(--ink)' }} />
                    </div>

                    {/* GMV bar */}
                    <div
                      className="w-[42%] rounded-t-sm transition-all duration-200"
                      style={{
                        height: `${hGmv}%`,
                        background: isActive
                          ? 'var(--brick)'
                          : 'rgba(193,241,72,0.25)',
                      }}
                    />
                    {/* Comissão bar */}
                    <div
                      className="w-[42%] rounded-t-sm transition-all duration-200"
                      style={{
                        height: `${hComissao}%`,
                        background: isActive
                          ? 'var(--brick-dk)'
                          : 'rgba(163,210,42,0.18)',
                      }}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* X-axis labels */}
          <div className="flex mt-2">
            {MESES.map((mes, i) => (
              <div
                key={i}
                className={`flex-1 text-center text-[10px] ${
                  i === mesAtual ? 'text-brick-dk font-semibold' : 'text-ink-3'
                }`}
              >
                {mes}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-4 pl-9">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm bg-brick" />
          <span className="text-[13px] text-ink-3">GMV</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm bg-brick-dk" />
          <span className="text-[13px] text-ink-3">Comissão</span>
        </div>
      </div>
    </div>
  )
}
