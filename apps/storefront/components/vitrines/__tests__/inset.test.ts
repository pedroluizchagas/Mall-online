import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Guarda do A-15 (R5): dentro da moldura App (`/preview?app=1`) o chrome
 * grudado desce a altura da status bar. Isso é publicado pelo `ShellApp`
 * como `--inset-top` e consumido pelas vitrines — NUNCA por uma regra CSS
 * global casada com a string literal `.sticky.top-0`, que quebra quando
 * alguém troca a classe e nunca alcançou as âncoras (`scroll-mt-*`).
 */
describe('inset do shell nas vitrines', () => {
  const DIR = resolve(__dirname, '..')
  const pastas = readdirSync(DIR)
    .filter((n) => !n.startsWith('.') && n !== '__tests__')
    .filter((n) => statSync(resolve(DIR, n)).isDirectory())
    .sort()

  const fontesDe = (pasta: string) =>
    readdirSync(resolve(DIR, pasta))
      .filter((n) => n.endsWith('.tsx') || n.endsWith('.ts'))
      .map((n) => ({ nome: `${pasta}/${n}`, texto: readFileSync(resolve(DIR, pasta, n), 'utf8') }))

  const comSticky = pastas
    .flatMap(fontesDe)
    .filter(({ texto }) => /className="[^"]*\bsticky\b/.test(texto))

  it('encontra chrome grudado para checar', () => {
    expect(comSticky.length).toBeGreaterThan(10)
  })

  it.each(comSticky.map((f) => f.nome))('%s ancora o topo em --inset-top', (nome) => {
    const { texto } = comSticky.find((f) => f.nome === nome)!
    expect(texto).toContain('var(--inset-top')
    expect(texto).not.toMatch(/\bsticky top-0\b/)
  })

  it('nenhuma vitrine reintroduz a regra global `.sticky.top-0`', () => {
    const shell = readFileSync(resolve(DIR, '../store/ShellApp.tsx'), 'utf8')
    expect(shell).not.toContain('[data-shell-app] .sticky')
    expect(shell).toContain("'--inset-top'")
  })
})
