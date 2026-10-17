import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ARQUETIPOS } from '../presets'
import { CATEGORIA_SLUG_TO_ARQUETIPO } from '../mapping'
import { CATEGORIA_SLUG_TO_TEMPLATE } from '../../templates/mapping'
import {
  ARQUETIPOS_SEM_VITRINE,
  VITRINES,
  getOpcoesDeVitrine,
  getVitrineDoArquetipo,
  resolveVitrine,
} from '../vitrines'

const lista = Object.values(VITRINES)

describe('VITRINES — coerência da tabela', () => {
  it('todo código bate com a chave e aponta para um arquétipo existente', () => {
    for (const [chave, v] of Object.entries(VITRINES)) {
      expect(v.codigo).toBe(chave)
      expect(ARQUETIPOS[v.arquetipo]).toBeDefined()
    }
  })

  it('um arquétipo tem no máximo UMA vitrine (o gate é por arquétipo)', () => {
    const porArquetipo = new Map<string, string[]>()
    for (const v of lista) {
      porArquetipo.set(v.arquetipo, [...(porArquetipo.get(v.arquetipo) ?? []), v.codigo])
    }
    for (const [arq, codigos] of porArquetipo) {
      expect(codigos, `arquétipo ${arq} com mais de uma vitrine`).toHaveLength(1)
    }
  })

  it('toda categoria de vitrine existe e OFERECE o arquétipo (default ou alternativa)', () => {
    for (const v of lista) {
      expect(v.categorias.length).toBeGreaterThan(0)
      for (const cat of v.categorias) {
        expect(CATEGORIA_SLUG_TO_TEMPLATE[cat], `${v.codigo}: categoria ${cat} desconhecida`).toBeDefined()
        const sugestao = CATEGORIA_SLUG_TO_ARQUETIPO[cat]
        const oferecidos = [sugestao.default, ...sugestao.alternativas]
        expect(
          oferecidos,
          `${v.codigo}: ${cat} não oferece o arquétipo ${v.arquetipo} — ` +
            `ou o mapping está incompleto, ou a vitrine mira a categoria errada`,
        ).toContain(v.arquetipo)
      }
    }
  })

  it('lista os arquétipos que hoje só têm pele', () => {
    expect([...ARQUETIPOS_SEM_VITRINE].sort()).toEqual(
      ['playful', 'tech', 'utility'].sort(),
    )
    expect(lista.length + ARQUETIPOS_SEM_VITRINE.length).toBe(Object.keys(ARQUETIPOS).length)
  })
})

describe('resolveVitrine — a vitrine segue o estilo, em qualquer ramo', () => {
  it('cada estilo com vitrine veste a sua', () => {
    expect(resolveVitrine('slice')).toBe('forno')
    expect(resolveVitrine('mono')).toBe('passarela')
    expect(resolveVitrine('fresh')).toBe('feira')
    expect(resolveVitrine('clinic')).toBe('clinica')
    expect(resolveVitrine('heritage')).toBe('mesa')
    expect(resolveVitrine('market')).toBe('gondola')
    expect(resolveVitrine('soft')).toBe('cuidado')
    // Fora do ramo para o qual foi desenhada também (antes caía no layout padrão).
    expect(resolveVitrine('editorial')).toBe('editorial')
    expect(resolveVitrine('noir')).toBe('noir')
  })

  it('toda vitrine da tabela é alcançável pelo seu estilo', () => {
    for (const v of lista) expect(resolveVitrine(v.arquetipo)).toBe(v.codigo)
  })

  it('estilo sem vitrine, nulos e lixo → null, sem lançar', () => {
    for (const a of ARQUETIPOS_SEM_VITRINE) expect(resolveVitrine(a)).toBeNull()
    expect(resolveVitrine(null)).toBeNull()
    expect(resolveVitrine(undefined)).toBeNull()
    expect(resolveVitrine('nao-existe')).toBeNull()
  })

  it('getVitrineDoArquetipo informa o editor', () => {
    expect(getVitrineDoArquetipo('slice')?.nome).toBe('Forno')
    expect(getVitrineDoArquetipo('heritage')?.nome).toBe('Mesa')
    expect(getVitrineDoArquetipo('tech')).toBeNull()
    expect(getVitrineDoArquetipo(undefined)).toBeNull()
  })
})

describe('getOpcoesDeVitrine — como o editor apresenta as opções do ramo', () => {
  const vitrines = lista.map((v) => v.codigo).sort()

  it.each(Object.keys(CATEGORIA_SLUG_TO_ARQUETIPO))(
    '%s: toda vitrine aparece uma vez; as sugeridas são as desenhadas para o ramo',
    (categoria) => {
      const { sugeridas, outras, soPele } = getOpcoesDeVitrine(categoria)
      expect([...sugeridas, ...outras].map((v) => v.codigo).sort()).toEqual(vitrines)
      for (const v of sugeridas) expect(v.categorias as readonly string[]).toContain(categoria)
      for (const v of outras) expect(v.categorias as readonly string[]).not.toContain(categoria)
      expect([...soPele].sort()).toEqual([...ARQUETIPOS_SEM_VITRINE].sort())
    },
  )

  it('sugeridas seguem a ordem da sugestão: o default da categoria abre a lista', () => {
    expect(getOpcoesDeVitrine('alimentos-bebidas').sugeridas.map((v) => v.codigo)).toEqual([
      'mesa', 'noir', 'torra', 'ritual', 'smash', 'horta', 'forno', 'feira',
    ])
    expect(getOpcoesDeVitrine('acessorios-joias').sugeridas.map((v) => v.codigo)).toEqual(['serena', 'editorial'])
  })

  it('as outras vêm agrupadas pelo ramo para o qual foram desenhadas', () => {
    const ramos = Object.keys(CATEGORIA_SLUG_TO_ARQUETIPO)
    const ordem = getOpcoesDeVitrine('vestuario-calcados').outras.map((v) => ramos.indexOf(v.categorias[0]))
    expect(ordem).toEqual([...ordem].sort((a, b) => a - b))
  })

  it('recomenda a primeira vitrine sugerida; sem nenhuma, o default de pele', () => {
    expect(getOpcoesDeVitrine('alimentos-bebidas').recomendado).toBe('heritage')
    expect(getOpcoesDeVitrine('acessorios-joias').recomendado).toBe('serene')
    expect(getOpcoesDeVitrine('construcao-ferramentas').recomendado).toBe('market')
    expect(getOpcoesDeVitrine('eletronicos-tecnologia').recomendado).toBe('tech')
    // O recomendado de categoria com vitrine sugerida sempre veste uma.
    for (const categoria of Object.keys(CATEGORIA_SLUG_TO_ARQUETIPO)) {
      const { sugeridas, recomendado } = getOpcoesDeVitrine(categoria)
      if (sugeridas.length > 0) expect(resolveVitrine(recomendado)).not.toBeNull()
    }
  })

  it('categoria nula ou desconhecida: nada sugerido, todas as vitrines disponíveis', () => {
    for (const categoria of [null, undefined, 'categoria-nova']) {
      const opcoes = getOpcoesDeVitrine(categoria)
      expect(opcoes.sugeridas).toEqual([])
      expect(opcoes.outras).toHaveLength(lista.length)
      expect(opcoes.recomendado).toBeNull()
    }
    expect(getOpcoesDeVitrine('eletronicos-tecnologia').sugeridas).toEqual([])
  })
})

/**
 * Paridade com o disco do consumer: cada vitrine da tabela tem os dois
 * componentes que declara, e cada `Loja*.tsx` no diretório está na tabela.
 * Mesma estratégia do guard de barra de menu (lê arquivos como texto).
 */
describe('VITRINES ↔ apps/mobile-consumer/components/loja', () => {
  const DIR = resolve(__dirname, '../../../../../apps/mobile-consumer/components/loja')
  const GATE = resolve(__dirname, '../../../../../apps/mobile-consumer/app/loja/[slug].tsx')

  it.each(lista.map((v) => [v.codigo, v] as const))(
    'vitrine %s tem os componentes declarados no consumer',
    (_codigo, v) => {
      expect(existsSync(resolve(DIR, `${v.componentes.vitrine}.tsx`))).toBe(true)
      expect(existsSync(resolve(DIR, `${v.componentes.pdp}.tsx`))).toBe(true)
    },
  )

  it('toda Loja*.tsx do consumer está na tabela', () => {
    const noDisco = readdirSync(DIR)
      .filter((f) => /^Loja[A-Z].*\.tsx$/.test(f))
      .map((f) => f.replace(/\.tsx$/, ''))
      .sort()
    const naTabela = lista.map((v) => v.componentes.vitrine).sort()
    expect(noDisco).toEqual(naTabela)
  })

  it('o gate do consumer usa resolveVitrine (nada de flags locais)', () => {
    const fonte = readFileSync(GATE, 'utf8')
    expect(fonte).toContain('resolveVitrine(')
    expect(fonte).not.toMatch(/CATEGORIAS_VITRINE_/)
  })
})
