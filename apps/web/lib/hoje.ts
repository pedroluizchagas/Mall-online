import { horarioDeHoje, minutosDoDia, relogioDaLoja } from '@mallevo/lib'

/**
 * "Hoje" no relógio da loja (Divinópolis), não no do servidor — a Vercel roda
 * em UTC, e `setHours(0)` lá começa o dia às 21h de ontem daqui. Mesmo
 * cuidado do `relogioDaLoja` da lib.
 */

const pad = (n: number) => String(n).padStart(2, '0')

/** ISO do início do dia na loja. America/Sao_Paulo: UTC−3 fixo desde 2019. */
export function inicioDoDiaDaLoja(agora: Date = new Date()): string {
  const r = relogioDaLoja(agora)
  return `${r.getFullYear()}-${pad(r.getMonth() + 1)}-${pad(r.getDate())}T00:00:00-03:00`
}

/** A hora (0–23) de um instante no relógio da loja. */
export function horaDaLoja(iso: string | Date): number {
  return relogioDaLoja(typeof iso === 'string' ? new Date(iso) : iso).getHours()
}

/** "quinta, 15 de outubro" no relógio da loja. */
export function dataPorExtenso(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Sao_Paulo',
  })
    .format(agora)
    .replace('-feira', '')
}

/**
 * As horas do expediente de hoje para o gráfico de movimento: do horário de
 * abertura ao de fechamento (turno que cruza a meia-noite para nas 23h). Sem
 * horário cadastrado, 8h–22h. Horas com pedido fora da faixa entram nela.
 */
export function horasDoExpediente(horarios: unknown, agora: Date, horasComPedido: number[]): number[] {
  const hoje = horarioDeHoje(horarios, relogioDaLoja(agora))
  let inicio = 8
  let fim = 22
  if (hoje) {
    const abre = minutosDoDia(hoje.abre)
    const fecha = minutosDoDia(hoje.fecha)
    inicio = Math.floor(abre / 60)
    fim = fecha > abre ? Math.ceil(fecha / 60) - 1 : 23
  }
  for (const h of horasComPedido) {
    inicio = Math.min(inicio, h)
    fim = Math.max(fim, h)
  }
  const horas: number[] = []
  for (let h = inicio; h <= fim; h++) horas.push(h)
  return horas
}
