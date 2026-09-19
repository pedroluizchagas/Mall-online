import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ARQUETIPOS } from '../presets'
import { CATEGORIA_SLUG_TO_ARQUETIPO } from '../mapping'
import { CATEGORIA_SLUG_TO_TEMPLATE } from '../../templates/mapping'
import {
  ARQUETIPOS_SEM_VITRINE,
  VITRINES,
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
      ['heritage', 'market', 'playful', 'soft', 'tech', 'utility'].sort(),
    )
    expect(lista.length + ARQUETIPOS_SEM_VITRINE.length).toBe(Object.keys(ARQUETIPOS).length)
  })
})

describe('resolveVitrine', () => {
  it('casa arquétipo + categoria', () => {
    expect(resolveVitrine('slice', 'alimentos-bebidas')).toBe('forno')
    expect(resolveVitrine('mono', 'vestuario-calcados')).toBe('passarela')
    expect(resolveVitrine('fresh', 'mercado-conveniencia')).toBe('feira')
    expect(resolveVitrine('clinic', 'veterinaria')).toBe('clinica')
  })

  it('arquétipo certo em categoria fora do gate → null (só pele)', () => {
    expect(resolveVitrine('editorial', 'alimentos-bebidas')).toBeNull()
    expect(resolveVitrine('noir', 'acessorios-joias')).toBeNull()
  })

  it('editorial e mono nunca disputam a mesma loja', () => {
    expect(resolveVitrine('editorial', 'vestuario-calcados')).toBe('editorial')
    expect(resolveVitrine('mono', 'vestuario-calcados')).toBe('passarela')
  })

  it('arquétipo sem vitrine, nulos e lixo → null, sem lançar', () => {
    expect(resolveVitrine('heritage', 'alimentos-bebidas')).toBeNull()
    expect(resolveVitrine(null, 'alimentos-bebidas')).toBeNull()
    expect(resolveVitrine('smash', null)).toBeNull()
    expect(resolveVitrine('nao-existe', 'categoria-nova')).toBeNull()
  })

  it('getVitrineDoArquetipo informa o editor', () => {
    expect(getVitrineDoArquetipo('slice')?.nome).toBe('Forno')
    expect(getVitrineDoArquetipo('heritage')).toBeNull()
    expect(getVitrineDoArquetipo(undefined)).toBeNull()
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
