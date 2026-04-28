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
} from 'lucide-react'

const mainLinks = [
  { href: '/admin', label: 'Visão Geral', icon: LayoutDashboard, exact: true },
  { href: '/admin/lojistas', label: 'Lojistas', icon: Store },
  { href: '/admin/entregadores', label: 'Entregadores', icon: Bike },
  { href: '/admin/planos', label: 'Planos', icon: CreditCard },
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
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
        isActive
          ? 'bg-[#4CAF82]/15 text-[#4CAF82]'
          : 'text-[#8B949E] hover:text-white hover:bg-white/5'
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
      <p className="px-3 mb-2 text-[10px] font-semibold text-[#8B949E]/70 uppercase tracking-widest">
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
    <aside className="w-[240px] min-w-[240px] h-screen bg-[#0D1117] flex flex-col border-r border-[#21262D]">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#4CAF82] rounded-xl flex items-center justify-center shadow-lg shadow-[#4CAF82]/30">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Mallora</p>
            <p className="text-[#8B949E] text-[10px] mt-0.5 tracking-wide">Painel Admin</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 mb-5">
        <div className="flex items-center gap-2 bg-[#161B22] border border-[#21262D] rounded-xl px-3 py-2.5 cursor-pointer hover:border-[#30363D] transition-colors">
          <Search size={13} className="text-[#8B949E]" />
          <span className="text-[#8B949E] text-xs flex-1">Pesquise aqui...</span>
          <kbd className="text-[10px] bg-[#21262D] text-[#8B949E] px-1.5 py-0.5 rounded font-mono leading-none">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 overflow-y-auto space-y-5">
        <NavSection title="Menu Principal" links={mainLinks} />
        <NavSection title="Financeiro" links={financeLinks} />
        <NavSection title="Configurações" links={configLinks} />
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-[#21262D]">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-[#1A4D3A] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{userName}</p>
            <p className="text-[#8B949E] text-[10px] truncate">{userEmail}</p>
          </div>
          <button className="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center transition-colors">
            <Bell size={14} className="text-[#8B949E]" />
          </button>
        </div>

        <form action="/api/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-2.5 w-full px-3 py-2 text-[#8B949E]
              hover:text-red-400 hover:bg-red-400/10 rounded-xl text-xs font-medium
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
