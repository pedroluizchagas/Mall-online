import { describe, expect, it } from 'vitest'
import { CONTEUDO_LIMITES, hasConteudo, normalizeStoreConteudo, storeConteudoSchema } from '../conteudo'

const UUID = '6f1a2b3c-4d5e-4f60-8a7b-9c0d1e2f3a4b'

describe('normalizeStoreConteudo', () => {
  it('nulo/lixo → envelope vazio, nunca lança', () => {
    expect(normalizeStoreConteudo(null)).toEqual({ v: 1 })
    expect(normalizeStoreConteudo('x')).toEqual({ v: 1 })
    expect(normalizeStoreConteudo([1])).toEqual({ v: 1 })
    expect(hasConteudo(normalizeStoreConteudo(null))).toBe(false)
  })

  it('v1 válido passa inteiro (com trim)', () => {
    const c = normalizeStoreConteudo({
      v: 1,
      campanha: { eyebrow: ' Só hoje ', titulo: 'Pizza em dobro', cta: 'Ver cardápio' },
      manifesto: 'Massa de fermentação longa.',
      galeria_casa: ['https://x.supabase.co/storage/v1/object/public/store-assets/a.jpg'],
      destaques: [UUID],
    })
    expect(c.campanha?.eyebrow).toBe('Só hoje')
    expect(c.destaques).toEqual([UUID])
    expect(hasConteudo(c)).toBe(true)
  })

  it('recupera campo a campo: um destaque corrompido não apaga a campanha', () => {
    const c = normalizeStoreConteudo({
      v: 1,
      campanha: { titulo: 'Nova coleção' },
      destaques: ['nao-e-uuid'],
      manifesto: 'x'.repeat(CONTEUDO_LIMITES.manifesto + 1),
    })
    expect(c.campanha?.titulo).toBe('Nova coleção')
    expect(c.destaques).toBeUndefined()
    expect(c.manifesto).toBeUndefined()
  })

  it('campanha sem título é inválida', () => {
    expect(storeConteudoSchema.safeParse({ v: 1, campanha: { eyebrow: 'x' } }).success).toBe(false)
  })
})
