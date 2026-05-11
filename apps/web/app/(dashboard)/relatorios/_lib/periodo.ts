export type Periodo = '7d' | '30d' | '90d' | 'mes_atual'

export const PERIODOS_VALIDOS: Periodo[] = ['7d', '30d', '90d', 'mes_atual']

export const ROTULOS_PERIODO: Record<Periodo, string> = {
  '7d': '7 dias',
  '30d': '30 dias',
  '90d': '90 dias',
  mes_atual: 'Mês atual',
}

export function periodoValido(v: string | undefined): Periodo {
  return (PERIODOS_VALIDOS as string[]).includes(v ?? '') ? (v as Periodo) : '30d'
}

export interface IntervaloDatas { inicio: Date; fim: Date }

export function intervaloPeriodo(periodo: Periodo, agora: Date = new Date()): IntervaloDatas {
  const fim = new Date(agora)
  if (periodo === 'mes_atual') {
    const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1, 0, 0, 0, 0)
    return { inicio, fim }
  }
  const dias = periodo === '7d' ? 7 : periodo === '30d' ? 30 : 90
  const inicio = new Date(fim.getTime() - dias * 24 * 60 * 60 * 1000)
  return { inicio, fim }
}

export function intervaloAnterior(intervalo: IntervaloDatas): IntervaloDatas {
  const duracao = intervalo.fim.getTime() - intervalo.inicio.getTime()
  return {
    inicio: new Date(intervalo.inicio.getTime() - duracao),
    fim: new Date(intervalo.inicio.getTime()),
  }
}
