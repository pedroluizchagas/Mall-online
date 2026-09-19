import { describe, expect, it } from 'vitest'
import {
  FUSO_LOJA,
  abertoAgora,
  relogioDaLoja,
  formatarHorario,
  horarioDeHoje,
  normalizarHorarios,
} from '../horarios'

// 2026-09-16 é quarta-feira.
const qua = (h: number, m = 0) => new Date(2026, 8, 16, h, m)
const qui = (h: number, m = 0) => new Date(2026, 8, 17, h, m)

const COMERCIAL = { qua: { abre: '08:00', fecha: '18:00' }, qui: { abre: '08:00', fecha: '18:00' } }
const NOTURNO = { qua: { abre: '18:00', fecha: '02:00' } }

describe('normalizarHorarios', () => {
  it('sanea JSON do banco', () => {
    const h = normalizarHorarios({ seg: { abre: '9:00', fecha: '18:30' }, ter: null, qua: 'x', sex: { abre: '25:00', fecha: '10:00' } })
    expect(h).toEqual({ seg: { abre: '9:00', fecha: '18:30' }, ter: null, qua: null, qui: null, sex: null, sab: null, dom: null })
  })
  it('nada reconhecível → null', () => {
    expect(normalizarHorarios(null)).toBeNull()
    expect(normalizarHorarios('aberto')).toBeNull()
    expect(normalizarHorarios([])).toBeNull()
    expect(normalizarHorarios({ seg: { abre: 'x', fecha: 'y' } })).toBeNull()
  })
})

describe('horarioDeHoje', () => {
  it('devolve o turno do dia da semana de `agora`', () => {
    expect(horarioDeHoje(COMERCIAL, qua(10))).toEqual({ abre: '08:00', fecha: '18:00' })
    expect(horarioDeHoje({ seg: { abre: '08:00', fecha: '18:00' } }, qua(10))).toBeNull()
    expect(horarioDeHoje(null, qua(10))).toBeNull()
  })
})

describe('abertoAgora', () => {
  it('turno comercial', () => {
    expect(abertoAgora(COMERCIAL, qua(7, 59))).toBe(false)
    expect(abertoAgora(COMERCIAL, qua(8))).toBe(true)
    expect(abertoAgora(COMERCIAL, qua(17, 59))).toBe(true)
    expect(abertoAgora(COMERCIAL, qua(18))).toBe(false)
  })
  it('turno que cruza a meia-noite: aberto à noite E na madrugada seguinte', () => {
    expect(abertoAgora(NOTURNO, qua(17))).toBe(false)
    expect(abertoAgora(NOTURNO, qua(23))).toBe(true)
    expect(abertoAgora(NOTURNO, qui(1))).toBe(true) // véspera ainda em curso
    expect(abertoAgora(NOTURNO, qui(2))).toBe(false)
    expect(abertoAgora(NOTURNO, qui(12))).toBe(false)
  })
  it('madrugada de hoje NÃO conta como turno noturno de hoje se ontem estava fechado', () => {
    expect(abertoAgora({ qui: { abre: '18:00', fecha: '02:00' } }, qui(1))).toBe(false)
  })
  it('sem horários → null (o chamador não inventa "Aberto")', () => {
    expect(abertoAgora(null, qua(10))).toBeNull()
    expect(abertoAgora({}, qua(10))).toBeNull()
  })
  it('dia fechado → false', () => {
    expect(abertoAgora({ seg: { abre: '08:00', fecha: '18:00' } }, qua(10))).toBe(false)
  })
})

describe('formatarHorario', () => {
  it('usa travessão', () => {
    expect(formatarHorario({ abre: '08:00', fecha: '18:00' })).toBe('08:00–18:00')
  })
})

describe('relogioDaLoja', () => {
  it('converte um instante UTC para a hora de parede de São Paulo (UTC−3)', () => {
    // 02:30Z de quarta 16/09 = 23:30 de TERÇA 15/09 em São Paulo.
    const r = relogioDaLoja(new Date('2026-09-16T02:30:00Z'), FUSO_LOJA)
    expect(r.getDay()).toBe(2)
    expect(r.getDate()).toBe(15)
    expect(r.getHours()).toBe(23)
    expect(r.getMinutes()).toBe(30)
  })
  it('meia-noite não vira "24h"', () => {
    const r = relogioDaLoja(new Date('2026-09-16T03:00:00Z'), FUSO_LOJA)
    expect(r.getHours()).toBe(0)
    expect(r.getDate()).toBe(16)
  })
})
