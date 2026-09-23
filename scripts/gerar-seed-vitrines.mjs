#!/usr/bin/env node
/**
 * Gera o bloco "DEMO DAS VITRINES" de `supabase/seed.sql` a partir do dataset
 * mock do consumer (apps/mobile-consumer/lib/mock/dataset.ts): UMA loja por
 * vitrine da tabela `VITRINES` (@mallevo/lib) + uma por arquétipo prioritário
 * ainda sem vitrine (nenhum hoje), cada uma com lojista próprio
 * (auth + tenant + assinatura), catálogo com metadata de vitrine, conteúdo e
 * os posts do Explorar que o mock já tinha para ela.
 *
 * É o que o consumer (fora do mock), o storefront, o preview do dashboard e o
 * Playwright precisam para exercitar TODAS as vitrines contra o Supabase
 * local (plano de convergência, Fase 4).
 *
 * Uso: `pnpm seed:vitrines` (reescreve o bloco entre os marcadores; o resto
 * do seed.sql fica intacto). Depois: `supabase db reset`.
 *
 * O dataset é TypeScript com imports do workspace — o esbuild do próprio
 * repositório (dependência do vitest) empacota tudo num módulo temporário.
 */
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CONSUMER = join(RAIZ, 'apps/mobile-consumer')
const SEED = join(RAIZ, 'supabase/seed.sql')
const MARCA_INICIO = '-- >>> DEMO DAS VITRINES (gerado por scripts/gerar-seed-vitrines.mjs — não editar à mão)'
const MARCA_FIM = '-- <<< DEMO DAS VITRINES'

/** Plano de QA já existente no seed (mesmo id do lojista qa@mallevo.local). */
const PLANO_QA = 'c0000000-0000-4000-8000-000000000001'
const SENHA_DEMO = 'mallevo-demo-2026'
/** Arquétipos sem vitrine que o plano prioriza (Fase 4). */
const ARQUETIPOS_EXTRA = []

// ── esbuild do repositório ─────────────────────────────────────────────
const require = createRequire(import.meta.url)
function acharEsbuild() {
  const pnpm = join(RAIZ, 'node_modules/.pnpm')
  const dir = require('node:fs')
    .readdirSync(pnpm)
    .find((d) => d.startsWith('esbuild@'))
  if (!dir) throw new Error('esbuild não encontrado em node_modules/.pnpm')
  return require(join(pnpm, dir, 'node_modules/esbuild'))
}

async function carregarDataset() {
  const esbuild = acharEsbuild()
  const tmp = mkdtempSync(join(tmpdir(), 'seed-vitrines-'))
  const entrada = join(tmp, 'entrada.ts')
  writeFileSync(
    entrada,
    [
      `import { criarDB } from ${JSON.stringify(join(CONSUMER, 'lib/mock/dataset.ts'))}`,
      `import { EXPLORE_FEED } from ${JSON.stringify(join(CONSUMER, 'lib/mock/feed.ts'))}`,
      `import { VITRINES } from '@mallevo/lib'`,
      `export { criarDB, EXPLORE_FEED, VITRINES }`,
    ].join('\n'),
  )
  // CJS: a lib arrasta dependências CommonJS (tus-js-client faz `require`
  // dinâmico de `fs`), que só carregam com `require`, não com `import`.
  const saida = join(tmp, 'dataset.cjs')
  await esbuild.build({
    entryPoints: [entrada],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    outfile: saida,
    absWorkingDir: CONSUMER,
    nodePaths: [join(CONSUMER, 'node_modules')],
    logLevel: 'error',
  })
  return require(saida)
}

// ── utilidades SQL ─────────────────────────────────────────────────────
/** UUID determinístico (md5 do rótulo, com nibbles de versão/variante). */
function uuid(rotulo) {
  const h = createHash('md5').update(`mallevo-demo:${rotulo}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`
}
const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`)
const jsonb = (v) => (v === null || v === undefined ? 'NULL' : `${q(JSON.stringify(v))}::jsonb`)
const n = (v) => (v === null || v === undefined ? 'NULL' : String(Number(v)))
const b = (v) => (v ? 'true' : 'false')
/** 14 dígitos únicos por loja (CNPJ fictício). */
const cnpj = (slug) => createHash('md5').update(slug).digest('hex').replace(/[a-f]/g, '').padEnd(14, '7').slice(0, 14)

// ── seleção das lojas ──────────────────────────────────────────────────
function escolherLojas(db, feed, VITRINES) {
  const produtosDe = (s) => db.products.filter((p) => p.store_id === s.id)
  const pontuar = (s) =>
    produtosDe(s).filter((p) => p.metadata).length * 2 +
    feed.filter((f) => f.loja_slug === s.slug).length * 3 +
    (s.logo_url.startsWith('data:') ? 1 : 0)
  const melhor = (cands) => [...cands].sort((a, c) => pontuar(c) - pontuar(a))[0]

  const escolhidas = []
  const usados = new Set()
  for (const v of Object.values(VITRINES)) {
    const cands = db.stores.filter(
      (s) => !usados.has(s.slug) && s.theme.preset === v.arquetipo && v.categorias.includes(s.categoria.slug),
    )
    const loja = melhor(cands)
    if (!loja) {
      console.warn(`[seed] sem loja no mock para a vitrine ${v.codigo} (${v.arquetipo} × ${v.categorias.join('|')})`)
      continue
    }
    usados.add(loja.slug)
    escolhidas.push({ loja, papel: `vitrine ${v.nome} (${v.codigo})` })
  }
  for (const preset of ARQUETIPOS_EXTRA) {
    const loja = melhor(db.stores.filter((s) => !usados.has(s.slug) && s.theme.preset === preset))
    if (!loja) {
      console.warn(`[seed] sem loja no mock para o arquétipo ${preset}`)
      continue
    }
    usados.add(loja.slug)
    escolhidas.push({ loja, papel: `arquétipo ${preset} (sem vitrine — layout padrão)` })
  }
  return escolhidas
}

// ── SQL por loja ───────────────────────────────────────────────────────
function sqlDaLoja({ loja, papel }, db, feed) {
  const userId = uuid(`user:${loja.slug}`)
  const tenantId = uuid(`tenant:${loja.slug}`)
  const subId = uuid(`sub:${loja.slug}`)
  const storeId = uuid(`store:${loja.slug}`)
  const email = `demo-${loja.slug}@mallevo.local`
  const produtos = db.products.filter((p) => p.store_id === loja.id)
  const categorias = [...new Map(produtos.map((p) => [p.categories.id, p.categories])).values()].sort((a, c) => a.ordem - c.ordem)
  const catId = (mockId) => uuid(`cat:${loja.slug}:${mockId}`)
  const prodId = (p) => uuid(`prod:${loja.slug}:${p.id}`)
  const posts = feed.filter((f) => f.loja_slug === loja.slug)
  const destaques = produtos.slice(0, 3).map(prodId)

  const linhas = []
  linhas.push(`-- ── ${loja.nome} (${loja.slug}) — ${papel} ──`)
  linhas.push(`-- Dashboard: ${email} / ${SENHA_DEMO} · storefront: ${loja.slug}.mallevo.localhost`)
  linhas.push(
    `INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)`,
    `VALUES ('00000000-0000-0000-0000-000000000000', ${q(userId)}, 'authenticated', 'authenticated', ${q(email)}, extensions.crypt(${q(SENHA_DEMO)}, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', ${q(JSON.stringify({ role: 'tenant', nome: loja.nome }))}, now(), now(), '', '', '', '')`,
    `ON CONFLICT (id) DO NOTHING;`,
    `INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)`,
    `VALUES (${q(userId)}, ${q(userId)}, ${q(userId)}, ${q(JSON.stringify({ sub: userId, email, email_verified: true }))}, 'email', now(), now(), now())`,
    `ON CONFLICT DO NOTHING;`,
    `INSERT INTO tenants (id, user_id, nome_responsavel, cpf_cnpj, telefone, email, slug, tutorial_template_visto, pagarme_onboarding_status)`,
    `VALUES (${q(tenantId)}, ${q(userId)}, ${q(`Demo ${loja.nome}`)}, ${q(cnpj(loja.slug))}, ${q(loja.telefone.replace(/\D/g, '').slice(-11))}, ${q(email)}, ${q(`demo-${loja.slug}`)}, true, 'active')`,
    `ON CONFLICT (id) DO NOTHING;`,
    `INSERT INTO tenant_subscriptions (id, tenant_id, plan_id) VALUES (${q(subId)}, ${q(tenantId)}, ${q(PLANO_QA)}) ON CONFLICT (id) DO NOTHING;`,
  )

  const conteudo = { v: 1, destaques, galeria_casa: [loja.banner_url] }
  linhas.push(
    `INSERT INTO stores (id, tenant_id, nome, descricao, slug, logo_url, banner_url, telefone, horarios, taxa_entrega, tempo_entrega, raio_entrega_km, aceita_pix, aceita_cartao_online, ativo, categoria_id, theme, conteudo)`,
    `VALUES (${q(storeId)}, ${q(tenantId)}, ${q(loja.nome)}, ${q(loja.descricao)}, ${q(loja.slug)}, ${q(loja.logo_url)}, ${q(loja.banner_url)}, ${q(loja.telefone)}, ${jsonb(loja.horarios)}, ${n(loja.taxa_entrega)}, ${n(loja.tempo_entrega)}, 8.0, ${b(loja.aceita_pix)}, ${b(loja.aceita_cartao_online)}, true, (SELECT id FROM categories WHERE slug = ${q(loja.categoria.slug)} AND tenant_id IS NULL LIMIT 1), ${jsonb(loja.theme)}, ${jsonb(conteudo)})`,
    `ON CONFLICT (id) DO NOTHING;`,
  )

  if (categorias.length > 0) {
    linhas.push(`INSERT INTO categories (id, tenant_id, store_id, nome, ordem) VALUES`)
    linhas.push(categorias.map((c) => `  (${q(catId(c.id))}, ${q(tenantId)}, ${q(storeId)}, ${q(c.nome)}, ${n(c.ordem + 1)})`).join(',\n'))
    linhas.push(`ON CONFLICT (id) DO NOTHING;`)
  }

  if (produtos.length > 0) {
    linhas.push(`INSERT INTO products (id, store_id, tenant_id, category_id, nome, descricao, preco, preco_promocional, foto_url, ordem, metadata, track_stock, stock_quantity) VALUES`)
    linhas.push(
      produtos
        .map((p) => {
          // `metadata.estoque` morreu no contrato: vira a coluna real.
          const { estoque, ...meta } = p.metadata ?? {}
          // Produto sem nenhum campo de vitrine grava `{}`, não NULL:
          // `products.metadata` é `JSONB NOT NULL DEFAULT '{}'` (migration 019)
          // e o NULL derrubava o `supabase db reset` inteiro.
          const metadata = meta
          const temEstoque = typeof estoque === 'number'
          return `  (${q(prodId(p))}, ${q(storeId)}, ${q(tenantId)}, ${q(catId(p.category_id))}, ${q(p.nome)}, ${q(p.descricao)}, ${n(p.preco)}, ${n(p.preco_promocional)}, ${q(p.foto_url)}, ${n(p.ordem)}, ${jsonb(metadata)}, ${b(temEstoque)}, ${temEstoque ? n(estoque) : 'NULL'})`
        })
        .join(',\n'),
    )
    linhas.push(`ON CONFLICT (id) DO NOTHING;`)
  }

  if (posts.length > 0) {
    linhas.push(`INSERT INTO store_posts (id, store_id, tenant_id, product_id, tipo, media_path, media_url, thumb_path, thumb_url, descricao, tags, status, moderacao, largura, altura, duracao_seg, curtidas, comentarios, views, publicado_em) VALUES`)
    linhas.push(
      posts
        .map((f) => {
          const id = uuid(`post:${f.id}`)
          const produto = f.produto ? produtos.find((p) => p.nome === f.produto.nome) : null
          const ext = f.tipo === 'video' ? 'mp4' : 'jpg'
          const prefixo = `${tenantId}/${storeId}`
          const tags = `{${f.tags.map((t) => t.replace(/^#/, '').replace(/[^a-z0-9-]/gi, '')).filter(Boolean).map((t) => `"${t}"`).join(',')}}`
          return `  (${q(id)}, ${q(storeId)}, ${q(tenantId)}, ${produto ? q(prodId(produto)) : 'NULL'}, ${q(f.tipo)}, ${q(`${prefixo}/${id}.${ext}`)}, ${q(f.media_url)}, ${f.thumb_url ? q(`${prefixo}/${id}-thumb.jpg`) : 'NULL'}, ${q(f.thumb_url)}, ${q(f.descricao)}, ${q(tags)}, 'published', 'approved', 900, 1600, ${f.tipo === 'video' ? n(Math.min(120, Math.max(1, f.duracao_seg ?? 15))) : 'NULL'}, ${n(f.curtidas)}, ${n(f.comentarios)}, ${n(f.curtidas * 12)}, ${q(f.publicado_em)})`
        })
        .join(',\n'),
    )
    linhas.push(`ON CONFLICT (id) DO NOTHING;`)
  }

  return linhas.join('\n')
}

// ── principal ──────────────────────────────────────────────────────────
const { criarDB, EXPLORE_FEED, VITRINES } = await carregarDataset()
const db = criarDB()
const escolhidas = escolherLojas(db, EXPLORE_FEED, VITRINES)

const cabecalho = [
  MARCA_INICIO,
  `-- ${escolhidas.length} lojas-demo, uma por vitrine (+ arquétipos ${ARQUETIPOS_EXTRA.join(', ')}), portadas do mock`,
  `-- do consumer. Cada uma tem lojista próprio (senha ${SENHA_DEMO}), catálogo com metadata`,
  `-- de vitrine e os posts do Explorar. Regerar: pnpm seed:vitrines`,
  '',
  ...escolhidas.map(({ loja, papel }) => `--   ${loja.slug.padEnd(24)} ${loja.theme.preset.padEnd(10)} ${loja.categoria.slug.padEnd(24)} ${papel}`),
  '',
]
const bloco = [...cabecalho, ...escolhidas.map((e) => sqlDaLoja(e, db, EXPLORE_FEED)), MARCA_FIM].join('\n\n')

let seed = readFileSync(SEED, 'utf8')
const ini = seed.indexOf(MARCA_INICIO)
const fim = seed.indexOf(MARCA_FIM)
if (ini >= 0 && fim > ini) {
  seed = seed.slice(0, ini) + bloco + seed.slice(fim + MARCA_FIM.length)
} else {
  seed = seed.replace(/\s*$/, '\n\n') + bloco + '\n'
}
writeFileSync(SEED, seed)

const totalProdutos = escolhidas.reduce((s, { loja }) => s + db.products.filter((p) => p.store_id === loja.id).length, 0)
const totalPosts = escolhidas.reduce((s, { loja }) => s + EXPLORE_FEED.filter((f) => f.loja_slug === loja.slug).length, 0)
console.log(`seed.sql: ${escolhidas.length} lojas-demo, ${totalProdutos} produtos, ${totalPosts} posts`)
for (const { loja, papel } of escolhidas) console.log(`  ${loja.slug.padEnd(24)} ${papel}`)
