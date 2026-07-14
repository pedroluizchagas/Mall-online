import { describe, expect, it } from 'vitest'
import { CATEGORIA_SLUG_TO_TEMPLATE } from '../../templates/mapping'
import { ARQUETIPOS, ARQUETIPO_FALLBACK } from '../presets'
import {
  CATEGORIA_SLUG_TO_ARQUETIPO,
  getArquetiposOferecidos,
  getDefaultArquetipo,
} from '../mapping'
import { normalizeThemeConfig, resolveTheme } from '../resolve'
import { contrastRatio, ensureAccentInk } from '../contrast'
import { toCssVars } from '../to-css-vars'
import { googleFontsHref } from '../google-fonts'
import {
  DENSITY_SPACE_PX,
  RADIUS_STEPS_PX,
  TYPE_SCALE_FACTOR,
} from '../scales'

const TODOS_CODIGOS = Object.keys(ARQUETIPOS)

describe('cobertura de categorias', () => {
  it('toda categoria do template-mapping tem sugestão de arquétipo', () => {
    for (const slug of Object.keys(CATEGORIA_SLUG_TO_TEMPLATE)) {
      expect(CATEGORIA_SLUG_TO_ARQUETIPO).toHaveProperty(slug)
    }
  })

  it('default e alternativas referenciam arquétipos existentes', () => {
    for (const sug of Object.values(CATEGORIA_SLUG_TO_ARQUETIPO)) {
      expect(TODOS_CODIGOS).toContain(sug.default)
      for (const alt of sug.alternativas) {
        expect(TODOS_CODIGOS).toContain(alt)
      }
    }
  })

  it('todo arquétipo é usado por ao menos uma categoria (default ou alt)', () => {
    const usados = new Set<string>()
    for (const sug of Object.values(CATEGORIA_SLUG_TO_ARQUETIPO)) {
      usados.add(sug.default)
      sug.alternativas.forEach((a) => usados.add(a))
    }
    for (const codigo of TODOS_CODIGOS) {
      expect(usados.has(codigo)).toBe(true)
    }
  })

  it('getArquetiposOferecidos retorna default na primeira posição', () => {
    const oferecidos = getArquetiposOferecidos('farmacia-medicamentos')
    expect(oferecidos[0]?.codigo).toBe('clinic')
  })

  it('slug desconhecido cai no fallback neutro', () => {
    expect(getDefaultArquetipo('inexistente')).toBe(ARQUETIPO_FALLBACK)
    expect(getDefaultArquetipo(null)).toBe(ARQUETIPO_FALLBACK)
  })
})

describe('normalizeThemeConfig', () => {
  it('null/undefined → fallback', () => {
    expect(normalizeThemeConfig(null).preset).toBe(ARQUETIPO_FALLBACK)
    expect(normalizeThemeConfig(undefined).preset).toBe(ARQUETIPO_FALLBACK)
  })

  it('migra v1 (template) para o arquétipo correspondente', () => {
    expect(normalizeThemeConfig({ template: 'neon' }).preset).toBe('raw')
    expect(normalizeThemeConfig({ template: 'artesanal' }).preset).toBe('artisan')
    // v1 'market' (boutique genérico) NÃO vira o novo arquétipo 'market'.
    expect(normalizeThemeConfig({ template: 'market' }).preset).toBe('editorial')
  })

  it('reconhece v2 com preset válido', () => {
    expect(normalizeThemeConfig({ v: 2, preset: 'clinic' }).preset).toBe('clinic')
  })

  it('preset inválido → fallback', () => {
    expect(normalizeThemeConfig({ preset: 'xpto' }).preset).toBe(ARQUETIPO_FALLBACK)
  })
})

describe('resolveTheme', () => {
  it('tema nulo nunca quebra e devolve tokens do fallback', () => {
    const t = resolveTheme(null)
    expect(t.color).toEqual(ARQUETIPOS[ARQUETIPO_FALLBACK].tokens.color)
  })

  it('aplica overrides de cor do lojista', () => {
    const t = resolveTheme({ v: 2, preset: 'editorial', color: { accent: '#FF0000' } })
    expect(t.color.accent).toBe('#FF0000')
  })

  it('recalcula accentInk quando o override de cor compromete o contraste', () => {
    // accent claro + accentInk branco = ilegível → deve virar preto.
    const t = resolveTheme({
      v: 2,
      preset: 'editorial',
      color: { accent: '#FFFF66', accentInk: '#FFFFFF' },
    })
    expect(t.color.accentInk).toBe('#000000')
    expect(contrastRatio(t.color.accent, t.color.accentInk)).toBeGreaterThanOrEqual(4.5)
  })

  it('override de fonte troca apenas a família', () => {
    const t = resolveTheme({ v: 2, preset: 'editorial', fonts: { display: 'Poppins' } })
    expect(t.typography.display.family).toBe('Poppins')
    expect(t.typography.body.family).toBe('Inter')
  })
})

describe('ensureAccentInk', () => {
  it('mantém candidato legível', () => {
    expect(ensureAccentInk('#111111', '#FFFFFF')).toBe('#FFFFFF')
  })
  it('corrige candidato ilegível', () => {
    expect(ensureAccentInk('#FFFFFF', '#FFFFFF')).toBe('#000000')
  })
})

describe('toCssVars — forma, densidade e tipografia viram vars consumíveis', () => {
  it('emite a escala completa de raios do arquétipo', () => {
    // raw é sharp: cantos retos, pill deixa de ser stadium.
    const raw = toCssVars(ARQUETIPOS.raw.tokens)
    expect(raw['--radius-md']).toBe('4px')
    expect(raw['--radius-pill']).toBe('8px')
    // soft é round: pill de verdade.
    const soft = toCssVars(ARQUETIPOS.soft.tokens)
    expect(soft['--radius-xl']).toBe('32px')
    expect(soft['--radius-pill']).toBe('999px')
  })

  it('emite espaçamentos por densidade', () => {
    // market é compact; heritage é comfortable.
    expect(toCssVars(ARQUETIPOS.market.tokens)['--space-screen-x']).toBe('16px')
    expect(toCssVars(ARQUETIPOS.heritage.tokens)['--space-screen-x']).toBe('24px')
  })

  it('emite o fator de escala tipográfica do display', () => {
    expect(toCssVars(ARQUETIPOS.heritage.tokens)['--type-factor']).toBe('1.08')
    expect(toCssVars(ARQUETIPOS.raw.tokens)['--type-factor']).toBe('0.93')
    expect(toCssVars(ARQUETIPOS.editorial.tokens)['--type-factor']).toBe('1')
  })

  it('emite as famílias tipográficas', () => {
    const vars = toCssVars(ARQUETIPOS.heritage.tokens)
    expect(vars['--font-display']).toBe('Fraunces')
    expect(vars['--font-body']).toBe('Inter')
  })

  it('toda escala usada pelos presets existe nos mapas numéricos', () => {
    for (const arq of Object.values(ARQUETIPOS)) {
      expect(RADIUS_STEPS_PX[arq.tokens.shape.radius]).toBeDefined()
      expect(DENSITY_SPACE_PX[arq.tokens.shape.density]).toBeDefined()
      expect(TYPE_SCALE_FACTOR[arq.tokens.typography.scale]).toBeDefined()
    }
  })
})

describe('googleFontsHref', () => {
  it('monta a URL só com as famílias do tema, unindo pesos', () => {
    const href = googleFontsHref(ARQUETIPOS.heritage.tokens)
    expect(href).toContain('family=Fraunces:wght@400;600;700')
    expect(href).toContain('family=Inter:wght@400;500;600;700')
    expect(href).toContain('display=swap')
  })

  it('deduplica família quando display e body são a mesma', () => {
    const href = googleFontsHref(ARQUETIPOS.editorial.tokens)!
    expect(href.match(/family=/g)).toHaveLength(1)
    // pesos de display (500,600,700) e body (400,500) unidos.
    expect(href).toContain('family=Inter:wght@400;500;600;700')
  })
})
