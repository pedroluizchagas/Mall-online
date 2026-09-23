import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Domínios "raiz" (apex). Tudo que for `<slug>.<MAIN_DOMAIN>` é uma loja.
// Portado de apps/web/middleware.ts (origem de getSubdomain()).
const MAIN_DOMAINS = ['mallevo.com.br', 'mallevo.localhost']

// Hosts de máquina (dev, `next start` do smoke, healthcheck da plataforma).
// Também são apex: `localhost:3002/` é o saguão desde a Fase 5.
const HOSTS_LOCAIS = ['localhost', '127.0.0.1', '[::1]']

/** Tudo que o storefront reconhece como seu. Fora disto → 404 (ver abaixo). */
const DOMINIOS_CONHECIDOS = [...MAIN_DOMAINS, ...HOSTS_LOCAIS]

// Subdomínios reservados (Dashboard/Admin/API/www) nunca são slug de loja.
const IGNORED_SUBDOMAINS = new Set(['www', 'app', 'admin', 'api'])

/** Rotas do saguão no apex: home, Explorar e um piso. */
const ROTAS_SAGUAO = /^\/(|explorar|piso\/[a-z0-9-]+)$/

/** Host sem porta e em minúsculas — `Host:` não é case-sensitive. */
function normalizarHost(hostname: string): string {
  return hostname.split(':')[0].toLowerCase()
}

/**
 * O host pertence ao storefront? Apex, `www`, `<slug>.<apex>` e as máquinas
 * locais. Um host estranho (domínio apontado por engano, preview da Vercel,
 * varredura de bots) NÃO é o saguão — ver a guarda em `middleware`.
 */
function hostConhecido(hostname: string): boolean {
  const host = normalizarHost(hostname)
  return DOMINIOS_CONHECIDOS.some((d) => host === d || host.endsWith(`.${d}`))
}

/**
 * Extrai o slug da loja a partir do header `host`.
 * Portado de apps/web/middleware.ts. Retorna `null` no apex / www /
 * subdomínio reservado / host desconhecido.
 */
function getSubdomain(hostname: string): string | null {
  const host = normalizarHost(hostname)

  for (const domain of DOMINIOS_CONHECIDOS) {
    if (host === domain) return null
    if (host.endsWith(`.${domain}`)) {
      const sub = host.slice(0, host.length - domain.length - 1)
      if (!sub.includes('.') && !IGNORED_SUBDOMAINS.has(sub)) {
        return sub
      }
    }
  }

  return null
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''

  // Host fora dos domínios da Mallevo: 404 seco, em vez de servir o saguão
  // (conteúdo duplicado para o Google e domínio de terceiro exibindo a
  // marca). Previews da Vercel (`*.vercel.app`) ligam
  // NEXT_PUBLIC_ALLOW_UNKNOWN_HOST=true e voltam a cair no apex.
  if (!hostConhecido(hostname) && process.env.NEXT_PUBLIC_ALLOW_UNKNOWN_HOST !== 'true') {
    return new NextResponse('Host desconhecido', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }

  const slug = getSubdomain(hostname)

  // Header `x-store-slug` injetado no request para as páginas lerem via
  // next/headers (roteamento host-based — D1; NÃO há rewrite para
  // `/loja/{slug}`). Apex/www/sem slug → header ausente; a página resolve
  // para "loja não encontrada" (notFound), sem crash.
  //
  // Em Next 14 a única forma de um header injetado chegar aos Server
  // Components (`headers()`) é repassar `request.headers` em
  // `NextResponse.next({ request: { headers } })`. Mutar `request.headers`
  // direto não propaga.
  const requestHeaders = new Headers(request.headers)
  if (slug) {
    requestHeaders.set('x-store-slug', slug)
  } else {
    requestHeaders.delete('x-store-slug')
  }

  // Saguão (Fase 5): sem slug — apex, www ou host sem subdomínio (dev) — a
  // home, o Explorar e as páginas de piso são reescritos para `app/saguao`.
  // Reescrita interna: a URL do navegador continua `/`, `/explorar`,
  // `/piso/<slug>`. Num host de loja o grupo `saguao` não existe (404).
  const { pathname } = request.nextUrl
  // O caminho interno nunca é a URL canônica: `/saguao/x` → `/x`.
  if (!slug && (pathname === '/saguao' || pathname.startsWith('/saguao/'))) {
    const canonica = request.nextUrl.clone()
    canonica.pathname = pathname.slice('/saguao'.length) || '/'
    return NextResponse.redirect(canonica, 308)
  }
  let destino: URL | null = null
  if (!slug && ROTAS_SAGUAO.test(pathname)) {
    destino = request.nextUrl.clone()
    destino.pathname = pathname === '/' ? '/saguao' : `/saguao${pathname}`
  }
  const responder = () =>
    destino
      ? NextResponse.rewrite(destino, { request: { headers: requestHeaders } })
      : NextResponse.next({ request: { headers: requestHeaders } })

  // Override de QA (`?preset=slice&categoria=alimentos-bebidas`): só quando
  // STOREFRONT_ALLOW_PREVIEW_OVERRIDE=true no ambiente (nunca em produção).
  // Vira header porque layouts não recebem searchParams; `lib/tenant.ts`
  // aplica sobre a loja carregada. Base do `/_preview` da Fase 3.
  requestHeaders.delete('x-preview-preset')
  requestHeaders.delete('x-preview-categoria')
  if (process.env.STOREFRONT_ALLOW_PREVIEW_OVERRIDE === 'true') {
    const preset = request.nextUrl.searchParams.get('preset')
    const categoria = request.nextUrl.searchParams.get('categoria')
    if (preset) requestHeaders.set('x-preview-preset', preset)
    if (categoria) requestHeaders.set('x-preview-categoria', categoria)
  }

  // --- Cookie dance @supabase/ssr (mesmo bloco de apps/web/middleware.ts) ---
  // Renova o token do consumer a cada request. Sessão escopada ao host
  // exato (D5). Diferença-chave vs. web: o storefront NÃO faz rewrite.
  let response = responder()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = responder()
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Renova/valida o token do consumer (cookie setado/renovado via setAll).
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
