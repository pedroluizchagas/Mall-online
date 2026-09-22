import { describe, expect, it } from 'vitest'
import {
  FUSO_LOJA,
  abertoAgora,
  relogioDaLoja,
  formatarHorario,
  horarioDeHoje,
  normalizarHorarios,
  statusAbertura,
  turnoEmCurso,
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

describe('statusAbertura', () => {
  it('aberta → "Aberto até"; antes de abrir → "Abre às"; depois → "Fechado agora"', () => {
    expect(statusAbertura(COMERCIAL, qua(10))).toEqual({ aberta: true, texto: 'Aberto até 18:00' })
    expect(statusAbertura(COMERCIAL, qua(7))).toEqual({ aberta: false, texto: 'Abre às 08:00' })
    expect(statusAbertura(COMERCIAL, qua(19))).toEqual({ aberta: false, texto: 'Fechado agora' })
  })
  it('sem horários → null (não inventa "Aberto")', () => {
    expect(statusAbertura(null, qua(10))).toBeNull()
  })
})

describe('turno da véspera manda no "até" (achado A-18)', () => {
  // Sexta 22:00–02:00, sábado 10:00–18:00. À 01:00 de sábado quem está aberto
  // é o turno da SEXTA — o letreiro dizia "Aberto até 18:00" (o fecha do dia
  // corrente), que é o horário de quem ainda nem abriu.
  const CRUZA = { sex: { abre: '22:00', fecha: '02:00' }, sab: { abre: '10:00', fecha: '18:00' } }
  const sabadoAs = (h: number) => new Date(2026, 8, 19, h, 0, 0) // 2026-09-19 é sábado

  it('madrugada de sábado: fecha às 02:00, não às 18:00', () => {
    expect(statusAbertura(CRUZA, sabadoAs(1))).toEqual({ aberta: true, texto: 'Aberto até 02:00' })
  })

  it('depois de fechar e antes de abrir, volta a falar do dia', () => {
    expect(statusAbertura(CRUZA, sabadoAs(3))).toEqual({ aberta: false, texto: 'Abre às 10:00' })
    expect(statusAbertura(CRUZA, sabadoAs(12))).toEqual({ aberta: true, texto: 'Aberto até 18:00' })
  })

  it('turnoEmCurso distingue sem horários (undefined) de fechada (null)', () => {
    expect(turnoEmCurso(null, sabadoAs(12))).toBeUndefined()
    expect(turnoEmCurso(CRUZA, sabadoAs(3))).toBeNull()
    expect(turnoEmCurso(CRUZA, sabadoAs(1))).toEqual({ abre: '22:00', fecha: '02:00' })
  })
})
