// Passo 4 do runbook (docs/storefront/06-stage-4-corte-dominio.md):
// move o wildcard `*.mallevo.com.br` + cada subdomínio de tenant do projeto
// `web` para o projeto `storefront` na Vercel, domínio a domínio e
// back-to-back (DELETE no origem → POST no destino) para minimizar a janela
// de downtime por domínio.
//
// `app.mallevo.com.br` e o apex `mallevo.com.br` permanecem no `web`
// (KEEP_DOMAINS). `admin.mallevo.com.br` vive em outro projeto e não é tocado.
//
// Uso:
//   VERCEL_TOKEN=... \
//   VERCEL_WEB_PROJECT_ID=prj_...        (origem) \
//   VERCEL_STOREFRONT_PROJECT_ID=prj_... (destino) \
//   [VERCEL_TEAM_ID=team_...] \
//   [KEEP_DOMAINS=app.mallevo.com.br,mallevo.com.br] \
//   node scripts/vercel-cutover-wildcard.mjs
//
// Ensaio seguro: DRY_RUN=1 imprime o plano sem mover nada.
// Confirmação: sem DRY_RUN, exige CONFIRM=1 (evita disparo acidental).

const {
  VERCEL_TOKEN,
  VERCEL_WEB_PROJECT_ID,
  VERCEL_STOREFRONT_PROJECT_ID,
  VERCEL_TEAM_ID,
  KEEP_DOMAINS,
  DRY_RUN,
  CONFIRM,
} = process.env

const ROOT_DOMAIN = 'mallevo.com.br'
const WILDCARD = `*.${ROOT_DOMAIN}`

for (const [k, v] of Object.entries({
  VERCEL_TOKEN,
  VERCEL_WEB_PROJECT_ID,
  VERCEL_STOREFRONT_PROJECT_ID,
})) {
  if (!v) {
    console.error(`Faltando env: ${k}`)
    process.exit(1)
  }
}

if (!DRY_RUN && CONFIRM !== '1') {
  console.error(
    'Corte real exige CONFIRM=1 (ou rode com DRY_RUN=1 para ensaiar o plano).'
  )
  process.exit(1)
}

const keep = new Set(
  (KEEP_DOMAINS ?? `app.${ROOT_DOMAIN},${ROOT_DOMAIN}`)
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean)
)

const teamQuery = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''
const teamQueryAmp = VERCEL_TEAM_ID ? `&teamId=${VERCEL_TEAM_ID}` : ''

function api(path, init) {
  const sep = path.includes('?') ? teamQueryAmp : teamQuery
  return fetch(`https://api.vercel.com${path}${sep}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
}

// 1) Lista todos os domínios do projeto de origem (paginado).
async function listDomains(projectId) {
  const out = []
  let next = null
  do {
    const q = next ? `?limit=100&until=${next}` : `?limit=100`
    const res = await api(`/v9/projects/${projectId}/domains${q}`)
    if (!res.ok) {
      console.error(`Erro listando domínios de ${projectId}:`, await res.text())
      process.exit(1)
    }
    const body = await res.json()
    out.push(...(body.domains ?? []))
    next = body.pagination?.next ?? null
  } while (next)
  return out
}

const sourceDomains = await listDomains(VERCEL_WEB_PROJECT_ID)

// 2) Seleciona o que mover: o wildcard + qualquer subdomínio de mallevo.com.br,
//    exceto os mantidos no web (KEEP_DOMAINS).
const moveable = sourceDomains
  .map((d) => d.name)
  .filter((name) => {
    if (keep.has(name)) return false
    if (name === WILDCARD) return true
    return name === ROOT_DOMAIN || name.endsWith(`.${ROOT_DOMAIN}`)
  })

// Move o wildcard primeiro (cobre o tráfego), depois os subdomínios explícitos.
moveable.sort((a, b) => (a === WILDCARD ? -1 : b === WILDCARD ? 1 : a.localeCompare(b)))

console.log(`Origem (web):      ${VERCEL_WEB_PROJECT_ID}`)
console.log(`Destino (storefront): ${VERCEL_STOREFRONT_PROJECT_ID}`)
console.log(`Mantidos no web:   ${[...keep].join(', ')}`)
console.log(`A mover (${moveable.length}): ${moveable.join(', ') || '(nenhum)'}\n`)

if (moveable.length === 0) {
  console.log('Nada a mover. Encerrando.')
  process.exit(0)
}

if (DRY_RUN) {
  for (const name of moveable) console.log(`[dry-run] moveria: ${name}`)
  console.log('\n[dry-run] nenhuma alteração feita.')
  process.exit(0)
}

// 3) Move domínio a domínio, back-to-back. Para cada um: remove do origem e
//    adiciona no destino na sequência, medindo a janela de gap.
let ok = 0
let falhou = 0
const falhas = []

for (const name of moveable) {
  const t0 = Date.now()

  const del = await api(`/v9/projects/${VERCEL_WEB_PROJECT_ID}/domains/${name}`, {
    method: 'DELETE',
  })
  if (!del.ok && del.status !== 404) {
    falhou++
    falhas.push(name)
    console.error(`✗ ${name}: falha ao remover do web — ${del.status} ${await del.text()}`)
    continue
  }

  const add = await api(`/v10/projects/${VERCEL_STOREFRONT_PROJECT_ID}/domains`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
  const gap = Date.now() - t0

  if (add.ok || add.status === 409) {
    ok++
    console.log(`✓ ${name} (gap ${gap}ms${add.status === 409 ? ', já estava no destino' : ''})`)
  } else {
    falhou++
    falhas.push(name)
    console.error(
      `✗ ${name}: REMOVIDO do web mas FALHOU ao adicionar no storefront — ` +
        `${add.status} ${await add.text()} — RE-ADICIONAR no web para rollback!`
    )
  }
}

// 4) Verifica emissão de cert / verificação por domínio movido com sucesso.
console.log('\nVerificando status dos domínios no destino...')
for (const name of moveable) {
  if (falhas.includes(name)) continue
  const res = await api(`/v9/projects/${VERCEL_STOREFRONT_PROJECT_ID}/domains/${name}`)
  if (!res.ok) {
    console.log(`? ${name}: não consegui ler status (${res.status})`)
    continue
  }
  const d = await res.json()
  console.log(`${d.verified ? '✓' : '⏳'} ${name}: verified=${d.verified}`)
}

console.log(`\nResumo — movidos: ${ok}, falhas: ${falhou}`)
if (falhou > 0) {
  console.error(
    `\n⚠ ATENÇÃO: ${falhou} domínio(s) falharam: ${falhas.join(', ')}\n` +
      `Domínios que foram removidos do web mas não entraram no storefront estão ` +
      `FORA DO AR. Rollback: re-adicionar no projeto web (que ainda tem o rewrite ` +
      `intacto até o passo 6). Ver "Rollback" no runbook.`
  )
  process.exit(1)
}
