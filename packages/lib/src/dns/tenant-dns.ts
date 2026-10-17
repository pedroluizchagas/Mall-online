const CF_BASE = 'https://api.cloudflare.com/client/v4'
const VERCEL_BASE = 'https://api.vercel.com'

export type ProvisionResult =
  | { success: true; domain: string; cloudflareId: string }
  | { success: false; domain: string; error: string; step: 'cloudflare' | 'vercel' }

function sanitizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63)
}

function cfHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

function vercelHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

function vercelAddUrl(projectId: string, teamId?: string): string {
  const base = `${VERCEL_BASE}/v10/projects/${projectId}/domains`
  return teamId ? `${base}?teamId=${teamId}` : base
}

function vercelDomainUrl(projectId: string, domain: string, teamId?: string): string {
  const base = `${VERCEL_BASE}/v9/projects/${projectId}/domains/${domain}`
  return teamId ? `${base}?teamId=${teamId}` : base
}

/**
 * Os subdomínios das lojas moram no projeto do STOREFRONT na Vercel — é ele
 * que serve `<slug>.mallevo.com.br`. Ligado a outro projeto, a loja e o
 * preview de Minha Loja abrem a página daquele projeto: em 2026-10-17 a troca
 * de slug da Drazzo pôs `drazzoo.mallevo.com.br` no projeto do PAINEL, porque
 * `VERCEL_PROJECT_ID` apontava para ele. Por isso a variável é própria (o
 * mesmo nome de scripts/vercel-backfill-store-domains.mjs) e não tem reserva.
 */
function projetoDoStorefront(): string | null {
  return process.env.VERCEL_STOREFRONT_PROJECT_ID || null
}

export async function provisionTenantDomain(slug: string): Promise<ProvisionResult> {
  const sanitized = sanitizeSlug(slug)
  const domain = `${sanitized}.mallevo.com.br`
  const zoneId = process.env.CLOUDFLARE_ZONE_ID!
  const projectId = projetoDoStorefront()
  const teamId = process.env.VERCEL_TEAM_ID || undefined

  // Sem o projeto do storefront não há onde ligar o domínio: falha antes de
  // criar qualquer registro, em vez de cair no projeto errado.
  if (!projectId) {
    return {
      success: false,
      domain,
      error: 'VERCEL_STOREFRONT_PROJECT_ID não configurado',
      step: 'vercel',
    }
  }

  try {
    // Step 1: Cloudflare — create CNAME (or reuse existing)
    let cloudflareId: string

    const checkRes = await fetch(
      `${CF_BASE}/zones/${zoneId}/dns_records?type=CNAME&name=${domain}`,
      { headers: cfHeaders() }
    )
    const checkData = await checkRes.json()

    if (checkData.result?.length > 0) {
      cloudflareId = checkData.result[0].id
    } else {
      const createRes = await fetch(`${CF_BASE}/zones/${zoneId}/dns_records`, {
        method: 'POST',
        headers: cfHeaders(),
        body: JSON.stringify({
          type: 'CNAME',
          name: sanitized,
          content: 'cname.vercel-dns.com',
          ttl: 1,
          proxied: false,
        }),
      })
      const createData = await createRes.json()

      if (!createData.success) {
        return {
          success: false,
          domain,
          error: createData.errors?.[0]?.message ?? 'Cloudflare DNS error',
          step: 'cloudflare',
        }
      }
      cloudflareId = createData.result.id
    }

    // Step 2: Vercel — add domain to project
    const addRes = await fetch(vercelAddUrl(projectId, teamId), {
      method: 'POST',
      headers: vercelHeaders(),
      body: JSON.stringify({ name: domain }),
    })
    const addData = await addRes.json()

    const alreadyInUse =
      addData.error?.code === 'domain_already_in_use' ||
      addData.error?.code === 'domain_conflict'

    if (!addRes.ok && !alreadyInUse) {
      // Rollback: remove CNAME from Cloudflare
      await fetch(`${CF_BASE}/zones/${zoneId}/dns_records/${cloudflareId}`, {
        method: 'DELETE',
        headers: cfHeaders(),
      })

      return {
        success: false,
        domain,
        error: addData.error?.message ?? 'Vercel domain error',
        step: 'vercel',
      }
    }

    // "Já em uso" só é sucesso se o domínio estiver NESTE projeto. Em outro
    // (o do painel), a loja continuaria abrindo a página errada — e antes isso
    // passava como provisionado.
    if (alreadyInUse) {
      const noStorefront = await fetch(vercelDomainUrl(projectId, domain, teamId), {
        headers: vercelHeaders(),
      })
      if (!noStorefront.ok) {
        return {
          success: false,
          domain,
          error: `${domain} está ligado a outro projeto da Vercel; mova-o para o projeto do storefront`,
          step: 'vercel',
        }
      }
    }

    return { success: true, domain, cloudflareId }
  } catch (err) {
    return {
      success: false,
      domain,
      error: err instanceof Error ? err.message : 'Erro de rede inesperado',
      step: 'cloudflare',
    }
  }
}

export async function deprovisionTenantDomain(slug: string): Promise<void> {
  const sanitized = sanitizeSlug(slug)
  const domain = `${sanitized}.mallevo.com.br`
  const zoneId = process.env.CLOUDFLARE_ZONE_ID!
  const projectId = projetoDoStorefront()
  const teamId = process.env.VERCEL_TEAM_ID || undefined

  await Promise.allSettled([
    (async () => {
      const res = await fetch(
        `${CF_BASE}/zones/${zoneId}/dns_records?type=CNAME&name=${domain}`,
        { headers: cfHeaders() }
      )
      const data = await res.json()
      const record = data.result?.[0]
      if (record) {
        await fetch(`${CF_BASE}/zones/${zoneId}/dns_records/${record.id}`, {
          method: 'DELETE',
          headers: cfHeaders(),
        })
      }
    })(),
    // Sem o projeto do storefront, não remove de projeto nenhum (nunca do errado).
    projectId
      ? fetch(vercelDomainUrl(projectId, domain, teamId), {
          method: 'DELETE',
          headers: vercelHeaders(),
        })
      : Promise.resolve(),
  ])
}
