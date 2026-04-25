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

  // Rotas públicas: se logado, redireciona para dashboard ou onboarding se não finalizou
  if (rotasPublicas.some(rota => pathname.startsWith(rota))) {
    if (user) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, stripe_onboarding_ok')
        .single()

      if (!tenant || !tenant.stripe_onboarding_ok) {
        if (pathname.startsWith('/onboarding')) {
           return response // let them finish onboarding
        }
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return response
  }

  // Rotas do dashboard: precisa estar logado e com tenant
  if (pathname.startsWith('/dashboard')) {
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
