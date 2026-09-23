import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Guarda do A-09 (R5): o hero é o LCP de toda vitrine e NUNCA pode ser
 * `lazy`. Lê o disco (o runner é node, sem React) e exige que cada pasta
 * `components/vitrines/<codigo>/` marque pelo menos uma imagem como
 * prioritária — `fetchPriority="high"` direto, a forma condicional
 * `fetchPriority={... 'high' ...}` ou o repasse `carregamento="eager"` dos
 * componentes de foto (Feira, Forno, Horta, Torra).
 *
 * Regressão coberta: a Feira carregava a colagem do hero com `loading="lazy"`.
 */
describe('hero das vitrines é prioritário', () => {
  const DIR = resolve(__dirname, '..')
  const pastas = readdirSync(DIR)
    .filter((n) => !n.startsWith('_') && !n.startsWith('.') && n !== '__tests__')
    .filter((n) => statSync(resolve(DIR, n)).isDirectory())
    .sort()

  it('tem uma pasta por vitrine registrada', () => {
    expect(pastas.length).toBe(18)
  })

  it.each(pastas)('%s marca o hero como prioritário', (pasta) => {
    const fontes = readdirSync(resolve(DIR, pasta))
      .filter((n) => n.endsWith('.tsx') || n.endsWith('.ts'))
      .map((n) => readFileSync(resolve(DIR, pasta, n), 'utf8'))

    const prioritario = fontes.some(
      (fonte) => /fetchPriority=(?:"high"|\{[^}]*'high'[^}]*\})/.test(fonte) || /carregamento="eager"/.test(fonte),
    )
    expect(prioritario).toBe(true)
  })
})
