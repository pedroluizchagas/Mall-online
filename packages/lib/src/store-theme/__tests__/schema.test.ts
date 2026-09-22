/**
 * Guardas do portão de tema (achados A-01 e A-02 da auditoria de 2026-09-21).
 *
 * O cenário real: o `/preview?draft=` do dashboard aceita um tema vindo da URL,
 * e o `StoreThemeRoot` do storefront concatena os tokens resolvidos num
 * `<style>`. Sem validação, `color.accent = 'red}</style><script>…'` saía
 * literal no HTML do domínio da loja.
 */
import { describe, expect, it } from 'vitest'

import { ARQUETIPOS } from '../presets'
import { resolveTheme, normalizeThemeConfig } from '../resolve'
import { DENSITY_SPACE_PX, RADIUS_STEPS_PX } from '../scales'
import { FAMILIAS_DE_FONTE, parseStoreTheme, storeThemeConfigSchema } from '../schema'
import { textoCssDasVars, toCssVars } from '../to-css-vars'

const XSS = 'red}</style><script>alert(document.cookie)</script><style>'

describe('parseStoreTheme', () => {
  it('sem preset reconhecível → null (o chamador decide o fallback)', () => {
    expect(parseStoreTheme(null)).toBeNull()
    expect(parseStoreTheme({})).toBeNull()
    expect(parseStoreTheme({ preset: 'nao-existe' })).toBeNull()
    expect(parseStoreTheme({ template: 'neon' })).toBeNull() // v1 é tratado no resolve
    expect(parseStoreTheme(['artisan'])).toBeNull()
    expect(parseStoreTheme('artisan')).toBeNull()
  })

  it('tema válido atravessa inteiro', () => {
    expect(
      parseStoreTheme({
        v: 2,
        preset: 'artisan',
        palette: 'barro',
        color: { accent: '#D8FF3E', ink: '#111' },
        fonts: { display: 'Fraunces' },
        shape: { radius: 'round', density: 'compact' },
        mode: 'dark',
      }),
    ).toEqual({
      v: 2,
      preset: 'artisan',
      palette: 'barro',
      color: { accent: '#D8FF3E', ink: '#111' },
      fonts: { display: 'Fraunces' },
      shape: { radius: 'round', density: 'compact' },
      mode: 'dark',
    })
  })

  it('cor hostil ou inválida é descartada SEM levar as outras junto', () => {
    const c = parseStoreTheme({
      preset: 'smash',
      color: { accent: XSS, ink: '#101010', surface: 'javascript:alert(1)' },
    })
    expect(c?.preset).toBe('smash')
    expect(c?.color).toEqual({ ink: '#101010' })
  })

  it('fonte fora do catálogo dos arquétipos não passa', () => {
    expect(parseStoreTheme({ preset: 'noir', fonts: { display: 'Comic Sans MS' } })?.fonts).toBeUndefined()
    expect(
      parseStoreTheme({ preset: 'noir', fonts: { display: 'Inter', body: '"><script>x</script>' } })?.fonts,
    ).toEqual({ display: 'Inter' })
  })

  it('shape desconhecido some (era o 500 do /preview)', () => {
    expect(parseStoreTheme({ preset: 'forno' as never })).toBeNull() // 'forno' é vitrine, não arquétipo
    expect(parseStoreTheme({ preset: 'slice', shape: { radius: 'nope' } })?.shape).toBeUndefined()
    expect(parseStoreTheme({ preset: 'slice', shape: { radius: 'sharp', density: 'x' } })?.shape).toEqual({
      radius: 'sharp',
    })
  })

  it('palette só aceita código de slug curto', () => {
    expect(parseStoreTheme({ preset: 'volt', palette: 'vinha' })?.palette).toBe('vinha')
    expect(parseStoreTheme({ preset: 'volt', palette: '../../etc/passwd' })?.palette).toBeUndefined()
    expect(parseStoreTheme({ preset: 'volt', palette: 'x'.repeat(41) })?.palette).toBeUndefined()
  })

  it('mode inválido some', () => {
    expect(parseStoreTheme({ preset: 'raw', mode: 'neon' })?.mode).toBeUndefined()
  })
})

describe('normalizeThemeConfig continua migrando v1 e caindo no fallback', () => {
  it('v1 legado vira arquétipo', () => {
    expect(normalizeThemeConfig({ template: 'neon' }).preset).toBe('raw')
    expect(normalizeThemeConfig({ template: 'boutique' }).preset).toBe('editorial')
  })
  it('nulo/desconhecido → fallback da plataforma', () => {
    expect(normalizeThemeConfig(null).preset).toBeDefined()
    expect(normalizeThemeConfig({ preset: 'inexistente' }).preset).toBeDefined()
  })
})

describe('resolveTheme não deixa valor hostil chegar aos tokens', () => {
  it('accent hostil cai no accent do arquétipo', () => {
    const tokens = resolveTheme({ v: 2, preset: 'smash', color: { accent: XSS } })
    expect(tokens.color.accent).toBe(ARQUETIPOS.smash.tokens.color.accent)
    expect(JSON.stringify(tokens)).not.toContain('<script>')
  })

  it('shape inválido não quebra o toCssVars (A-02)', () => {
    const tokens = resolveTheme({ v: 2, preset: 'smash', shape: { radius: 'nope' } })
    expect(() => toCssVars(tokens)).not.toThrow()
    expect(toCssVars(tokens)['--radius-sm']).toMatch(/^\d+px$/)
  })
})

describe('textoCssDasVars (defesa em profundidade no sink do <style>)', () => {
  it('monta as declarações no seletor pedido', () => {
    expect(textoCssDasVars({ '--accent': '#D8FF3E', '--radius': '20px' })).toBe(
      ':root{--accent:#D8FF3E;--radius:20px}',
    )
  })

  it('valor que fecha o bloco ou abre tag é DESCARTADO', () => {
    const css = textoCssDasVars({ '--accent': XSS, '--ink': '#101010' })
    // Só a var sã sobra; a chave `}` que resta é a do próprio bloco `:root{…}`.
    expect(css).toBe(':root{--ink:#101010}')
    expect(css).not.toContain('<')
    expect(css.match(/[{}]/g)).toEqual(['{', '}'])
  })

  it('aceita o que os tokens realmente produzem', () => {
    const css = textoCssDasVars({
      '--font-display': '"Plus Jakarta Sans", system-ui, sans-serif',
      '--accent-soft': 'rgba(216, 255, 62, 0.18)',
      '--type-factor': '1.05',
    })
    expect(css).toContain('Plus Jakarta Sans')
    expect(css).toContain('rgba(216, 255, 62, 0.18)')
    expect(css).toContain('1.05')
  })

  it('chave que não é custom property é descartada', () => {
    expect(textoCssDasVars({ 'color:red;x': 'y', '--ok': '#fff' })).toBe(':root{--ok:#fff}')
  })

  it('todo tema de arquétipo sobrevive à sanitização (nenhuma var some)', () => {
    for (const codigo of Object.keys(ARQUETIPOS)) {
      const vars = toCssVars(resolveTheme({ v: 2, preset: codigo }))
      const css = textoCssDasVars(vars)
      for (const chave of Object.keys(vars)) {
        expect(css, `${codigo} perdeu ${chave}`).toContain(`${chave}:`)
      }
    }
  })
})

describe('guardas do catálogo', () => {
  it('os enums do schema batem com as escalas da lib', () => {
    const shape = storeThemeConfigSchema.shape.shape
    for (const radius of Object.keys(RADIUS_STEPS_PX)) {
      expect(parseStoreTheme({ preset: 'noir', shape: { radius } })?.shape?.radius).toBe(radius)
    }
    for (const density of Object.keys(DENSITY_SPACE_PX)) {
      expect(parseStoreTheme({ preset: 'noir', shape: { density } })?.shape?.density).toBe(density)
    }
    expect(shape).toBeDefined()
  })

  it('a allowlist de fontes cobre as famílias de todos os arquétipos', () => {
    for (const a of Object.values(ARQUETIPOS)) {
      expect(FAMILIAS_DE_FONTE).toContain(a.tokens.typography.display.family)
      expect(FAMILIAS_DE_FONTE).toContain(a.tokens.typography.body.family)
    }
  })
})
