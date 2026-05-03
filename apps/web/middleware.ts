import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const IGNORED_SUBDOMAINS = new Set(['www', 'app', 'admin', 'api'])
const MAIN_DOMAINS = ['mallevo.com.br', 'mallevo.localhost']

function getSubdomain(hostname: string): string | null {
  const host = hostname.split(':')[0]

  for (const domain of MAIN_DOMAINS) {
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

function comCookies(destino: URL, response: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(destino)
  response.cookies.getAll().forEach((c) => redirect.cookies.set(c.name, c.value, c))
  return redirect
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const slug = getSubdomain(hostname)

  if (slug) {
    const url = request.nextUrl.clone()
    const pathname = url.pathname
    url.pathname = `/loja/${slug}${pathname === '/' ? '' : pathname}`
    const response = NextResponse.rewrite(url)
    response.headers.set('x-subdomain', slug)
    return response
  }

  const pathname = request.nextUrl.pathname

  // Apenas GET requests em rotas públicas recebem lógica de auth.
  // POSTs (Server Actions) e requests para rotas privadas passam direto.
  const rotaPublica = pathname.startsWith('/entrar') || pathname.startsWith('/onboarding')
  if (request.method !== 'GET' || !rotaPublica) {
    return NextResponse.next({ request })
  }

  // Stripe onboarding flow: skip auth check entirely — this route is prefetched by
  // SetupWizard and running getUser() here would race with the dashboard layout's own call.
  if (pathname.startsWith('/onboarding/stripe')) {
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })

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
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return response
  }

  // --- Usuário autenticado em rota pública ---

  // /entrar → redireciona para o dashboard; o layout decide se vai para /onboarding.
  // Não fazemos query de tenant aqui para evitar race condition com rotação de token.
  if (pathname.startsWith('/entrar')) {
    return comCookies(new URL('/', request.url), response)
  }

  // /onboarding → verifica se o usuário já tem tenant para evitar que
  // lojistas cadastrados vejam a tela de cadastro novamente.
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id')
    .single()

  // Erro inesperado (timeout, rede) → deixa passar; o layout trata.
  // PGRST116 = nenhuma linha = usuário sem tenant → onboarding é correto.
  if (tenantError && tenantError.code !== 'PGRST116') {
    return response
  }

  if (tenant) {
    // Tem tenant → não precisa mais de onboarding
    return comCookies(new URL('/', request.url), response)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
