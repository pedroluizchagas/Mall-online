import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function comCookies(destino: URL, response: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(destino)
  response.cookies.getAll().forEach((c) => redirect.cookies.set(c.name, c.value, c))
  return redirect
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Remover a restrição de rota pública para garantir que o token seja sempre renovado
  // pelo middleware conforme as melhores práticas do @supabase/ssr.
  // Apenas ignoramos rotas de webhook ou api se necessário (já ignorado pelo matcher).

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
  if (pathname.startsWith('/entrar')) {
    return comCookies(new URL('/', request.url), response)
  }

  // Apenas verifica tenant quando o usuário está na rota /onboarding para evitar
  // que lojistas cadastrados vejam a tela de cadastro novamente. Para qualquer
  // outra rota autenticada, o middleware não interfere — o layout trata a lógica.
  if (!pathname.startsWith('/onboarding')) {
    return response
  }

  const { data: tenants, error: tenantError } = await supabase
    .from('tenants')
    .select('id')
    .limit(1)

  // Erro inesperado (timeout, rede) → deixa passar; o layout trata.
  if (tenantError) {
    return response
  }

  const tenant = tenants?.[0]

  if (tenant) {
    return comCookies(new URL('/', request.url), response)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
