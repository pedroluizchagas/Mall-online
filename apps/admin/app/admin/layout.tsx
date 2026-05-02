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
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--sidebar)' }}>
      <SidebarNav userName={adminName} userEmail={adminEmail} />
      <div className="flex-1 overflow-hidden" style={{ padding: '12px 12px 12px 0' }}>
        <div
          className="flex flex-col rounded-[24px] overflow-hidden"
          style={{
            height: 'calc(100vh - 24px)',
            background: 'var(--bg)',
            boxShadow: '0 1px 0 rgba(255,255,255,0.04), 0 8px 24px -8px rgba(0,0,0,0.35)',
          }}
        >
          <main className="flex-1 overflow-y-auto min-h-0">{children}</main>
        </div>
      </div>
    </div>
  )
}
