import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const rotasPublicas = ['/entrar', '/onboarding']

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

  // Rotas públicas: usuário logado com conta criada (tenant existe) já é mandado para o dashboard.
  // A configuração de recebimentos (Stripe Express) é opcional pós-conta — não bloqueia mais aqui.
  if (rotasPublicas.some(rota => pathname.startsWith(rota))) {
    if (user) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .single()

      if (!tenant) {
        if (pathname.startsWith('/onboarding')) {
          return response
        }
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }

      if (pathname.startsWith('/onboarding/stripe')) {
        return response // permite voltar para finalizar Stripe quando o usuário escolher
      }

      return NextResponse.redirect(new URL('/', request.url))
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
