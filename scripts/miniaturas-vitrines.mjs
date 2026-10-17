#!/usr/bin/env node
/**
 * Fotografa as vitrines de VERDADE para o seletor de estilo do dashboard
 * (Minha Loja e onboarding): uma miniatura por vitrine da tabela `VITRINES`
 * (@mallevo/lib), tirada do STOREFRONT servindo a loja-demo daquela vitrine
 * no seed local (bloco "DEMO DAS VITRINES", gerado do dataset mock do
 * consumer). Nada desenhado à mão: é a mesma página que o cliente abre.
 *
 * Pré-requisitos (os mesmos do QA local, docs/dev/qa-local.md):
 *   supabase start && supabase db reset
 *   storefront na 3002 contra o Supabase LOCAL (variáveis de `supabase
 *   status -o env` exportadas antes do `next dev`/`next build`)
 *
 * Uso: `pnpm vitrines:miniaturas` → apps/web/public/vitrines/<codigo>.webp.
 * Rodar de novo quando uma vitrine mudar de cara ou entrar vitrine nova (o
 * teste do web cobra uma miniatura por vitrine).
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const WEB = join(RAIZ, 'apps/web')
const SAIDA = join(WEB, 'public/vitrines')
const PNPM = join(RAIZ, 'node_modules/.pnpm')
const URL_LOJA = process.env.STOREFRONT_URL_LOJA ?? 'http://{slug}.mallevo.localhost:3002/'

/** Viewport do celular em que as vitrines foram desenhadas; recorte do topo. */
const CELULAR = { width: 390, height: 700 }
const RECORTE = { x: 0, y: 0, width: 390, height: 600 }
/** Tamanho final (≈2× o cartão do seletor) e qualidade do WebP. */
const FINAL = { width: 312, height: 480 }
const QUALIDADE = 0.8

const require = createRequire(import.meta.url)
const pacote = (prefixo) => {
  const dir = readdirSync(PNPM).find((d) => d.startsWith(prefixo))
  if (!dir) throw new Error(`${prefixo} não encontrado em node_modules/.pnpm`)
  return join(PNPM, dir, 'node_modules', prefixo.replace(/@[^@]*$/, ''))
}

/** A tabela e o gate vêm da lib (TypeScript) — o esbuild do repo empacota. */
async function carregarLib() {
  const esbuild = require(pacote('esbuild@'))
  const tmp = mkdtempSync(join(tmpdir(), 'miniaturas-vitrines-'))
  const entrada = join(tmp, 'entrada.ts')
  writeFileSync(entrada, `export { VITRINES, resolveVitrine, getPresetExplicito } from '@mallevo/lib'\n`)
  const saida = join(tmp, 'lib.cjs')
  await esbuild.build({
    entryPoints: [entrada],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    outfile: saida,
    absWorkingDir: WEB,
    nodePaths: [join(WEB, 'node_modules')],
    logLevel: 'error',
  })
  return require(saida)
}

function supabaseLocal() {
  if (process.env.QA_SUPABASE_URL && process.env.QA_SUPABASE_ANON_KEY) {
    return { url: process.env.QA_SUPABASE_URL, anon: process.env.QA_SUPABASE_ANON_KEY }
  }
  const env = execFileSync('supabase', ['status', '-o', 'env'], { cwd: RAIZ, encoding: 'utf8' })
  const valor = (chave) => env.match(new RegExp(`^${chave}="?([^"\\n]+)"?$`, 'm'))?.[1]
  const url = valor('API_URL')
  const anon = valor('ANON_KEY')
  if (!url || !anon) throw new Error('Supabase local não respondeu — rode `supabase start`.')
  return { url, anon }
}

async function main() {
  const { VITRINES, resolveVitrine, getPresetExplicito } = await carregarLib()
  const { url, anon } = supabaseLocal()
  if (!/127\.0\.0\.1|localhost/.test(url)) throw new Error(`Recusado: ${url} não é o Supabase local.`)

  const resposta = await fetch(`${url}/rest/v1/public_catalog_stores?select=slug,theme,categoria_slug,banner_url&order=slug`, {
    headers: { apikey: anon, Authorization: `Bearer ${anon}` },
  })
  if (!resposta.ok) throw new Error(`public_catalog_stores: HTTP ${resposta.status}`)
  const lojas = await resposta.json()

  // Uma loja por vitrine — a do bloco demo (fotos reais) antes da de QA.
  const fonte = {}
  for (const codigo of Object.keys(VITRINES)) {
    const candidatas = lojas.filter(
      (l) => resolveVitrine(getPresetExplicito(l.theme), l.categoria_slug) === codigo,
    )
    const loja = candidatas.find((l) => l.banner_url?.includes('images.unsplash.com')) ?? candidatas[0]
    if (!loja) throw new Error(`Nenhuma loja do seed veste a vitrine "${codigo}" — rode \`pnpm seed:vitrines\`.`)
    fonte[codigo] = loja.slug
  }

  const { chromium } = await import(pathToFileURL(join(pacote('playwright@'), 'index.mjs')).href)
  const navegador = await chromium.launch()
  const contexto = await navegador.newContext({ viewport: CELULAR, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  const pagina = await contexto.newPage()
  const conversor = await contexto.newPage()
  mkdirSync(SAIDA, { recursive: true })

  for (const [codigo, slug] of Object.entries(fonte)) {
    await pagina.goto(URL_LOJA.replace('{slug}', slug), { waitUntil: 'networkidle', timeout: 180_000 })
    // Só fotografa com as fotos da dobra carregadas (lazy-load fica cinza).
    await pagina
      .waitForFunction(
        (alto) => [...document.images].filter((i) => i.getBoundingClientRect().top < alto).every((i) => i.complete),
        RECORTE.height,
        { timeout: 30_000 },
      )
      .catch(() => console.warn(`  ${codigo}: alguma foto da dobra não carregou a tempo`))
    await pagina.waitForTimeout(1200)
    const png = await pagina.screenshot({ clip: RECORTE })

    const webp = await conversor.evaluate(
      async ({ b64, final, qualidade }) => {
        const img = new Image()
        img.src = `data:image/png;base64,${b64}`
        await img.decode()
        const canvas = document.createElement('canvas')
        canvas.width = final.width
        canvas.height = final.height
        const ctx = canvas.getContext('2d')
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, final.width, final.height)
        return canvas.toDataURL('image/webp', qualidade).split(',')[1]
      },
      { b64: png.toString('base64'), final: FINAL, qualidade: QUALIDADE },
    )
    const arquivo = join(SAIDA, `${codigo}.webp`)
    const bytes = Buffer.from(webp, 'base64')
    writeFileSync(arquivo, bytes)
    console.log(`${codigo.padEnd(10)} ← ${slug.padEnd(22)} ${(bytes.length / 1024).toFixed(1)} kB`)
  }

  await navegador.close()
}

main().catch((erro) => {
  console.error(erro.message ?? erro)
  process.exit(1)
})
