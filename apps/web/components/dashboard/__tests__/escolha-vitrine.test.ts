import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

import { VITRINES } from '@mallevo/lib'

/**
 * O seletor de Minha Loja e o do onboarding mostram cada vitrine pela
 * miniatura de verdade (`public/vitrines/<codigo>.webp`, tirada do storefront
 * por `pnpm vitrines:miniaturas`). Vitrine nova sem miniatura viraria um
 * cartão quebrado; miniatura de vitrine que saiu da tabela é peso morto.
 */
describe('miniaturas das vitrines', () => {
  const DIR = resolve(__dirname, '../../../public/vitrines')
  const codigos = Object.keys(VITRINES)

  it.each(codigos)('%s tem miniatura', (codigo) => {
    const arquivo = resolve(DIR, `${codigo}.webp`)
    expect(existsSync(arquivo), `rode \`pnpm vitrines:miniaturas\` para gerar ${codigo}.webp`).toBe(true)
    // Leve o bastante para a grade carregar na hora (hoje ficam em 12–25 kB).
    expect(statSync(arquivo).size).toBeLessThan(60 * 1024)
  })

  it('não sobra miniatura de vitrine que não existe mais', () => {
    const noDisco = readdirSync(DIR).map((f) => f.replace(/\.webp$/, '')).sort()
    expect(noDisco).toEqual([...codigos].sort())
  })
})
