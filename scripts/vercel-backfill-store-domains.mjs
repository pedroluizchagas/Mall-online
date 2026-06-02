// Backfill: registra os subdomínios das lojas já existentes no projeto
// storefront da Vercel. Roda uma vez. Idempotente (409 = já existe → ok).
//
// Uso:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   VERCEL_TOKEN=... VERCEL_STOREFRONT_PROJECT_ID=prj_... \
//   node scripts/vercel-backfill-store-domains.mjs
//
// Dica: para ver o que faria sem registrar nada, passe DRY_RUN=1.

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  VERCEL_TOKEN,
  VERCEL_STOREFRONT_PROJECT_ID,
  DRY_RUN,
} = process.env

const ROOT_DOMAIN = 'mallevo.com.br'

for (const [k, v] of Object.entries({
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  VERCEL_TOKEN,
  VERCEL_STOREFRONT_PROJECT_ID,
})) {
  if (!v) {
    console.error(`Faltando env: ${k}`)
    process.exit(1)
  }
}

// 1) Busca todos os slugs de lojas via PostgREST (service role).
const storesRes = await fetch(
  `${SUPABASE_URL}/rest/v1/stores?select=slug`,
  {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  }
)
if (!storesRes.ok) {
  console.error('Erro buscando stores:', await storesRes.text())
  process.exit(1)
}
const stores = await storesRes.json()
const slugs = [...new Set(stores.map((s) => s.slug).filter(Boolean))]
console.log(`${slugs.length} lojas encontradas.`)

// 2) Para cada slug, registra <slug>.mallevo.com.br no projeto Vercel.
let ok = 0
let jaExiste = 0
let falhou = 0

for (const slug of slugs) {
  const name = `${slug}.${ROOT_DOMAIN}`
  if (DRY_RUN) {
    console.log(`[dry-run] registraria: ${name}`)
    continue
  }
  const res = await fetch(
    `https://api.vercel.com/v10/projects/${VERCEL_STOREFRONT_PROJECT_ID}/domains`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    }
  )
  if (res.ok) {
    ok++
    console.log(`✓ ${name}`)
  } else if (res.status === 409) {
    jaExiste++
    console.log(`= ${name} (já existia)`)
  } else {
    falhou++
    console.error(`✗ ${name}: ${res.status} ${await res.text()}`)
  }
}

console.log(`\nResumo — novos: ${ok}, já existiam: ${jaExiste}, falhas: ${falhou}`)
