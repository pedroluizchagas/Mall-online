import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Guarda do A-11 (R5 + R8): helper repetido em duas vitrines vai para
 * `_base/`; a terceira cópia é bug. Eram 17 `precoFinalDe`, 13
 * `prefereMenosMovimento`, 4 `exigeEscolha`, 3 `repartirDescricao` e 20
 * `setInterval` iguais — cada um livre para divergir num fix e ninguém
 * percebia.
 *
 * O teste lê o disco (o runner é node): só `_base/` pode DECLARAR estes
 * nomes ou abrir um `setInterval`; as pastas de vitrine importam.
 */
describe('vitrines não redeclaram o que vive em _base', () => {
  const DIR = resolve(__dirname, '..')
  const pastas = readdirSync(DIR)
    .filter((n) => !n.startsWith('_') && !n.startsWith('.') && n !== '__tests__')
    .filter((n) => statSync(resolve(DIR, n)).isDirectory())
    .sort()

  const fontes = pastas.flatMap((pasta) =>
    readdirSync(resolve(DIR, pasta))
      .filter((n) => n.endsWith('.tsx') || n.endsWith('.ts'))
      .map((n) => ({ nome: `${pasta}/${n}`, texto: readFileSync(resolve(DIR, pasta, n), 'utf8') })),
  )

  /** Nome → onde ele mora agora. */
  const PROIBIDOS: Record<string, string> = {
    precoFinalDe: '_base/catalogo',
    exigeEscolha: '_base/catalogo',
    repartirDescricao: '_base/catalogo',
    prefereMenosMovimento: '_base/movimento',
    useReduzirMovimento: '_base/movimento',
    useMenosMovimento: '_base/movimento (como useReduzirMovimento)',
  }

  it('encontra os arquivos das vitrines', () => {
    expect(fontes.length).toBeGreaterThan(20)
  })

  it.each(Object.entries(PROIBIDOS))('nenhuma vitrine declara %s (vive em %s)', (nome, onde) => {
    const culpados = fontes
      .filter(({ texto }) => new RegExp(`function ${nome}\\b`).test(texto))
      .map((f) => f.nome)
    expect(culpados, `declarações locais de ${nome} — importar de ${onde}`).toEqual([])
  })

  it('nenhuma vitrine abre um setInterval (o tique é o `useTique` de _base)', () => {
    const culpados = fontes.filter(({ texto }) => texto.includes('setInterval(')).map((f) => f.nome)
    expect(culpados).toEqual([])
  })

  it('_base publica os substitutos', () => {
    const indice = readFileSync(resolve(DIR, '_base/index.ts'), 'utf8')
    for (const nome of ['precoFinalDe', 'exigeEscolha', 'repartirDescricao', 'prefereMenosMovimento', 'useReduzirMovimento', 'useTique', 'useRelogioDaLoja']) {
      expect(indice).toContain(nome)
    }
  })
})
