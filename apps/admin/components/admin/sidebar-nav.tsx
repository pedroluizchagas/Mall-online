'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useState } from 'react'
import { relogioDaLoja, statusAbertura } from '@mallevo/lib'
import { logoutAdmin } from '@/lib/actions/auth'
import { cx } from '@/lib/cx'
import { iniciais } from '@/lib/format'
import { PartnerIcon, type PartnerIconName } from '@/components/ui/partner-icon'
import { useAgora } from './hooks/use-agora'
import { ThemeToggle } from './theme-toggle'

/**
 * A sidebar é a portaria dos bastidores, vestida da marquise: transparente
 * sobre a moldura escura (o neon passa por trás), o logo da casa, o shopping
 * com quantas lojas estão abertas AGORA, e o diretório dos módulos.
 *
 * Item ativo = vidro mais forte + ícone accent (a tab bar do app). Os
 * contadores em lima são o que pede a administração — lima é caro.
 */

type ItemMenu = { href: string; label: string; icon: PartnerIconName; badge?: number; badgeRotulo?: string }
type Grupo = { label: string; itens: ItemMenu[] }

function rotaAtiva(pathname: string, href: string) {
  if (href === '/admin') return pathname === href
  return pathname === href || pathname.startsWith(href + '/')
}

interface Props {
  nome: string
  email: string
  /** `stores.horarios` das lojas ativas — a contagem de abertas é calculada aqui, ao vivo. */
  horariosDasLojas: unknown[]
  entregadoresPendentes: number
  lojasEmOutros: number
}

export function SidebarNav({ nome, email, horariosDasLojas, entregadoresPendentes, lojasEmOutros }: Props) {
  const pathname = usePathname()
  const [aberto, setAberto] = useState(false)

  const grupos: Grupo[] = [
    {
      label: 'Operar',
      itens: [
        { href: '/admin', label: 'Visão geral', icon: 'home' },
        { href: '/admin/lojistas', label: 'Lojistas', icon: 'store' },
        {
          href: '/admin/entregadores',
          label: 'Entregadores',
          icon: 'bike',
          badge: entregadoresPendentes,
          badgeRotulo: entregadoresPendentes === 1 ? 'entregador aguardando aprovação' : 'entregadores aguardando aprovação',
        },
      ],
    },
    {
      label: 'Diretório',
      itens: [
        {
          href: '/admin/lojas-outros',
          label: 'Lojas em “Outros”',
          icon: 'inbox',
          badge: lojasEmOutros,
          badgeRotulo: lojasEmOutros === 1 ? 'loja sem nicho' : 'lojas sem nicho',
        },
        { href: '/admin/adocao-templates', label: 'Adoção de templates', icon: 'chart' },
      ],
    },
    {
      label: 'Financeiro',
      itens: [
        { href: '/admin/financeiro', label: 'Conciliação', icon: 'wallet' },
        { href: '/admin/planos', label: 'Planos', icon: 'tag' },
      ],
    },
  ]

  // Drawer mobile: a barra do topo dispara `mallevo:menu`; fecha ao navegar,
  // no Esc e no véu. Em `md+` a aside é fixa e o estado é irrelevante.
  useEffect(() => {
    function onAbrir() {
      setAberto(true)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberto(false)
    }
    window.addEventListener('mallevo:menu', onAbrir)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mallevo:menu', onAbrir)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(() => {
    setAberto(false)
  }, [pathname])

  useEffect(() => {
    if (!aberto) return
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = anterior
    }
  }, [aberto])

  return (
    <>
      {aberto && (
        <div
          className="fixed inset-0 z-40 bg-[rgba(9,9,11,0.6)] backdrop-blur-[2px] md:hidden"
          onClick={() => setAberto(false)}
          aria-hidden
        />
      )}

      <aside
        className={cx(
          'sobre-escuro fixed inset-y-0 left-0 z-50 flex w-[264px] shrink-0 flex-col bg-marquee px-3.5 pb-4 pt-5 text-[color:var(--sidebar-ink)] transition-transform duration-500 ease-entrada',
          'md:sticky md:top-0 md:z-auto md:h-[100dvh] md:w-[248px] md:translate-x-0 md:bg-transparent',
          aberto ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* No drawer o neon vem junto (no desktop ele vem da moldura). */}
        <div aria-hidden className="glow-marquise pointer-events-none absolute inset-0 md:hidden" />

        <div className="relative flex items-center justify-between px-2 pb-5">
          <Link href="/admin" aria-label="Mallevo — Visão geral" className="block h-[22px] w-[139px]">
            <Image
              src="/brand/mallevo-logo-white.png"
              alt="Mallevo"
              width={669}
              height={106}
              priority
              unoptimized
              className="h-full w-auto"
            />
          </Link>
          <button
            type="button"
            onClick={() => setAberto(false)}
            aria-label="Fechar menu"
            className="-mr-1 flex size-9 items-center justify-center rounded-full bg-[color:var(--m-glass)] text-white md:hidden"
          >
            <PartnerIcon name="close" size={18} strokeWidth={2} />
          </button>
        </div>

        <CartaoShopping horariosDasLojas={horariosDasLojas} />

        <BotaoBuscar />

        <nav
          aria-label="Navegação principal"
          className="relative -mr-2 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-6 pr-2 [mask-image:linear-gradient(to_bottom,black_calc(100%-36px),transparent)]"
        >
          {grupos.map((grupo) => (
            <GrupoSidebar key={grupo.label} grupo={grupo} pathname={pathname} />
          ))}
        </nav>

        <Conta nome={nome} email={email} />
        <Portaria />
      </aside>
    </>
  )
}

/**
 * O shopping que a administração cuida: a marca e quantas lojas estão
 * abertas agora pelo horário que cada lojista cadastrou (o mesmo cálculo do
 * letreiro do app). Loja sem horário não conta como aberta — não inventamos.
 */
function CartaoShopping({ horariosDasLojas }: { horariosDasLojas: unknown[] }) {
  const agora = useAgora(30_000)
  const total = horariosDasLojas.length
  const abertas = agora
    ? horariosDasLojas.filter((h) => statusAbertura(h, relogioDaLoja(agora))?.aberta).length
    : null

  return (
    <div className="relative mb-3 flex items-center gap-3 rounded-[18px] bg-[color:var(--m-glass)] p-3 ring-1 ring-inset ring-[color:var(--m-line)]">
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[color:rgba(0,0,0,0.28)]">
        <Image src="/brand/mallevo-icon.png" alt="" width={529} height={244} unoptimized className="h-auto w-[26px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold leading-tight tracking-[-0.01em] text-white">Administração</p>
        {abertas === null ? (
          <p className="mt-1 h-[15px]" aria-hidden />
        ) : (
          <p className="mt-1 flex items-center gap-1.5 text-[12px] font-medium text-[color:var(--m-ink-2)]">
            <span
              aria-hidden
              className={cx('size-[7px] shrink-0 rounded-full', abertas > 0 && 'pulso')}
              style={{ background: abertas > 0 ? 'var(--ok-vivo)' : 'rgba(255,255,255,0.35)' }}
            />
            {total === 0
              ? 'Nenhuma loja no ar'
              : abertas === 0
                ? 'Todas as lojas fechadas'
                : `${abertas} de ${total} ${total === 1 ? 'loja aberta' : 'lojas abertas'}`}
          </p>
        )}
      </div>
    </div>
  )
}

function GrupoSidebar({ grupo, pathname }: { grupo: Grupo; pathname: string }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="flex flex-col">
      <p id={headingId} className="micro px-3 pb-2 text-[color:var(--sidebar-ink-3)]">
        {grupo.label}
      </p>
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
        {grupo.itens.map((item) => (
          <li key={item.href} className="list-none">
            <NavLink item={item} pathname={pathname} />
          </li>
        ))}
      </ul>
    </section>
  )
}

const CLASSE_ITEM =
  'group flex h-9 w-full items-center gap-3 rounded-[12px] px-3 text-[13.5px] transition-colors duration-200'

function NavLink({ item, pathname }: { item: ItemMenu; pathname: string }) {
  const ativo = rotaAtiva(pathname, item.href)

  return (
    <Link
      href={item.href}
      aria-current={ativo ? 'page' : undefined}
      className={cx(
        CLASSE_ITEM,
        ativo
          ? 'bg-[color:var(--m-glass-2)] font-semibold text-white'
          : 'font-medium text-[color:var(--sidebar-ink-2)] hover:bg-[color:var(--m-glass)] hover:text-white',
      )}
    >
      <PartnerIcon
        name={item.icon}
        size={18}
        strokeWidth={ativo ? 2.1 : 1.8}
        className={ativo ? 'text-[color:var(--brick)]' : undefined}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {typeof item.badge === 'number' && item.badge > 0 && (
        <span
          className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums"
          style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
          aria-label={`${item.badge} ${item.badgeRotulo ?? ''}`.trim()}
        >
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      )}
    </Link>
  )
}

function BotaoBuscar() {
  const [atalho, setAtalho] = useState('Ctrl K')
  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setAtalho('⌘ K')
  }, [])
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('mallevo:cmdk'))}
      className="relative mb-5 flex h-10 w-full items-center gap-2.5 rounded-full bg-[color:var(--m-glass)] pl-3.5 pr-2 text-[13px] text-[color:var(--sidebar-ink-2)] ring-1 ring-inset ring-[color:var(--m-line)] transition-colors duration-200 hover:bg-[color:var(--m-glass-2)] hover:text-white"
    >
      <PartnerIcon name="search" size={16} strokeWidth={2} />
      <span className="flex-1 truncate text-left">Buscar no painel</span>
      <kbd className="rounded-full bg-[color:rgba(0,0,0,0.3)] px-2 py-0.5 font-mono text-[10.5px] text-[color:var(--sidebar-ink-2)]">
        {atalho}
      </kbd>
    </button>
  )
}

/** Quem está nos bastidores e a porta de saída. */
function Conta({ nome, email }: { nome: string; email: string }) {
  return (
    <div className="relative mt-1 flex items-center gap-3 rounded-[14px] px-2 py-2">
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--m-glass-2)] text-[12px] font-bold text-white"
      >
        {iniciais(nome) || 'A'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold leading-tight text-white" title={nome}>
          {nome}
        </p>
        <p className="mt-0.5 truncate text-[11.5px] text-[color:var(--sidebar-ink-3)]" title={email}>
          {email}
        </p>
      </div>
      <form action={logoutAdmin}>
        <button
          type="submit"
          aria-label="Sair da conta"
          title="Sair da conta"
          className="flex size-8 items-center justify-center rounded-full text-[color:var(--sidebar-ink-2)] transition-colors duration-200 hover:bg-[color:var(--m-glass-2)] hover:text-white"
        >
          <PartnerIcon name="logout" size={16} strokeWidth={1.9} />
        </button>
      </form>
    </div>
  )
}

/** Rodapé: a cidade e a hora dela (a portaria da landing) e o tema. */
function Portaria() {
  const agora = useAgora(15_000)
  const relogio = agora ? relogioDaLoja(agora) : null
  const hora = relogio
    ? `${String(relogio.getHours()).padStart(2, '0')}:${String(relogio.getMinutes()).padStart(2, '0')}`
    : '--:--'

  return (
    <div className="relative mt-2 flex items-center justify-between gap-2 border-t border-[color:var(--sidebar-line)] px-2 pt-3.5">
      <p className="flex min-w-0 items-center gap-2 text-[12px] font-semibold text-[color:var(--sidebar-ink-2)]">
        <PartnerIcon name="pin" size={14} strokeWidth={2.2} className="shrink-0 text-[color:var(--brick)]" />
        <span className="truncate">Divinópolis</span>
        <span className="font-mono tabular-nums text-white" suppressHydrationWarning>
          {hora}
        </span>
      </p>
      <ThemeToggle />
    </div>
  )
}
