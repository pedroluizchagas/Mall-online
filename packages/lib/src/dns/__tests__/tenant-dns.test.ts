import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provisionTenantDomain } from '../tenant-dns'

/**
 * Onde o subdomínio da loja é ligado na Vercel. Em 2026-10-17 a troca de slug
 * da Drazzo pôs `drazzoo.mallevo.com.br` no projeto do PAINEL (o
 * `VERCEL_PROJECT_ID` dele): a loja e o preview de Minha Loja passaram a abrir
 * o 404 do painel, e o "já em uso" ainda contava como provisionado.
 * Nada aqui sai para a rede: o `fetch` é simulado.
 */

const STOREFRONT = 'prj_storefront'
const PAINEL = 'prj_painel'

type Resposta = { ok: boolean; status: number; corpo: unknown }
const resposta = (status: number, corpo: unknown = {}): Resposta => ({ ok: status < 400, status, corpo })

function simularFetch(rotear: (url: string, init?: RequestInit) => Resposta) {
  const chamadas: { url: string; metodo: string }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      chamadas.push({ url, metodo: init?.method ?? 'GET' })
      const r = rotear(url, init)
      return { ok: r.ok, status: r.status, json: async () => r.corpo }
    }),
  )
  return chamadas
}

/** Cloudflare sem CNAME prévio + criação ok; a Vercel decide o resto. */
const cloudflareOk = (url: string, init?: RequestInit): Resposta | null => {
  if (!url.startsWith('https://api.cloudflare.com')) return null
  if (init?.method === 'POST') return resposta(200, { success: true, result: { id: 'cf-1' } })
  if (init?.method === 'DELETE') return resposta(200, { success: true })
  return resposta(200, { result: [] })
}

beforeEach(() => {
  vi.stubEnv('CLOUDFLARE_ZONE_ID', 'zona')
  vi.stubEnv('CLOUDFLARE_API_TOKEN', 'cf')
  vi.stubEnv('VERCEL_TOKEN', 'vt')
  vi.stubEnv('VERCEL_TEAM_ID', '')
  // O projeto do painel também está no ambiente (é assim na Vercel) — e não pode ser usado.
  vi.stubEnv('VERCEL_PROJECT_ID', PAINEL)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('provisionTenantDomain — o domínio vai para o projeto do storefront', () => {
  it('sem VERCEL_STOREFRONT_PROJECT_ID falha antes de tocar em DNS, mesmo com VERCEL_PROJECT_ID', async () => {
    vi.stubEnv('VERCEL_STOREFRONT_PROJECT_ID', '')
    const chamadas = simularFetch(() => resposta(500))

    const r = await provisionTenantDomain('drazzoo')

    expect(r).toMatchObject({ success: false, step: 'vercel', domain: 'drazzoo.mallevo.com.br' })
    expect(chamadas).toHaveLength(0)
  })

  it('liga o domínio no projeto do storefront, nunca no do painel', async () => {
    vi.stubEnv('VERCEL_STOREFRONT_PROJECT_ID', STOREFRONT)
    const chamadas = simularFetch((url, init) => cloudflareOk(url, init) ?? resposta(200, { name: 'x' }))

    const r = await provisionTenantDomain('drazzoo')

    expect(r).toEqual({ success: true, domain: 'drazzoo.mallevo.com.br', cloudflareId: 'cf-1' })
    const vercel = chamadas.filter((c) => c.url.startsWith('https://api.vercel.com'))
    expect(vercel).toEqual([{ url: `https://api.vercel.com/v10/projects/${STOREFRONT}/domains`, metodo: 'POST' }])
    expect(chamadas.some((c) => c.url.includes(PAINEL))).toBe(false)
  })

  it('"já em uso" no próprio storefront continua sendo sucesso', async () => {
    vi.stubEnv('VERCEL_STOREFRONT_PROJECT_ID', STOREFRONT)
    simularFetch((url, init) => {
      const cf = cloudflareOk(url, init)
      if (cf) return cf
      if (init?.method === 'POST') return resposta(409, { error: { code: 'domain_already_in_use' } })
      return resposta(200, { name: 'drazzoo.mallevo.com.br', projectId: STOREFRONT })
    })

    expect(await provisionTenantDomain('drazzoo')).toMatchObject({ success: true })
  })

  it('"já em uso" em OUTRO projeto falha e diz o que fazer — não vira provisionado', async () => {
    vi.stubEnv('VERCEL_STOREFRONT_PROJECT_ID', STOREFRONT)
    const chamadas = simularFetch((url, init) => {
      const cf = cloudflareOk(url, init)
      if (cf) return cf
      if (init?.method === 'POST') return resposta(409, { error: { code: 'domain_already_in_use' } })
      return resposta(404, { error: { code: 'not_found' } })
    })

    const r = await provisionTenantDomain('drazzoo')

    expect(r).toMatchObject({ success: false, step: 'vercel' })
    expect(r.success === false && r.error).toMatch(/outro projeto/)
    // O CNAME aponta para a Vercel de qualquer jeito: não é apagado.
    expect(chamadas.some((c) => c.metodo === 'DELETE')).toBe(false)
  })
})
