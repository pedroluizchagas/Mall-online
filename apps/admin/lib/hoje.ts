import { relogioDaLoja } from '@mallevo/lib'

/**
 * "Hoje" e "este mês" no relógio de Divinópolis, não no do servidor — a
 * Vercel roda em UTC, e `setHours(0)` lá começa o dia às 21h de ontem daqui
 * (o mesmo cuidado de apps/web/lib/hoje.ts). America/Sao_Paulo é UTC−3 fixo
 * desde 2019, então os limites saem como ISO com `-03:00`.
 */

const FUSO = '-03:00'
const pad = (n: number) => String(n).padStart(2, '0')

/** Um mês no formato da URL e das consultas: "2026-10". */
export type Mes = `${number}-${string}`

/** ISO do início do dia em Divinópolis. */
export function inicioDoDia(agora: Date = new Date()): string {
  const r = relogioDaLoja(agora)
  return `${r.getFullYear()}-${pad(r.getMonth() + 1)}-${pad(r.getDate())}T00:00:00${FUSO}`
}

/** O mês corrente em Divinópolis ("2026-10"). */
export function mesAtual(agora: Date = new Date()): Mes {
  const r = relogioDaLoja(agora)
  return `${r.getFullYear()}-${pad(r.getMonth() + 1)}` as Mes
}

/** `?mes=` vem da URL: só "AAAA-MM" com mês de 01 a 12 passa. */
export function mesValido(valor: unknown): valor is Mes {
  return typeof valor === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(valor)
}

/** O mês deslocado de `delta` meses ("2026-01", −1 → "2025-12"). */
export function somarMeses(mes: Mes, delta: number): Mes {
  const [ano, m] = mes.split('-').map(Number)
  const total = ano * 12 + (m - 1) + delta
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}` as Mes
}

/** Limites do mês em Divinópolis: `[inicio, fim)`, ISO com fuso. */
export function intervaloDoMes(mes: Mes): { inicio: string; fim: string } {
  return {
    inicio: `${mes}-01T00:00:00${FUSO}`,
    fim: `${somarMeses(mes, 1)}-01T00:00:00${FUSO}`,
  }
}

/** Os últimos `n` meses, do mais antigo ao corrente. */
export function ultimosMeses(n: number, agora: Date = new Date()): Mes[] {
  const atual = mesAtual(agora)
  return Array.from({ length: n }, (_, i) => somarMeses(atual, i - (n - 1)))
}

/** O mês (em Divinópolis) de um instante do banco. */
export function mesDoInstante(iso: string): Mes {
  return mesAtual(new Date(iso))
}

const NOMES_MES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

/** "outubro de 2026" — ou "out" (curto, para o eixo do gráfico). */
export function rotuloDoMes(mes: Mes, formato: 'longo' | 'curto' = 'longo'): string {
  const [ano, m] = mes.split('-').map(Number)
  const nome = NOMES_MES[m - 1] ?? ''
  return formato === 'curto' ? nome.slice(0, 3) : `${nome} de ${ano}`
}

/** "sábado, 17 de outubro" no relógio de Divinópolis. */
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

/** A hora (0–23) de agora em Divinópolis. */
export function horaDeDivinopolis(agora: Date = new Date()): number {
  return relogioDaLoja(agora).getHours()
}
