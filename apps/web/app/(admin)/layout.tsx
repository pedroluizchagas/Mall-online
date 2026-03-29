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

  const role = user.user_metadata?.role
  if (role !== 'admin') redirect('/dashboard')

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
        <p className="text-white font-bold text-base">Admin</p>
        <p className="text-green-300 text-xs mt-0.5">Plataforma</p>
      </div>

      <nav className="flex flex-col gap-1 px-3">
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
    </aside>
  )
}
