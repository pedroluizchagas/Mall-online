/**
 * Guardas de disco do consumer (regra R5 do plano de convergência: "se a regra
 * é não usar X, existe um teste que faz grep e falha").
 *
 * Cobrem os achados da auditoria de 2026-09-21:
 * - A-05 — `metadata.estoque` (estoque é coluna real: `track_stock` +
 *   `stock_quantity`);
 * - A-06 — status "ABERTO" inventado (regra R4: sem `horarios`, sem chip);
 * - A-19 — `as any` nas vitrines e vocabulário de piso duplicado na home.
 *
 * Lê o disco do app, como `vitrines.test.ts` já faz — a lib não importa RN.
 */
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const CONSUMER = resolve(__dirname, '../../../../../apps/mobile-consumer')
const DIR_LOJA = resolve(CONSUMER, 'components/loja')
const DIR_HOME = resolve(CONSUMER, 'components/home')
const DIR_ROTA = resolve(CONSUMER, 'app/loja')

interface Fonte {
  arquivo: string
  /** Conteúdo com os comentários trocados por espaços (ver `semComentarios`). */
  codigo: string
}

/**
 * Comentários fora: uma guarda que é grep não pode falhar porque alguém
 * EXPLICOU a regra ("não inventa 'aberto'") no comentário acima do código.
 * Troca por espaços em vez de remover para não deslocar nada relevante.
 *
 * A regex alterna entre as três coisas que podem conter `//` sem ser
 * comentário — string com aspas simples, com aspas duplas e template literal —
 * e os dois tipos de comentário; como a alternativa da string vem ANTES, um
 * `'http://…'` é consumido inteiro e nunca vira comentário.
 */
const RE_COMENTARIO =
  /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g

function semComentarios(fonte: string): string {
  return fonte.replace(RE_COMENTARIO, (trecho) =>
    trecho.startsWith('//') || trecho.startsWith('/*')
      ? trecho.replace(/[^\n]/g, ' ')
      : trecho,
  )
}

function ler(dir: string, filtro: RegExp): Fonte[] {
  const arquivos = readdirSync(dir).filter((f) => filtro.test(f))
  expect(arquivos.length, `nenhum arquivo casou ${filtro} em ${dir}`).toBeGreaterThan(0)
  return arquivos.map((arquivo) => ({
    arquivo,
    codigo: semComentarios(readFileSync(resolve(dir, arquivo), 'utf8')),
  }))
}

/** Linhas (1-based) do código onde a regex casa — mensagem de falha legível. */
function ocorrencias(codigo: string, re: RegExp): string[] {
  return codigo
    .split('\n')
    .map((linha, i) => [i + 1, linha] as const)
    .filter(([, linha]) => re.test(linha))
    .map(([n, linha]) => `${n}: ${linha.trim()}`)
}

const VITRINES = ler(DIR_LOJA, /^(Loja|Produto)[A-Z].*\.tsx$/)
const LOJA_TODOS = ler(DIR_LOJA, /\.tsx?$/)
const ROTA = ler(DIR_ROTA, /\.tsx?$/)
const HOME = ler(DIR_HOME, /\.tsx?$/)

describe('A-06 — nenhuma vitrine inventa "ABERTO" (regra R4)', () => {
  /*
   * Só LITERAIS de string: a frase legítima vem de `statusAbertura()` em
   * tempo de execução ("Aberto até 18:00"), então o que se proíbe é a
   * constante escrita à mão. As três primeiras alternativas cobrem as aspas
   * (`'ABERTO'`, `"Aberto"`, `` `Aberto` ``) exigindo a palavra SOZINHA entre
   * elas; as duas últimas pegam o texto solto no JSX (`>Aberto<`) e a frase
   * inteira que a Ritual usava na pílula.
   */
  const RE_ABERTO =
    /'\s*aberto\s*'|"\s*aberto\s*"|`\s*aberto\s*`|>\s*aberto\s*<|aberto para pedidos/i

  it.each(VITRINES.map((f) => [f.arquivo, f] as const))(
    '%s não tem "ABERTO" escrito à mão',
    (_arquivo, fonte) => {
      expect(ocorrencias(fonte.codigo, RE_ABERTO)).toEqual([])
    },
  )
})

describe('A-05 — estoque é coluna real, não `metadata.estoque`', () => {
  /*
   * `.estoque` em QUALQUER acesso (`metadata.estoque`, `metadata?.estoque`,
   * `(produto.metadata as X)?.estoque`) mais a declaração `estoque?:` que
   * ressuscitaria o campo num tipo local. A coluna real se chama
   * `stock_quantity`, então nenhum `.estoque` é legítimo aqui.
   */
  const RE_ESTOQUE = /\.\s*estoque\b|\bestoque\s*\?\s*:/

  it.each([...LOJA_TODOS, ...ROTA].map((f) => [f.arquivo, f] as const))(
    '%s lê track_stock/stock_quantity',
    (_arquivo, fonte) => {
      expect(ocorrencias(fonte.codigo, RE_ESTOQUE)).toEqual([])
    },
  )
})

describe('A-19 — vitrines e rota sem `any`', () => {
  const RE_ANY = /\bas\s+any\b|<any>/

  it.each([...LOJA_TODOS, ...ROTA].map((f) => [f.arquivo, f] as const))(
    '%s não usa `as any` / `<any>`',
    (_arquivo, fonte) => {
      expect(ocorrencias(fonte.codigo, RE_ANY)).toEqual([])
    },
  )
})

describe('A-19 — vocabulário de piso vem da lib, não de cópia local', () => {
  // Nome da constante seguido (com tipo opcional) de `=`: declaração, não uso.
  const RE_COPIA = /\b(VOZ_POR_PISO|VOZ_PADRAO_PISO|NOME_CURTO(_POR_PISO)?)\s*(:[^=\n]*)?=/

  it.each(HOME.map((f) => [f.arquivo, f] as const))(
    '%s não redeclara VOZ_POR_PISO/NOME_CURTO',
    (_arquivo, fonte) => {
      expect(ocorrencias(fonte.codigo, RE_COPIA)).toEqual([])
    },
  )
})
