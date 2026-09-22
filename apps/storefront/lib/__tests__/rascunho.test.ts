/**
 * O `/preview?draft=` é a única rota do storefront que aceita tema e conteúdo
 * vindos da URL. Estes testes fixam o contrato de segurança dele (achado A-01
 * da auditoria de 2026-09-21): rascunho hostil não muda a pele publicada.
 */
import { describe, expect, it } from 'vitest'
import { resolveTheme, textoCssDasVars, toCssVars } from '@mallevo/lib'

import { aplicarRascunho, decodificarRascunho } from '../rascunho'
import type { Store } from '../tenant'

const XSS = 'red}</style><script>alert(document.cookie)</script><style>'

const LOJA = {
  id: 'loja-1',
  slug: 'guaimbe',
  nome: 'Guaimbês',
  theme: { v: 2, preset: 'artisan' },
  conteudo: null,
  categoria_slug: 'floricultura-plantas',
} as unknown as Store

function draft(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url')
}

describe('decodificarRascunho', () => {
  it('base64url válido vira objeto', () => {
    expect(decodificarRascunho(draft({ categoria: 'alimentos-bebidas' }))).toEqual({
      categoria: 'alimentos-bebidas',
    })
  })

  it('lixo, vazio, array e payload gigante → null', () => {
    expect(decodificarRascunho(undefined)).toBeNull()
    expect(decodificarRascunho('%%%nao-e-base64')).toBeNull()
    expect(decodificarRascunho(draft(['a']))).toBeNull()
    expect(decodificarRascunho(draft({ lixo: 'x'.repeat(20_000) }))).toBeNull()
  })
})

describe('aplicarRascunho', () => {
  it('tema válido do rascunho vence o publicado', () => {
    const store = aplicarRascunho(LOJA, { theme: { v: 2, preset: 'smash', palette: 'vinha' } })
    expect(store.theme).toEqual({ v: 2, preset: 'smash', palette: 'vinha' })
  })

  it('tema sem preset válido mantém o publicado', () => {
    expect(aplicarRascunho(LOJA, { theme: { preset: 'nao-existe' } }).theme).toBe(LOJA.theme)
    expect(aplicarRascunho(LOJA, { theme: 'artisan' }).theme).toBe(LOJA.theme)
  })

  it('cor hostil no rascunho não chega ao CSS do documento', () => {
    const store = aplicarRascunho(LOJA, {
      theme: { v: 2, preset: 'smash', color: { accent: XSS, ink: '#101010' } },
    })
    const css = textoCssDasVars(toCssVars(resolveTheme(store.theme)))
    expect(css).not.toContain('<script>')
    expect(css).not.toContain('</style>')
    expect(css.match(/[{}]/g)).toEqual(['{', '}'])
    expect(css).toContain('--ink:#101010') // o override são sobreviveu
  })

  it('shape inválido não derruba a página (A-02)', () => {
    const store = aplicarRascunho(LOJA, { theme: { v: 2, preset: 'smash', shape: { radius: 'nope' } } })
    expect(() => toCssVars(resolveTheme(store.theme))).not.toThrow()
  })

  it('categoria só passa como slug plausível', () => {
    expect(aplicarRascunho(LOJA, { categoria: 'alimentos-bebidas' }).categoria_slug).toBe('alimentos-bebidas')
    expect(aplicarRascunho(LOJA, { categoria: '../../etc' }).categoria_slug).toBe(LOJA.categoria_slug)
  })

  it('conteúdo do rascunho passa pelo normalizador da lib', () => {
    const store = aplicarRascunho(LOJA, {
      conteudo: { v: 1, campanha: { eyebrow: 'QA', titulo: 'Título' }, destaques: 'lixo' },
    })
    expect(store.conteudo).toMatchObject({ campanha: { titulo: 'Título' } })
  })

  it('sem rascunho, a loja passa intacta', () => {
    expect(aplicarRascunho(LOJA, null)).toBe(LOJA)
  })
})
