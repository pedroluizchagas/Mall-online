/**
 * Horários de funcionamento (`stores.horarios` JSONB) — leitura compartilhada.
 *
 * Shape persistido: `{ seg?: {abre:'08:00', fecha:'18:00'} | null, ..., dom? }`
 * (`HorariosFuncionamento` em @mallevo/types). Dia ausente ou `null` = fechado.
 * Um fecha ≤ abre significa que o turno cruza a meia-noite ("18:00"–"02:00").
 *
 * Antes deste módulo, quatro vitrines do consumer calculavam isso cada uma
 * do seu jeito e o layout padrão + storefront escreviam "Aberto" literal.
 */
import type { HorariosFuncionamento } from '@mallevo/types'

/** Ordem de `Date.getDay()` — chaves de `stores.horarios`. */
export const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const
export type DiaSemana = (typeof DIAS_SEMANA)[number]

export interface Horario {
  abre: string
  fecha: string
}

/** Fuso das lojas (Divinópolis/MG). Sem horário de verão desde 2019. */
export const FUSO_LOJA = 'America/Sao_Paulo'

/**
 * "Agora" no relógio da loja: um `Date` cujos getters LOCAIS (`getDay`,
 * `getHours`…) refletem a hora de parede em `timeZone`. Necessário no servidor
 * (Vercel roda em UTC) e para o visitante fora do fuso — `abertoAgora` e
 * `horarioDeHoje` leem getters locais.
 */
export function relogioDaLoja(agora: Date = new Date(), timeZone: string = FUSO_LOJA): Date {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(agora)
  const pegar = (tipo: Intl.DateTimeFormatPartTypes) =>
    Number(partes.find((p) => p.type === tipo)?.value ?? 0)
  // Alguns motores devolvem "24" à meia-noite com hour12:false.
  const hora = pegar('hour') % 24
  return new Date(
    pegar('year'),
    pegar('month') - 1,
    pegar('day'),
    hora,
    pegar('minute'),
    pegar('second'),
  )
}

const RE_HORA = /^([01]?\d|2[0-3]):([0-5]\d)$/

function horaValida(v: unknown): v is string {
  return typeof v === 'string' && RE_HORA.test(v)
}

/** "HH:MM" → minutos desde 00:00. Assume entrada já validada. */
export function minutosDoDia(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/**
 * JSON do banco → `HorariosFuncionamento` saneado. Nunca lança: entradas
 * inválidas viram dia fechado; nada reconhecível → `null` (sem horários).
 */
export function normalizarHorarios(raw: unknown): HorariosFuncionamento | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const obj = raw as Record<string, unknown>
  const out: HorariosFuncionamento = {}
  let algum = false
  for (const dia of DIAS_SEMANA) {
    const v = obj[dia]
    if (v && typeof v === 'object') {
      const { abre, fecha } = v as Record<string, unknown>
      if (horaValida(abre) && horaValida(fecha)) {
        out[dia] = { abre, fecha }
        algum = true
        continue
      }
    }
    out[dia] = null
  }
  return algum ? out : null
}

/** Horário do dia de `agora` (`null` = fechado hoje ou sem horários). */
export function horarioDeHoje(raw: unknown, agora: Date = new Date()): Horario | null {
  const horarios = normalizarHorarios(raw)
  if (!horarios) return null
  return horarios[DIAS_SEMANA[agora.getDay()]] ?? null
}

/**
 * Está aberta agora? `null` = a loja não informou horários (o chamador decide
 * o que mostrar — não inventar "Aberto"). Considera turno que cruza a
 * meia-noite, inclusive o da véspera ainda em curso.
 */
export function abertoAgora(raw: unknown, agora: Date = new Date()): boolean | null {
  const horarios = normalizarHorarios(raw)
  if (!horarios) return null

  const minutos = agora.getHours() * 60 + agora.getMinutes()
  const hoje = horarios[DIAS_SEMANA[agora.getDay()]]
  if (hoje) {
    const abre = minutosDoDia(hoje.abre)
    const fecha = minutosDoDia(hoje.fecha)
    if (fecha > abre) {
      if (minutos >= abre && minutos < fecha) return true
    } else if (minutos >= abre) {
      // Turno noturno de hoje já começou. A madrugada (antes de `fecha`)
      // pertence ao turno da VÉSPERA — checado abaixo.
      return true
    }
  }

  // Véspera com turno que cruzou a meia-noite e ainda não fechou.
  const ontem = horarios[DIAS_SEMANA[(agora.getDay() + 6) % 7]]
  if (ontem) {
    const abre = minutosDoDia(ontem.abre)
    const fecha = minutosDoDia(ontem.fecha)
    if (fecha <= abre && minutos < fecha) return true
  }

  return false
}

/** "08:00–18:00" (travessão), para letreiros. */
export function formatarHorario(h: Horario): string {
  return `${h.abre}–${h.fecha}`
}
