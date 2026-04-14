import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rotas acessíveis sem login
const rotasPublicas = ['/entrar', '/cadastro']

// Rotas que exigem login mas não tenant (onboarding)
const rotasOnboarding = ['/onboarding']

// Rotas do painel do lojista
const rotasDashboard = [
  '/pedidos',
  '/produtos',
  '/categorias',
  '/financeiro',
  '/configuracoes',
  '/estoque',
]

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  const ehPublica    = rotasPublicas.some(r => pathname.startsWith(r))
  const ehOnboarding = rotasOnboarding.some(r => pathname.startsWith(r))
  const ehDashboard  = rotasDashboard.some(r => pathname.startsWith(r))

  // ── Rotas públicas (/entrar, /cadastro) ──────────────────────
  // Se já logado, redireciona conforme o estado do onboarding
  if (ehPublica) {
    if (user) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, stripe_onboarding_ok')
        .single()

      if (!tenant || !tenant.stripe_onboarding_ok) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
      return NextResponse.redirect(new URL('/pedidos', request.url))
    }
    return response
  }

  // ── Onboarding ────────────────────────────────────────────────
  // Exige login; se já completou, manda para o dashboard
  if (ehOnboarding) {
    if (!user) {
      return NextResponse.redirect(new URL('/entrar', request.url))
    }
    return response
  }

  // ── Dashboard ─────────────────────────────────────────────────
  // Exige login; onboarding e assinatura são verificados no layout
  if (ehDashboard) {
    if (!user) {
      return NextResponse.redirect(new URL('/entrar', request.url))
    }
    return response
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
}
