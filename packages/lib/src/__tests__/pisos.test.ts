import { describe, expect, it } from 'vitest'

import {
  NOME_POR_CATEGORIA,
  PISOS,
  PISO_FALLBACK,
  SUBTITULO_POR_PISO,
  VOZ_POR_PISO,
  agruparPorPiso,
  getPiso,
  pisoDaCategoria,
} from '../pisos'
import { CATEGORIA_SLUG_TO_TEMPLATE } from '../templates/mapping'

describe('pisoDaCategoria', () => {
  it('categoria em dois pisos entra no de menor ordem', () => {
    expect(pisoDaCategoria('veterinaria').slug).toBe('saude') // Saúde (3) antes de Pet (5)
    expect(pisoDaCategoria('floricultura-plantas').slug).toBe('casa-vida') // Casa (6) antes de Presentes (9)
  })
  it('sem categoria ou desconhecida cai no fallback', () => {
    expect(pisoDaCategoria(null).slug).toBe(PISO_FALLBACK)
    expect(pisoDaCategoria('outros').slug).toBe(PISO_FALLBACK)
    expect(pisoDaCategoria('nao-existe').slug).toBe(PISO_FALLBACK)
    expect(getPiso(PISO_FALLBACK)).toBeDefined()
  })
})

describe('agruparPorPiso', () => {
  it('uma loja por piso, só pisos com loja, na ordem dos pisos', () => {
    const lojas = [
      { id: 'a', categoria_slug: 'pet-shop' },
      { id: 'b', categoria_slug: 'alimentos-bebidas' },
      { id: 'c', categoria_slug: 'veterinaria' },
      { id: 'd', categoria_slug: null },
    ]
    const corredores = agruparPorPiso(lojas)
    expect(corredores.map((c) => c.piso.slug)).toEqual(['praca-alimentacao', 'saude', 'pet', 'casa-vida'])
    expect(corredores.flatMap((c) => c.itens.map((l) => l.id)).sort()).toEqual(['a', 'b', 'c', 'd'])
    expect(corredores.find((c) => c.piso.slug === 'pet')!.itens.map((l) => l.id)).toEqual(['a'])
  })
  it('vazio → nenhum corredor', () => {
    expect(agruparPorPiso([])).toEqual([])
  })
})

describe('vocabulário', () => {
  it('todo piso tem nome curto, subtítulo e voz', () => {
    for (const p of PISOS) {
      expect(SUBTITULO_POR_PISO[p.slug]).toBeTruthy()
      expect(VOZ_POR_PISO[p.slug]).toBeTruthy()
    }
  })
  it('toda categoria global tem nome de exibição', () => {
    for (const slug of Object.keys(CATEGORIA_SLUG_TO_TEMPLATE)) {
      expect(NOME_POR_CATEGORIA[slug]).toBeTruthy()
    }
  })
})
