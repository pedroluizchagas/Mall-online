import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { SidebarNav } from '@/components/admin/sidebar-nav'

export default async function LayoutAdmin({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/entrar')
  if (user.user_metadata?.role !== 'admin') redirect('/entrar?erro=acesso-negado')

  const adminName = user.user_metadata?.nome || user.email?.split('@')[0] || 'Admin'
  const adminEmail = user.email || ''

  return (
    <div className="flex h-screen bg-[#F0F4F8] overflow-hidden">
      <SidebarNav userName={adminName} userEmail={adminEmail} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
