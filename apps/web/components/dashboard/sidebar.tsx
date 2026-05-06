'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  ShoppingBag,
  Package,
  DollarSign,
  Store,
  Bike,
  BarChart3,
  Settings,
  Bell,
  Star,
  HelpCircle,
  Search,
  LogOut,
  UserCircle,
  type LucideIcon,
} from 'lucide-react'
import { logout } from '@/lib/actions/auth'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  badge?: number
}

const mainItems: NavItem[] = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/pedidos', label: 'Pedidos', icon: ShoppingBag, badge: 2 },
  { href: '/produtos', label: 'Produtos', icon: Package },
  { href: '/financeiro', label: 'Financeiro', icon: DollarSign },
  { href: '/minha-loja', label: 'Minha Loja', icon: Store },
  { href: '/entregadores', label: 'Entregadores', icon: Bike },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3 },
]

const configItems: NavItem[] = [
  { href: '/mensagens', label: 'Mensagens', icon: Bell },
  { href: '/avaliacoes', label: 'Avaliações', icon: Star },
  { href: '/configuracoes/loja', label: 'Configurações', icon: Settings },
  { href: '/configuracoes/conta', label: 'Minha conta', icon: UserCircle },
  { href: '/ajuda', label: 'Central de ajuda', icon: HelpCircle },
]

interface Props {
  nomeLoja: string
}

export function SidebarDashboard({ nomeLoja }: Props) {
  const pathname = usePathname()

  return (
    <aside
      className="flex flex-col flex-shrink-0 sticky top-0"
      style={{
        width: 236,
        height: '100vh',
        background: 'var(--sidebar)',
        color: 'var(--sidebar-ink)',
        padding: '20px 14px',
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-2 pb-[18px] pt-1">
        <div
          className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center font-extrabold text-base tracking-tight"
          style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
        >
          M
        </div>
        <div>
          <div className="text-[15px] font-bold tracking-tight">Mallevo</div>
          <div className="text-[10px]" style={{ color: 'var(--sidebar-ink-3)' }}>
            shopping de Divinópolis
          </div>
        </div>
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-2 mb-5 rounded-[10px]"
        style={{
          padding: '8px 12px',
          background: 'var(--sidebar-2)',
          border: '1px solid var(--sidebar-line)',
        }}
      >
        <Search className="w-3.5 h-3.5" style={{ color: 'var(--sidebar-ink-3)' }} />
        <input
          placeholder="Buscar..."
          className="bg-transparent outline-none border-none flex-1 text-[12px]"
          style={{ color: 'var(--sidebar-ink)' }}
        />
        <span
          className="font-mono text-[9px] px-1.5 py-0.5 rounded"
          style={{ color: 'var(--sidebar-ink-3)', background: 'rgba(255,255,255,0.05)' }}
        >
          ⌘K
        </span>
      </div>

      <SectionLabel>Menu principal</SectionLabel>
      <nav className="flex flex-col gap-0.5">
        {mainItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      <div className="pt-[22px]">
        <SectionLabel>Configurações</SectionLabel>
      </div>
      <nav className="flex flex-col gap-0.5">
        {configItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      {/* Próximo evento */}
      <div
        className="mt-auto rounded-[14px]"
        style={{
          padding: 14,
          background: 'var(--sidebar-2)',
          border: '1px solid var(--sidebar-line)',
        }}
      >
        <div
          className="text-[9px] uppercase font-semibold mb-1.5"
          style={{ color: 'var(--sidebar-ink-3)', letterSpacing: '0.14em' }}
        >
          Próximo evento
        </div>
        <div className="text-[13px] font-bold tracking-tight">Feira Central</div>
        <div className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--sidebar-ink-2)' }}>
          20 abr · 17h—20h
        </div>
        <div className="flex gap-1 mt-2.5">
          <Chip variant="muted">Lojistas</Chip>
          <Chip variant="brick">Reunião</Chip>
        </div>
      </div>

      <form action={logout} className="pt-3">
        <button
          type="submit"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[12.5px] font-medium w-full transition-all"
          style={{ color: 'var(--sidebar-ink-3)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--sidebar-ink)'
            e.currentTarget.style.background = 'var(--sidebar-2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--sidebar-ink-3)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <LogOut className="w-4 h-4" />
          Sair da conta
        </button>
      </form>

      <div className="text-[10px] mt-1 px-2" style={{ color: 'var(--sidebar-ink-3)' }}>
        {nomeLoja}
      </div>
    </aside>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[10px] uppercase font-semibold px-2 pb-2"
      style={{ color: 'var(--sidebar-ink-3)', letterSpacing: '0.14em' }}
    >
      {children}
    </div>
  )
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13px] transition-all"
      style={{
        background: active ? 'var(--brick)' : 'transparent',
        color: active ? 'var(--brick-ink)' : 'var(--sidebar-ink-2)',
        fontWeight: active ? 700 : 500,
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'var(--sidebar-2)'
          e.currentTarget.style.color = 'var(--sidebar-ink)'
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--sidebar-ink-2)'
        }
      }}
    >
      <Icon className="w-4 h-4" strokeWidth={1.75} />
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <span
          className="px-1.5 py-px rounded-full text-[10px] font-bold"
          style={{
            background: active ? 'var(--ink)' : 'var(--brick)',
            color: active ? 'var(--brick)' : 'var(--brick-ink)',
          }}
        >
          {item.badge}
        </span>
      )}
    </Link>
  )
}

function Chip({ children, variant }: { children: React.ReactNode; variant: 'muted' | 'brick' }) {
  const styles =
    variant === 'brick'
      ? { background: 'var(--brick)', color: 'var(--brick-ink)' }
      : { background: 'rgba(255,255,255,0.08)', color: 'var(--sidebar-ink)' }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold"
      style={styles}
    >
      {children}
    </span>
  )
}
