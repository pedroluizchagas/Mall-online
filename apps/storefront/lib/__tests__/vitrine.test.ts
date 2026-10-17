import { describe, expect, it } from 'vitest'
import { resolveVitrineDaLoja, vitrineTemDesktop } from '../vitrine'

describe('resolveVitrineDaLoja', () => {
  it('preset v2 com vitrine → a vitrine dele, em qualquer ramo', () => {
    expect(resolveVitrineDaLoja({ theme: { v: 2, preset: 'slice' } })).toBe('forno')
    expect(resolveVitrineDaLoja({ theme: { v: 2, preset: 'fresh', palette: 'x' } })).toBe('feira')
    // Noir numa joalheria: antes do 2026-10-17 caía no layout padrão.
    expect(resolveVitrineDaLoja({ theme: { v: 2, preset: 'noir' } })).toBe('noir')
  })
  it('sem tema, tema v1 ou estilo sem vitrine → padrão', () => {
    expect(resolveVitrineDaLoja({ theme: null })).toBeNull()
    expect(resolveVitrineDaLoja({ theme: { template: 'neon' } })).toBeNull()
    expect(resolveVitrineDaLoja({ theme: { v: 2, preset: 'tech' } })).toBeNull()
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
