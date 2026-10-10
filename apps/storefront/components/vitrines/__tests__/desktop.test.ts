import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { VITRINES_COM_DESKTOP } from '@/lib/vitrine'

/**
 * Guarda do interruptor de largura: `VITRINES_COM_DESKTOP` tira a vitrine da
 * coluna de 480px no computador. Só pode entrar nela quem tem as DUAS
 * composições no disco — a do celular escondida a partir de `md` e a de
 * computador (`<codigo>-desktop.tsx`) mostrada a partir dali. Sem isso, uma
 * vitrine de celular esticaria até 1920px.
 */
describe('vitrines com composição de computador', () => {
  const DIR = resolve(__dirname, '..')

  it.each([...VITRINES_COM_DESKTOP])('%s tem as duas composições', (codigo) => {
    const arquivos = readdirSync(resolve(DIR, codigo))
    expect(arquivos).toContain(`${codigo}-desktop.tsx`)

    const nome = `Vitrine${codigo.charAt(0).toUpperCase()}${codigo.slice(1)}.tsx`
    const fonte = readFileSync(resolve(DIR, codigo, nome), 'utf8')
    expect(fonte).toMatch(/className="[^"]*\bmd:hidden\b/)
    expect(fonte).toMatch(/className="[^"]*\bhidden md:block\b/)
  })

  it('o layout do grupo (loja) não impõe mais a coluna', () => {
    const layout = readFileSync(resolve(DIR, '../../app/(loja)/layout.tsx'), 'utf8')
    expect(layout).not.toContain('max-w-[480px]')
  })
})
