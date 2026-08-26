import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
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

  /**
   * `inkMuted` normalmente é escrito sobre `surface` (cartão), e é assim que a
   * maioria das vitrines o usa — por isso não há regra global aqui: peles
   * anteriores a esta checagem (serene, soft, editorial) ficariam em falta.
   *
   * A pele `ritual` é a exceção que precisa de guarda: a ficha do seu PDP
   * escreve o texto de apoio DIRETO no `bg` rosa, sem cartão por baixo. Sem
   * este teste, um refino de cor devolve silenciosamente a descrição do
   * produto para ~2,7:1 (era o caso antes de 2026-08).
   */
  it('ritual: inkMuted legível sobre bg — a ficha do PDP escreve sem surface', () => {
    const peles = [
      ['preset', ARQUETIPOS.ritual.tokens.color],
      ...PALETAS.ritual.map((p) => [`paleta ${p.codigo}`, p.color] as const),
    ] as const
    for (const [nome, cor] of peles) {
      expect(
        contrastRatio(cor.bg, cor.inkMuted),
        `ritual/${nome}: inkMuted ilegível sobre bg`,
      ).toBeGreaterThanOrEqual(4.5)
    }
  })

  /**
   * Mesma exceção da ritual, por outro caminho: na vitrine horta o rótulo de
   * categoria e a linha de ingredientes de cada produto são escritos DIRETO no
   * creme da página, sem cartão por baixo. Sem esta guarda, um refino de cor
   * devolve silenciosamente o texto de apoio para abaixo de AA.
   */
  it('garden: inkMuted legível sobre bg — rótulos e ingredientes escrevem no creme', () => {
    const peles = [
      ['preset', ARQUETIPOS.garden.tokens.color],
      ...PALETAS.garden.map((p) => [`paleta ${p.codigo}`, p.color] as const),
    ] as const
    for (const [nome, cor] of peles) {
      expect(
        contrastRatio(cor.bg, cor.inkMuted),
        `garden/${nome}: inkMuted ilegível sobre bg`,
      ).toBeGreaterThanOrEqual(4.5)
    }
  })

  /** Peles da slice: o preset e as paletas curadas, checadas juntas. */
  const PELES_SLICE = [
    ['preset', ARQUETIPOS.slice.tokens.color],
    ...PALETAS.slice.map((p) => [`paleta ${p.codigo}`, p.color] as const),
  ] as const

  /**
   * Na vitrine forno a página é creme e NADA nela tem cartão por baixo: a
   * descrição do item é `inkMuted` no creme e o nome/preço são o próprio
   * `accent` — que aqui não é só CTA, é a tinta de display do arquétipo.
   */
  it('slice: inkMuted e accent legíveis sobre bg — a ficha escreve direto no creme', () => {
    for (const [nome, cor] of PELES_SLICE) {
      expect(
        contrastRatio(cor.bg, cor.inkMuted),
        `slice/${nome}: inkMuted ilegível sobre bg`,
      ).toBeGreaterThanOrEqual(4.5)
      expect(
        contrastRatio(cor.bg, cor.accent),
        `slice/${nome}: accent ilegível como texto sobre bg`,
      ).toBeGreaterThanOrEqual(4.5)
    }
  })

  /**
   * O cardápio-pôster escreve os nomes das pizzas em `accent` sobre o bloco
   * OURO — display grande (≥ 24px bold), então a régua é AA large (≥ 3). Se o
   * ouro mudar em `forno-ui.tsx`, muda aqui: a constante é espelhada de
   * propósito para o teste falhar quando as duas pontas divergirem.
   */
  it('slice: accent sustenta display large sobre o bloco OURO do cardápio-pôster', () => {
    const OURO = '#F2A31B'
    for (const [nome, cor] of PELES_SLICE) {
      expect(
        contrastRatio(OURO, cor.accent),
        `slice/${nome}: accent ilegível como display sobre o ouro (mín. AA large)`,
      ).toBeGreaterThanOrEqual(3)
    }
  })

  /** Peles do mono: o preset e as paletas curadas, checadas juntas. */
  const PELES_MONO = [
    ['preset', ARQUETIPOS.mono.tokens.color],
    ...PALETAS.mono.map((p) => [`paleta ${p.codigo}`, p.color] as const),
  ] as const

  /**
   * Na vitrine passarela a linha nome/preço de cada card é escrita DIRETO na
   * página, ao lado do cartão e não dentro dele — mesma exigência da garden e
   * da slice, por outro caminho.
   */
  it('mono: inkMuted legível sobre bg — a ficha do card escreve direto na página', () => {
    for (const [nome, cor] of PELES_MONO) {
      expect(
        contrastRatio(cor.bg, cor.inkMuted),
        `mono/${nome}: inkMuted ilegível sobre bg`,
      ).toBeGreaterThanOrEqual(4.5)
    }
  })

  /**
   * O chip de escassez é a ÚNICA cor do arquétipo e carrega texto branco em
   * corpo pequeno, então a régua é AA de texto normal — o laranja da
   * referência (~#F97316) dava 2,8:1 e foi aprofundado na autoria. Espelho da
   * constante `LARANJA_ESTOQUE` de `passarela-ui.tsx`: se mudar lá, muda aqui.
   */
  it('mono: o chip de escassez sustenta texto branco (AA de texto pequeno)', () => {
    const LARANJA_ESTOQUE = '#C2410C'
    expect(
      contrastRatio(LARANJA_ESTOQUE, '#FFFFFF'),
      'mono: texto do chip de escassez ilegível sobre o laranja',
    ).toBeGreaterThanOrEqual(4.5)
  })

  /** Peles do fresh: o preset e as paletas curadas, checadas juntas. */
  const PELES_FRESH = [
    ['preset', ARQUETIPOS.fresh.tokens.color],
    ...PALETAS.fresh.map((p) => [`paleta ${p.codigo}`, p.color] as const),
  ] as const

  /**
   * Na vitrine feira a unidade ("/kg") e a descrição de cada card são escritas
   * DIRETO na página, ao lado do preço e fora de qualquer cartão.
   */
  it('fresh: inkMuted legível sobre bg — a unidade escreve direto no claro', () => {
    for (const [nome, cor] of PELES_FRESH) {
      expect(
        contrastRatio(cor.bg, cor.inkMuted),
        `fresh/${nome}: inkMuted ilegível sobre bg`,
      ).toBeGreaterThanOrEqual(4.5)
    }
  })

  /**
   * O hero-cartão e o fecho da feira são VERDE-MATA fixo (DNA da vitrine, não
   * token) com creme fixo por cima, e a pill de ação pousa sobre esse verde
   * nas três peles — componente de UI, régua 3:1 (WCAG 1.4.11). Espelho das
   * constantes de `feira-ui.tsx`: se mudarem lá, mudam aqui.
   */
  it('fresh: o verde-mata sustenta o creme e a pill de accent de cada pele', () => {
    const VERDE_MATA = '#22392B'
    const CREME_FEIRA = '#F4F7EC'
    expect(
      contrastRatio(VERDE_MATA, CREME_FEIRA),
      'fresh: creme ilegível sobre o verde-mata',
    ).toBeGreaterThanOrEqual(4.5)
    for (const [nome, cor] of PELES_FRESH) {
      expect(
        contrastRatio(VERDE_MATA, cor.accent),
        `fresh/${nome}: pill de ação some sobre o verde-mata`,
      ).toBeGreaterThanOrEqual(3)
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

/**
 * Guarda de PRESENÇA, não de estilo: por ordem do produto, toda loja aberta no
 * mobile-consumer mostra a barra de navegação — as vitrines de arquétipo com a
 * sua própria (réplica da régua do shell vestida no DNA da casa, molde fixo ou
 * pílula) e o layout padrão com a `BarraMenuPadrao`.
 *
 * O teste mora aqui, e não no app, porque o consumer não tem runner: este é o
 * único vitest do monorepo que já roda em CI. Ele lê os arquivos como TEXTO —
 * o que basta para o que precisa provar (ninguém esqueceu a barra numa vitrine
 * nova), sem arrastar React Native para dentro do runner.
 *
 * Vitrine nova SEM barra quebra aqui. O plano da mudança está em
 * `docs/dev/plano-barra-menu-vitrines.md`.
 */
describe('barra de menu — presença em toda loja do consumer', () => {
  const DIR_VITRINES = resolve(
    __dirname,
    '../../../../../apps/mobile-consumer/components/loja',
  )
  const LAYOUT_PADRAO = resolve(
    __dirname,
    '../../../../../apps/mobile-consumer/app/loja/[slug].tsx',
  )

  const vitrines = readdirSync(DIR_VITRINES)
    .filter((f) => /^Loja[A-Z].*\.tsx$/.test(f))
    .sort()

  it('encontra as vitrines de arquétipo no disco', () => {
    // Se o diretório mudar de lugar, o `it.each` abaixo passaria vazio e a
    // guarda viraria decoração — esta asserção é o que impede isso.
    expect(vitrines.length).toBeGreaterThanOrEqual(15)
  })

  it.each(vitrines)('%s desenha a própria barra de menu', (arquivo) => {
    const fonte = readFileSync(resolve(DIR_VITRINES, arquivo), 'utf8')
    expect(
      fonte.includes('BarraMenu'),
      `${arquivo}: vitrine sem barra de menu inferior. Toda loja do consumer ` +
        `mostra a régua do shell — replique o molde de uma irmã ` +
        `(LojaEditorial = fixa, LojaSmash = pílula) e vista no DNA do ` +
        `arquétipo. Ver docs/dev/plano-barra-menu-vitrines.md.`,
    ).toBe(true)
  })

  it('o layout padrão de loja também tem a sua', () => {
    const fonte = readFileSync(LAYOUT_PADRAO, 'utf8')
    expect(
      fonte.includes('BarraMenuPadrao'),
      'app/loja/[slug].tsx: o layout padrão é a rede de segurança da regra — ' +
        'toda loja sem vitrine de arquétipo depende dele para ter barra.',
    ).toBe(true)
  })
})
