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
import { coresDominantes } from '../logo-palette'
import { PALETAS, getPaleta } from '../palettes'
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

describe('qualidade de autoria dos ARQUETIPOS', () => {
  it('accentInk autorado passa AA (≥ 4.5) sobre o accent — sem correção em runtime', () => {
    for (const arq of Object.values(ARQUETIPOS)) {
      const { accent, accentInk } = arq.tokens.color
      expect(
        ensureAccentInk(accent, accentInk),
        `${arq.codigo}: accentInk autorado ilegível sobre accent`,
      ).toBe(accentInk)
    }
  })

  it('ink legível sobre bg (AA ≥ 4.5) em todo arquétipo', () => {
    for (const arq of Object.values(ARQUETIPOS)) {
      const { bg, ink } = arq.tokens.color
      expect(
        contrastRatio(bg, ink),
        `${arq.codigo}: ink ilegível sobre bg`,
      ).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('PALETAS curadas por arquétipo', () => {
  it('todo arquétipo tem ao menos 2 paletas alternativas', () => {
    for (const codigo of TODOS_CODIGOS) {
      expect(PALETAS[codigo as keyof typeof PALETAS].length).toBeGreaterThanOrEqual(2)
    }
  })

  it('códigos únicos dentro de cada arquétipo', () => {
    for (const paletas of Object.values(PALETAS)) {
      const codigos = paletas.map((p) => p.codigo)
      expect(new Set(codigos).size).toBe(codigos.length)
    }
  })

  it('accentInk autorado já passa AA (≥ 4.5) sobre o accent — sem correção', () => {
    for (const [arq, paletas] of Object.entries(PALETAS)) {
      for (const p of paletas) {
        expect(
          ensureAccentInk(p.color.accent, p.color.accentInk),
          `${arq}/${p.codigo}: accentInk ilegível sobre accent`,
        ).toBe(p.color.accentInk)
        expect(
          contrastRatio(p.color.accent, p.color.accentInk),
        ).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('ink legível sobre bg em toda paleta (AA ≥ 4.5)', () => {
    for (const [arq, paletas] of Object.entries(PALETAS)) {
      for (const p of paletas) {
        expect(
          contrastRatio(p.color.bg, p.color.ink),
          `${arq}/${p.codigo}: ink ilegível sobre bg`,
        ).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('resolveTheme aplica a paleta sobre o default do arquétipo', () => {
    const t = resolveTheme({ v: 2, preset: 'heritage', palette: 'vinha' })
    expect(t.color.accent).toBe('#8E3B46')
    expect(t.color.bg).toBe('#FBF5F2')
    // Tipografia/forma seguem o arquétipo, não a paleta.
    expect(t.typography.display.family).toBe('Fraunces')
    expect(t.shape.radius).toBe('soft')
  })

  it('override de accent do lojista vence a paleta', () => {
    const t = resolveTheme({
      v: 2,
      preset: 'heritage',
      palette: 'vinha',
      color: { accent: '#123456' },
    })
    expect(t.color.accent).toBe('#123456')
    // Mas o resto da pele continua vindo da paleta.
    expect(t.color.bg).toBe('#FBF5F2')
  })

  it('paleta desconhecida → ignorada (original do preset)', () => {
    const t = resolveTheme({ v: 2, preset: 'soft', palette: 'xpto' })
    expect(t.color).toEqual(ARQUETIPOS.soft.tokens.color)
    expect(getPaleta('soft', 'xpto')).toBeNull()
  })
})

describe('coresDominantes (paleta a partir da logo)', () => {
  /** Monta um buffer RGBA com `n` pixels da cor dada. */
  function pixels(cores: Array<[number, number, number, number, number]>): number[] {
    // cada entrada: [r, g, b, a, quantidade]
    const out: number[] = []
    for (const [r, g, b, a, n] of cores) {
      for (let i = 0; i < n; i++) out.push(r, g, b, a)
    }
    return out
  }

  it('logo colorida: devolve a cor de marca dominante', () => {
    // 60% vermelho vivo, 40% fundo branco (neutro, deve ser ignorado).
    const data = pixels([
      [220, 30, 40, 255, 60],
      [255, 255, 255, 255, 40],
    ])
    const cores = coresDominantes(data)
    expect(cores).toHaveLength(1)
    expect(cores[0]).toBe('#DC1E28')
  })

  it('ignora pixels transparentes (fundo de PNG)', () => {
    const data = pixels([
      [20, 120, 220, 255, 30], // azul de marca
      [255, 0, 0, 0, 70], // vermelho 100% transparente — não conta
    ])
    const cores = coresDominantes(data)
    expect(cores).toEqual(['#1478DC'])
  })

  it('logo neutra (preto/branco/cinza) → lista vazia (mantém default do arquétipo)', () => {
    const data = pixels([
      [255, 255, 255, 255, 40],
      [17, 17, 17, 255, 40],
      [128, 128, 128, 255, 20],
    ])
    expect(coresDominantes(data)).toEqual([])
  })

  it('deduplica tons próximos e limita ao máximo pedido', () => {
    const data = pixels([
      [220, 30, 40, 255, 50], // vermelho
      [224, 34, 44, 255, 30], // quase o mesmo vermelho — deduplicado
      [20, 120, 220, 255, 40], // azul
      [30, 180, 90, 255, 30], // verde
      [240, 180, 20, 255, 20], // âmbar
    ])
    const cores = coresDominantes(data, 3)
    expect(cores).toHaveLength(3)
    // vermelho aparece uma única vez (dedup) e é o primeiro (mais presente).
    expect(cores[0]).toMatch(/^#D[CE]/i)
    expect(new Set(cores).size).toBe(3)
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
