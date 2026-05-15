'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Store,
  Bike,
  CreditCard,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  Bell,
  Search,
  Inbox,
  PieChart,
} from 'lucide-react'

const mainLinks = [
  { href: '/admin', label: 'Visão Geral', icon: LayoutDashboard, exact: true },
  { href: '/admin/lojistas', label: 'Lojistas', icon: Store },
  { href: '/admin/entregadores', label: 'Entregadores', icon: Bike },
  { href: '/admin/planos', label: 'Planos', icon: CreditCard },
]

const templatesLinks = [
  { href: '/admin/lojas-outros', label: 'Lojas em Outros', icon: Inbox },
  { href: '/admin/adocao-templates', label: 'Adoção de Templates', icon: PieChart },
]

const financeLinks = [
  { href: '/admin/financeiro', label: 'Conciliação', icon: BarChart3 },
]

const configLinks = [
  { href: '/admin/configuracoes', label: 'Configurações', icon: Settings },
  { href: '/admin/ajuda', label: 'Central de Ajuda', icon: HelpCircle },
]

function NavLink({
  href,
  label,
  icon: Icon,
  exact,
}: {
  href: string
  label: string
  icon: React.ElementType
  exact?: boolean
}) {
  const pathname = usePathname()
  const isActive = exact ? pathname === href : pathname.startsWith(href)

  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13px] font-medium transition-all ${
        isActive
          ? 'bg-brick/15 text-brick'
          : 'text-sidebar-ink-2 hover:text-sidebar-ink hover:bg-white/5'
      }`}
    >
      <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
      {label}
    </Link>
  )
}

function NavSection({ title, links }: { title: string; links: typeof mainLinks }) {
  return (
    <div>
      <p className="px-3 mb-2 text-[10px] font-semibold text-sidebar-ink-3 uppercase tracking-widest">
        {title}
      </p>
      <div className="space-y-0.5">
        {links.map((link) => (
          <NavLink key={link.href} {...link} />
        ))}
      </div>
    </div>
  )
}

export function SidebarNav({
  userName,
  userEmail,
}: {
  userName: string
  userEmail: string
}) {
  return (
    <aside
      className="w-[236px] min-w-[236px] h-screen flex flex-col"
      style={{ background: 'var(--sidebar)' }}
    >
      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--brick)', boxShadow: '0 4px 12px rgba(193,241,72,0.3)' }}
          >
            <span className="font-bold text-sm" style={{ color: 'var(--brick-ink)' }}>M</span>
          </div>
          <div>
            <p className="text-sidebar-ink font-bold text-sm leading-none">Mallevo</p>
            <p className="text-sidebar-ink-3 text-[10px] mt-0.5 tracking-wide">Painel Admin</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 mb-5">
        <div
          className="flex items-center gap-2 rounded-[10px] px-3 py-2.5 cursor-pointer transition-colors hover:border-white/10"
          style={{
            background: 'var(--sidebar-2)',
            border: '1px solid var(--sidebar-line)',
          }}
        >
          <Search size={13} className="text-sidebar-ink-3" />
          <span className="text-sidebar-ink-3 text-xs flex-1">Pesquise aqui...</span>
          <kbd
            className="text-[10px] px-1.5 py-0.5 rounded font-mono leading-none text-sidebar-ink-3"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 overflow-y-auto space-y-5">
        <NavSection title="Menu Principal" links={mainLinks} />
        <NavSection title="Templates" links={templatesLinks} />
        <NavSection title="Financeiro" links={financeLinks} />
        <NavSection title="Configurações" links={configLinks} />
      </nav>

      {/* User footer */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid var(--sidebar-line)' }}>
        <div className="flex items-center gap-3 px-2 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(193,241,72,0.15)' }}
          >
            <span className="text-brick text-xs font-bold">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sidebar-ink text-xs font-semibold truncate">{userName}</p>
            <p className="text-sidebar-ink-3 text-[10px] truncate">{userEmail}</p>
          </div>
          <button className="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center transition-colors">
            <Bell size={14} className="text-sidebar-ink-3" />
          </button>
        </div>

        <form action="/api/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sidebar-ink-2
              hover:text-err hover:bg-err/10 rounded-[10px] text-xs font-medium
              transition-colors"
          >
            <LogOut size={14} />
            Sair da conta
          </button>
        </form>
      </div>
    </aside>
  )
}
