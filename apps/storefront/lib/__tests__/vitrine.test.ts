import { describe, expect, it } from 'vitest'
import { resolveVitrineDaLoja, vitrineTemDesktop } from '../vitrine'

describe('resolveVitrineDaLoja', () => {
  it('preset v2 + categoria elegível → vitrine', () => {
    expect(resolveVitrineDaLoja({ theme: { v: 2, preset: 'slice' }, categoria_slug: 'alimentos-bebidas' })).toBe('forno')
    expect(resolveVitrineDaLoja({ theme: { v: 2, preset: 'fresh', palette: 'x' }, categoria_slug: 'mercado-conveniencia' })).toBe('feira')
  })
  it('sem tema, tema v1 ou categoria fora do gate → padrão', () => {
    expect(resolveVitrineDaLoja({ theme: null, categoria_slug: 'alimentos-bebidas' })).toBeNull()
    expect(resolveVitrineDaLoja({ theme: { template: 'neon' }, categoria_slug: 'vestuario-calcados' })).toBeNull()
    expect(resolveVitrineDaLoja({ theme: { v: 2, preset: 'noir' }, categoria_slug: 'acessorios-joias' })).toBeNull()
    expect(resolveVitrineDaLoja({ theme: { v: 2, preset: 'tech' }, categoria_slug: 'eletronicos-tecnologia' })).toBeNull()
  })
})

describe('vitrineTemDesktop', () => {
  it('layout padrão e vitrines com composição de computador ocupam a tela', () => {
    expect(vitrineTemDesktop(null)).toBe(true)
    expect(vitrineTemDesktop('artesa')).toBe(true)
  })
  it('vitrine só de celular continua na coluna', () => {
    expect(vitrineTemDesktop('forno')).toBe(false)
    expect(vitrineTemDesktop('passarela')).toBe(false)
  })
})
