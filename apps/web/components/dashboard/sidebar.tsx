'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/lib/actions/auth'
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  DollarSign,
  Settings,
  LogOut,
  Store,
} from 'lucide-react'

const nav = [
  { href: '/', icon: LayoutDashboard, label: 'Início' },
  { href: '/pedidos', icon: ShoppingBag, label: 'Pedidos' },
  { href: '/produtos', icon: Package, label: 'Produtos' },
  { href: '/financeiro', icon: DollarSign, label: 'Financeiro' },
  { href: '/configuracoes', icon: Settings, label: 'Configurações' },
]

interface Props {
  nomeLoja: string
}

export function SidebarDashboard({ nomeLoja }: Props) {
  const pathname = usePathname()

  return (
    <aside className="w-[220px] flex-shrink-0 flex flex-col bg-[#18181B] h-screen sticky top-0 border-r border-white/[0.04]">
      {/* Logo */}
      <div className="px-5 h-[64px] flex items-center gap-3 border-b border-white/[0.04]">
        <div className="w-8 h-8 rounded-lg bg-[#C1F148] flex items-center justify-center">
          <span className="font-bold text-[#18181B] text-base leading-none">M</span>
        </div>
        <span className="font-semibold text-white tracking-tight text-[15px]">Mallevo</span>
      </div>

      {/* Store badge */}
      <div className="px-3 pt-4 pb-2">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.04]">
          <div className="w-5 h-5 rounded-md bg-white/[0.08] flex items-center justify-center flex-shrink-0">
            <Store className="w-3 h-3 text-zinc-400" />
          </div>
          <span className="text-[13px] text-zinc-400 font-medium truncate">{nomeLoja}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-2 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, icon: Icon, label }) => {
          const active =
            pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-150 ${
                active
                  ? 'bg-white/[0.07] text-[#C1F148]'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]'
              }`}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[#C1F148]' : ''}`}
              />
              {label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#C1F148]" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/[0.04]">
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.04] transition-all w-full"
          >
            <LogOut className="w-4 h-4" />
            Sair da conta
          </button>
        </form>
      </div>
    </aside>
  )
}
