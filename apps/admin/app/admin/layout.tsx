import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'

export default async function LayoutAdmin({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createSupabaseServer()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/entrar')

  if (user.user_metadata?.role !== 'admin') redirect('/entrar?erro=acesso-negado')

  return (
    <div className="flex h-screen bg-[#FFF8ED]">
      <SidebarAdmin />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}

function SidebarAdmin() {
  const links = [
    { href: '/admin', label: 'Visão geral' },
    { href: '/admin/lojistas', label: 'Lojistas' },
    { href: '/admin/entregadores', label: 'Entregadores' },
    { href: '/admin/planos', label: 'Planos' },
    { href: '/admin/financeiro', label: 'Financeiro' },
  ]

  return (
    <aside className="w-52 bg-[#1A4D3A] flex flex-col py-6">
      <div className="px-5 mb-8">
        <p className="text-white font-bold text-base">Mallora</p>
        <p className="text-green-300 text-xs mt-0.5">Admin</p>
      </div>

      <nav className="flex flex-col gap-1 px-3 flex-1">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-green-200 hover:text-white hover:bg-white/10
              px-3 py-2 rounded-lg text-sm transition-colors"
          >
            {link.label}
          </a>
        ))}
      </nav>

      <div className="px-3 mt-4">
        <form action="/api/logout" method="POST">
          <button
            type="submit"
            className="w-full text-left text-green-400 hover:text-white
              px-3 py-2 rounded-lg text-sm transition-colors"
          >
            Sair
          </button>
        </form>
      </div>
    </aside>
  )
}
