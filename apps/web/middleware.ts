import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const rotasPublicas = ['/entrar', '/onboarding']

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
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

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
        return response
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
