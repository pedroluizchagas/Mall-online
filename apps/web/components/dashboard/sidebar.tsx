'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useState, type MouseEvent } from 'react'
import {
  Home,
  ShoppingBag,
  Package,
  DollarSign,
  Store,
  Bike,
  Calendar,
  BarChart3,
  Settings,
  Bell,
  Star,
  HelpCircle,
  LogOut,
  UserCircle,
  Tag,
  Users,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react'
import { logout } from '@/lib/actions/auth'
import type { DashboardTemplate } from '@mallora/lib'

type GrupoLabel = 'OPERAR' | 'ANALISAR' | 'MINHA LOJA' | 'CONTA'
type SubItem = { href: string; label: string }
type ItemMenu = {
  id: string
  label: string
  icon: LucideIcon
  href?: string
  badge?: number
  subitems?: SubItem[]
}
type Grupo = { label: GrupoLabel; itens: ItemMenu[] }

const COR_REPOUSO = 'var(--sidebar-ink-2)'
const COR_HOVER = 'var(--sidebar-ink)'
const BG_HOVER = 'var(--sidebar-2)'

function buildGrupos(template: DashboardTemplate): Grupo[] {
  const operar: ItemMenu[] = [{ id: 'inicio', href: '/', label: 'Início', icon: Home }]

  if (template.modulos.pedidos) {
    operar.push({ id: 'pedidos', href: '/pedidos', label: 'Pedidos', icon: ShoppingBag, badge: 2 })
  }

  if (template.modulos.produtos) {
    const subitems: SubItem[] = [
      { href: '/produtos', label: template.produto.labels.produtoPlural },
      { href: '/categorias', label: 'Categorias' },
    ]
    if (template.modulos.estoque) subitems.push({ href: '/estoque', label: 'Estoque' })
    operar.push({ id: 'catalogo', label: 'Catálogo', icon: Package, subitems })
  }

  if (template.modulos.entregadores) {
    operar.push({ id: 'entregadores', href: '/entregadores', label: 'Entregadores', icon: Bike })
  }
  if (template.modulos.agenda) {
    operar.push({ id: 'agenda', href: '/agenda', label: 'Agenda', icon: Calendar })
  }
  operar.push(
    { id: 'mensagens', href: '/mensagens', label: 'Mensagens', icon: Bell },
    { id: 'avaliacoes', href: '/avaliacoes', label: 'Avaliações', icon: Star },
  )

  const analisar: ItemMenu[] = []
  if (template.modulos.financeiro) {
    analisar.push({ id: 'financeiro', href: '/financeiro', label: 'Financeiro', icon: DollarSign })
  }
  if (template.modulos.relatorios) {
    analisar.push({ id: 'relatorios', href: '/relatorios', label: 'Relatórios', icon: BarChart3 })
  }

  const minhaLoja: ItemMenu[] = [
    { id: 'vitrine', href: '/minha-loja', label: 'Vitrine', icon: Store },
    { id: 'configuracoes', href: '/configuracoes', label: 'Configurações', icon: Settings },
    { id: 'tipo-de-loja', href: '/configuracoes/tipo-de-loja', label: 'Tipo de loja', icon: Tag },
  ]
  if (template.modulos.agenda) {
    minhaLoja.push({
      id: 'staff',
      href: '/configuracoes/staff',
      label: 'Profissionais',
      icon: Users,
    })
  }

  const conta: ItemMenu[] = [
    { id: 'minha-conta', href: '/configuracoes/conta', label: 'Minha conta', icon: UserCircle },
    { id: 'ajuda', href: '/ajuda', label: 'Central de ajuda', icon: HelpCircle },
  ]

  return [
    { label: 'OPERAR', itens: operar },
    { label: 'ANALISAR', itens: analisar },
    { label: 'MINHA LOJA', itens: minhaLoja },
    { label: 'CONTA', itens: conta },
  ]
}

function rotaAtiva(pathname: string, href: string) {
  return pathname === href || (href !== '/' && pathname.startsWith(href + '/'))
}

function hoverHandlers(travado: boolean, corRepouso = COR_REPOUSO) {
  return {
    onMouseEnter: (e: MouseEvent<HTMLElement>) => {
      if (travado) return
      e.currentTarget.style.background = BG_HOVER
      e.currentTarget.style.color = COR_HOVER
    },
    onMouseLeave: (e: MouseEvent<HTMLElement>) => {
      if (travado) return
      e.currentTarget.style.background = 'transparent'
      e.currentTarget.style.color = corRepouso
    },
  }
}

interface Props {
  nomeLoja: string
  template: DashboardTemplate
}

export function SidebarDashboard({ nomeLoja, template }: Props) {
  const pathname = usePathname()
  const grupos = buildGrupos(template)
  const versao = process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev'

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

      <nav
        aria-label="Navegação principal"
        className="flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto pr-1 -mr-1"
      >
        {grupos.map((grupo) => (
          <GrupoSidebar key={grupo.label} grupo={grupo} pathname={pathname} />
        ))}
      </nav>

      <div
        className="pt-3 mt-3 px-2 flex items-center justify-between gap-2"
        style={{ borderTop: '1px solid var(--sidebar-line)' }}
      >
        <span
          className="text-[10px] truncate"
          style={{ color: 'var(--sidebar-ink-3)' }}
          title={nomeLoja}
        >
          {nomeLoja}
        </span>
        <span className="text-[10px] font-mono" style={{ color: 'var(--sidebar-ink-3)' }}>
          v{versao}
        </span>
      </div>
    </aside>
  )
}

function GrupoSidebar({ grupo, pathname }: { grupo: Grupo; pathname: string }) {
  const headingId = useId()
  if (grupo.itens.length === 0) return null

  return (
    <section aria-labelledby={headingId} className="flex flex-col">
      <div
        id={headingId}
        className="text-[10px] uppercase font-semibold px-2 pb-2"
        style={{ color: 'var(--sidebar-ink-3)', letterSpacing: '0.14em' }}
      >
        {grupo.label}
      </div>
      <ul className="flex flex-col gap-0.5 list-none p-0 m-0">
        {grupo.itens.map((item) => (
          <li key={item.id} className="list-none">
            {item.subitems ? (
              <NavExpansivel item={item} pathname={pathname} />
            ) : (
              <NavLink item={item} pathname={pathname} />
            )}
          </li>
        ))}
        {grupo.label === 'CONTA' && (
          <li className="list-none">
            <BotaoSair />
          </li>
        )}
      </ul>
    </section>
  )
}

function NavLink({ item, pathname }: { item: ItemMenu; pathname: string }) {
  const ativo = item.href ? rotaAtiva(pathname, item.href) : false
  const Icon = item.icon

  return (
    <Link
      href={item.href ?? '#'}
      aria-current={ativo ? 'page' : undefined}
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13px] transition-all"
      style={{
        background: ativo ? 'var(--brick)' : 'transparent',
        color: ativo ? 'var(--brick-ink)' : COR_REPOUSO,
        fontWeight: ativo ? 700 : 500,
      }}
      {...hoverHandlers(ativo)}
    >
      <Icon className="w-4 h-4" strokeWidth={1.75} />
      <span className="flex-1">{item.label}</span>
      {typeof item.badge === 'number' && item.badge > 0 && (
        <span
          className="px-1.5 py-px rounded-full text-[10px] font-bold"
          style={{
            background: ativo ? 'var(--ink)' : 'var(--brick)',
            color: ativo ? 'var(--brick)' : 'var(--brick-ink)',
          }}
        >
          {item.badge}
        </span>
      )}
    </Link>
  )
}

function NavExpansivel({ item, pathname }: { item: ItemMenu; pathname: string }) {
  const subitems = item.subitems ?? []
  const algumSubAtivo = subitems.some((s) => rotaAtiva(pathname, s.href))
  const storageKey = `sidebar:group:${item.id}`
  const [aberto, setAberto] = useState<boolean>(algumSubAtivo)

  useEffect(() => {
    try {
      const salvo = window.localStorage.getItem(storageKey)
      if (salvo === '1' || salvo === '0') setAberto(salvo === '1' || algumSubAtivo)
      else setAberto(algumSubAtivo)
    } catch {
      setAberto(algumSubAtivo)
    }
  }, [storageKey, algumSubAtivo])

  function alternar() {
    setAberto((prev) => {
      const proximo = !prev
      try {
        window.localStorage.setItem(storageKey, proximo ? '1' : '0')
      } catch {}
      return proximo
    })
  }

  const Icon = item.icon
  const corBotao = algumSubAtivo ? COR_HOVER : COR_REPOUSO
  const painelId = `${item.id}-painel`

  return (
    <div>
      <button
        type="button"
        onClick={alternar}
        aria-expanded={aberto}
        aria-controls={painelId}
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13px] transition-all w-full"
        style={{
          background: 'transparent',
          color: corBotao,
          fontWeight: algumSubAtivo ? 700 : 500,
        }}
        {...hoverHandlers(false, corBotao)}
      >
        <Icon className="w-4 h-4" strokeWidth={1.75} />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown
          className="w-3.5 h-3.5 transition-transform"
          style={{ transform: aberto ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          strokeWidth={2}
        />
      </button>
      {aberto && (
        <ul id={painelId} className="flex flex-col gap-0.5 mt-0.5 ml-7 list-none p-0">
          {subitems.map((sub) => {
            const subAtivo = rotaAtiva(pathname, sub.href)
            return (
              <li key={sub.href} className="list-none">
                <Link
                  href={sub.href}
                  aria-current={subAtivo ? 'page' : undefined}
                  className="flex items-center px-3 py-1.5 rounded-[8px] text-[12.5px] transition-all"
                  style={{
                    color: subAtivo ? 'var(--brick)' : COR_REPOUSO,
                    fontWeight: subAtivo ? 700 : 500,
                    background: 'transparent',
                  }}
                  {...hoverHandlers(subAtivo)}
                >
                  {sub.label}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function BotaoSair() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13px] font-medium w-full transition-all"
        style={{ color: 'var(--sidebar-ink-3)', background: 'transparent' }}
        {...hoverHandlers(false, 'var(--sidebar-ink-3)')}
      >
        <LogOut className="w-4 h-4" strokeWidth={1.75} />
        Sair da conta
      </button>
    </form>
  )
}
