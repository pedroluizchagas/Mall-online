import { describe, expect, it } from 'vitest'
import { lerMetadataProduto, metadataProdutoSchema } from '../metadata-produto'

describe('metadataProdutoSchema', () => {
  it('aceita os campos das vitrines', () => {
    const r = metadataProdutoSchema.safeParse({
      galeria: ['https://a/1.jpg', 'https://a/2.jpg'],
      recorte: 'https://a/cutout.png',
      especificacoes: [['Material', 'Cerâmica'], ['Dimensões', '20 × 12 cm']],
      unidade: 'kg',
      exige_receita: true,
      duracao_min: 45,
    })
    expect(r.success).toBe(true)
  })

  it('mantém chaves desconhecidas (templates novos não quebram leitura)', () => {
    const r = metadataProdutoSchema.safeParse({ campo_futuro: 1 })
    expect(r.success && (r.data as Record<string, unknown>).campo_futuro).toBe(1)
  })

  it('rejeita galeria com URL inválida', () => {
    expect(metadataProdutoSchema.safeParse({ galeria: ['nao-url'] }).success).toBe(false)
  })
})

describe('lerMetadataProduto', () => {
  it('nulo/lixo → {}', () => {
    expect(lerMetadataProduto(null)).toEqual({})
    expect(lerMetadataProduto('x')).toEqual({})
  })

  it('salva os campos bons quando um está corrompido', () => {
    const m = lerMetadataProduto({
      galeria: ['https://a/1.jpg'],
      especificacoes: 'texto solto',
      unidade: 'kg',
      legado: true,
    })
    expect(m.galeria).toEqual(['https://a/1.jpg'])
    expect(m.especificacoes).toBeUndefined()
    expect(m.unidade).toBe('kg')
    expect((m as Record<string, unknown>).legado).toBe(true)
  })
})
