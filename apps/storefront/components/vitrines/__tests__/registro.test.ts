import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { VITRINES } from '@mallevo/lib'

/**
 * Guarda do registro web SEM importar componentes React (o runner é node):
 * lê `index.ts` como texto e confere que cada vitrine registrada existe na
 * tabela da lib e tem arquivo no disco — e que TODA vitrine da lib está
 * registrada (paridade app ↔ web, DoD da Fase 2b).
 */
describe('VITRINES_WEB', () => {
  const DIR = resolve(__dirname, '..')
  const fonte = readFileSync(resolve(DIR, 'index.ts'), 'utf8')
  const registradas = [...fonte.matchAll(/^\s+(\w+): Vitrine\w+,$/gm)].map((m) => m[1])

  it('registra as três ondas', () => {
    expect(registradas).toEqual(
      expect.arrayContaining([
        'forno', 'smash', 'torra', 'noir', 'horta', 'ritual', 'feira',
        'editorial', 'passarela', 'raw', 'volt', 'serena',
        'clinica', 'artesa', 'magazine',
        'mesa', 'gondola', 'cuidado',
      ]),
    )
  })

  it.each(registradas)('%s é uma vitrine da lib e tem componente no disco', (codigo) => {
    expect(VITRINES).toHaveProperty(codigo)
    const nome = `Vitrine${codigo.charAt(0).toUpperCase()}${codigo.slice(1)}`
    expect(existsSync(resolve(DIR, codigo, `${nome}.tsx`))).toBe(true)
  })

  it('toda vitrine da lib tem porte web', () => {
    const faltam = Object.keys(VITRINES).filter((c) => !registradas.includes(c))
    expect(faltam).toEqual([])
  })
})
