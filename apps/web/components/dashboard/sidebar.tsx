'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useState } from 'react'
import { relogioDaLoja, statusAbertura, type DashboardTemplate } from '@mallevo/lib'
import { logout } from '@/lib/actions/auth'
import { cx } from '@/lib/cx'
import { urlDaLoja } from '@/lib/storefront-url'
import { PartnerIcon, type PartnerIconName } from '@/components/ui/partner-icon'
import { useRealtimeCount } from './hooks/use-realtime-count'
import { useAgora } from './hooks/use-agora'
import { ThemeToggle } from './theme-toggle'

/**
 * A sidebar é a portaria do balcão, vestida da marquise: transparente sobre a
 * moldura escura (o neon da moldura passa por trás), o logo da casa, a loja
 * ativa com o status de abertura AO VIVO, e o diretório dos módulos.
 *
 * Item ativo = vidro mais forte + ícone accent (a tab bar do app: "ícone
 * ativo accent, inativo apagado"). O lima não vira pílula chapada: é caro.
 */

type GrupoLabel = 'Operar' | 'Analisar' | 'Minha loja' | 'Conta'
type SubItem = { href: string; label: string }
type ItemMenu = {
  id: string
  label: string
  icon: PartnerIconName
  href?: string
  badge?: number
  subitems?: SubItem[]
}
type Grupo = { label: GrupoLabel; itens: ItemMenu[] }

function buildGrupos(template: DashboardTemplate, pedidosNovosCount: number): Grupo[] {
  const operar: ItemMenu[] = [{ id: 'inicio', href: '/', label: 'Início', icon: 'home' }]

  if (template.modulos.pedidos) {
    operar.push({
      id: 'pedidos',
      href: '/pedidos',
      label: 'Pedidos',
      icon: 'orders',
      badge: pedidosNovosCount,
    })
  }

  if (template.modulos.produtos) {
    const subitems: SubItem[] = [
      { href: '/produtos', label: template.produto.labels.produtoPlural },
      { href: '/categorias', label: 'Categorias' },
    ]
    if (template.modulos.estoque) subitems.push({ href: '/estoque', label: 'Estoque' })
    operar.push({ id: 'catalogo', label: 'Catálogo', icon: 'package', subitems })
  }

  if (template.modulos.entregadores) {
    operar.push({ id: 'entregadores', href: '/entregadores', label: 'Entregadores', icon: 'bike' })
  }
  if (template.modulos.agenda) {
    operar.push({ id: 'agenda', href: '/agenda', label: 'Agenda', icon: 'calendar' })
  }
  operar.push(
    { id: 'mensagens', href: '/mensagens', label: 'Mensagens', icon: 'chat' },
    { id: 'avaliacoes', href: '/avaliacoes', label: 'Avaliações', icon: 'star' },
    { id: 'conteudo', href: '/conteudo', label: 'Conteúdo', icon: 'gallery' },
  )

  const analisar: ItemMenu[] = []
  if (template.modulos.financeiro) {
    analisar.push({ id: 'financeiro', href: '/financeiro', label: 'Financeiro', icon: 'wallet' })
  }
  if (template.modulos.relatorios) {
    analisar.push({ id: 'relatorios', href: '/relatorios', label: 'Relatórios', icon: 'chart' })
  }

  const minhaLoja: ItemMenu[] = [
    { id: 'vitrine', href: '/minha-loja', label: 'Vitrine', icon: 'store' },
    { id: 'configuracoes', href: '/configuracoes', label: 'Configurações', icon: 'gear' },
    { id: 'tipo-de-loja', href: '/configuracoes/tipo-de-loja', label: 'Tipo de loja', icon: 'tag' },
  ]
  if (template.modulos.agenda) {
    minhaLoja.push({ id: 'staff', href: '/configuracoes/staff', label: 'Profissionais', icon: 'users' })
  }

  const conta: ItemMenu[] = [
    { id: 'minha-conta', href: '/minha-conta', label: 'Minha conta', icon: 'user' },
    { id: 'ajuda', href: '/ajuda', label: 'Central de ajuda', icon: 'help' },
  ]

  return [
    { label: 'Operar', itens: operar },
    { label: 'Analisar', itens: analisar },
    { label: 'Minha loja', itens: minhaLoja },
    { label: 'Conta', itens: conta },
  ]
}

function rotaAtiva(pathname: string, href: string) {
  if (href === '/configuracoes') return pathname === href
  return pathname === href || (href !== '/' && pathname.startsWith(href + '/'))
}

interface Props {
  nomeLoja: string
  slugLoja: string | null
  logoLoja: string | null
  /** `stores.horarios` cru — o status de abertura é calculado aqui, ao vivo. */
  horarios: unknown
  /** `stores.ativo`: false = loja pausada pelo lojista. */
  lojaAtiva: boolean
  template: DashboardTemplate
  pedidosNovosInicial: number
  tenantId: string
}

export function SidebarDashboard({
  nomeLoja,
  slugLoja,
  logoLoja,
  horarios,
  lojaAtiva,
  template,
  pedidosNovosInicial,
  tenantId,
}: Props) {
  const pathname = usePathname()
  const [aberto, setAberto] = useState(false)
  const pedidosNovosCount = useRealtimeCount({
    table: 'orders',
    filtroEq: { tenant_id: tenantId, status: 'novo' },
    inicial: pedidosNovosInicial,
  })
  const grupos = buildGrupos(template, pedidosNovosCount)
  const versao = process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev'

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
          <Link href="/" aria-label="Mallevo — Início" className="block h-[22px] w-[139px]">
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

        <CartaoLoja
          nome={nomeLoja}
          slug={slugLoja}
          logo={logoLoja}
          horarios={horarios}
          ativa={lojaAtiva}
        />

        <BotaoBuscar />

        <nav
          aria-label="Navegação principal"
          className="relative -mr-2 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-6 pr-2 [mask-image:linear-gradient(to_bottom,black_calc(100%-36px),transparent)]"
        >
          {grupos.map((grupo) => (
            <GrupoSidebar key={grupo.label} grupo={grupo} pathname={pathname} />
          ))}
        </nav>

        <Portaria versao={versao} />
      </aside>
    </>
  )
}

/** A loja ativa: tijolo, nome, endereço público e o status de abertura. */
function CartaoLoja({
  nome,
  slug,
  logo,
  horarios,
  ativa,
}: {
  nome: string
  slug: string | null
  logo: string | null
  horarios: unknown
  ativa: boolean
}) {
  const agora = useAgora(30_000)
  const status = agora
    ? ativa
      ? statusAbertura(horarios, relogioDaLoja(agora))
      : { aberta: false, texto: 'Loja pausada' }
    : undefined
  const iniciais = nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

  return (
    <div className="relative mb-3 rounded-[18px] bg-[color:var(--m-glass)] p-3 ring-1 ring-inset ring-[color:var(--m-line)]">
      <div className="flex items-center gap-3">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="size-10 shrink-0 rounded-[12px] bg-white object-cover" />
        ) : (
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-[12px] text-[14px] font-extrabold tracking-[-0.02em]"
            style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
          >
            {iniciais || 'M'}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold leading-tight tracking-[-0.01em] text-white" title={nome}>
            {nome}
          </p>
          {status === undefined ? (
            <p className="mt-1 h-[15px]" aria-hidden />
          ) : status === null ? (
            <Link
              href="/configuracoes?aba=horarios"
              className="mt-1 block text-[12px] font-medium text-[color:var(--m-ink-2)] underline-offset-2 hover:text-white hover:underline"
            >
              Definir horários
            </Link>
          ) : (
            <p className="mt-1 flex items-center gap-1.5 text-[12px] font-medium text-[color:var(--m-ink-2)]">
              <span
                aria-hidden
                className={cx('size-[7px] shrink-0 rounded-full', status.aberta && 'pulso')}
                style={{
                  background: status.aberta
                    ? 'var(--ok-vivo)'
                    : ativa
                      ? 'rgba(255,255,255,0.35)'
                      : 'var(--warn-vivo)',
                }}
              />
              {status.texto}
            </p>
          )}
        </div>
      </div>
      {slug && (
        <a
          href={urlDaLoja(slug)}
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-3 flex items-center justify-between gap-2 rounded-[11px] bg-[color:rgba(0,0,0,0.22)] px-2.5 py-2 text-[11.5px] text-[color:var(--m-ink-2)] transition-colors hover:text-white"
        >
          <span className="truncate font-mono">
            <span className="text-white">{slug}</span>.mallevo.com.br
          </span>
          <PartnerIcon
            name="external"
            size={13}
            strokeWidth={2}
            className="shrink-0 opacity-70 transition-opacity group-hover:opacity-100"
          />
        </a>
      )}
    </div>
  )
}

function GrupoSidebar({ grupo, pathname }: { grupo: Grupo; pathname: string }) {
  const headingId = useId()
  if (grupo.itens.length === 0) return null

  return (
    <section aria-labelledby={headingId} className="flex flex-col">
      <p id={headingId} className="micro px-3 pb-2 text-[color:var(--sidebar-ink-3)]">
        {grupo.label}
      </p>
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
        {grupo.itens.map((item) => (
          <li key={item.id} className="list-none">
            {item.subitems ? (
              <NavExpansivel item={item} pathname={pathname} />
            ) : (
              <NavLink item={item} pathname={pathname} />
            )}
          </li>
        ))}
        {grupo.label === 'Conta' && (
          <li className="list-none">
            <BotaoSair />
          </li>
        )}
      </ul>
    </section>
  )
}

const CLASSE_ITEM =
  'group flex h-9 w-full items-center gap-3 rounded-[12px] px-3 text-[13.5px] transition-colors duration-200'

function NavLink({ item, pathname }: { item: ItemMenu; pathname: string }) {
  const ativo = item.href ? rotaAtiva(pathname, item.href) : false

  return (
    <Link
      href={item.href ?? '#'}
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
          aria-label={`${item.badge} ${item.badge === 1 ? 'pedido novo' : 'pedidos novos'}`}
        >
          {item.badge > 99 ? '99+' : item.badge}
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

  const painelId = `${item.id}-painel`

  return (
    <div>
      <button
        type="button"
        onClick={alternar}
        aria-expanded={aberto}
        aria-controls={painelId}
        className={cx(
          CLASSE_ITEM,
          algumSubAtivo
            ? 'font-semibold text-white hover:bg-[color:var(--m-glass)]'
            : 'font-medium text-[color:var(--sidebar-ink-2)] hover:bg-[color:var(--m-glass)] hover:text-white',
        )}
      >
        <PartnerIcon
          name={item.icon}
          size={18}
          strokeWidth={algumSubAtivo ? 2.1 : 1.8}
          className={algumSubAtivo ? 'text-[color:var(--brick)]' : undefined}
        />
        <span className="flex-1 truncate text-left">{item.label}</span>
        <PartnerIcon
          name="chevron-down"
          size={15}
          strokeWidth={2}
          className={cx('opacity-60 transition-transform duration-300 ease-entrada', !aberto && '-rotate-90')}
        />
      </button>
      {aberto && (
        <ul
          id={painelId}
          className="m-0 ml-[21px] mt-0.5 flex list-none flex-col gap-0.5 border-l border-[color:var(--sidebar-line)] py-0.5 pl-3"
        >
          {subitems.map((sub) => {
            const subAtivo = rotaAtiva(pathname, sub.href)
            return (
              <li key={sub.href} className="list-none">
                <Link
                  href={sub.href}
                  aria-current={subAtivo ? 'page' : undefined}
                  className={cx(
                    'flex h-8 items-center gap-2 rounded-[10px] px-2.5 text-[13px] transition-colors duration-200',
                    subAtivo
                      ? 'bg-[color:var(--m-glass-2)] font-semibold text-white'
                      : 'font-medium text-[color:var(--sidebar-ink-2)] hover:bg-[color:var(--m-glass)] hover:text-white',
                  )}
                >
                  {subAtivo && (
                    <span aria-hidden className="size-1.5 rounded-full" style={{ background: 'var(--brick)' }} />
                  )}
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
      <span className="flex-1 text-left">Buscar no painel</span>
      <kbd className="rounded-full bg-[color:rgba(0,0,0,0.3)] px-2 py-0.5 font-mono text-[10.5px] text-[color:var(--sidebar-ink-2)]">
        {atalho}
      </kbd>
    </button>
  )
}

function BotaoSair() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className={cx(
          CLASSE_ITEM,
          'font-medium text-[color:var(--sidebar-ink-3)] hover:bg-[color:var(--m-glass)] hover:text-white',
        )}
      >
        <PartnerIcon name="logout" size={18} strokeWidth={1.8} />
        Sair da conta
      </button>
    </form>
  )
}

/** Rodapé: a cidade e a hora dela (a portaria da landing), tema e versão. */
function Portaria({ versao }: { versao: string }) {
  const agora = useAgora(15_000)
  const relogio = agora ? relogioDaLoja(agora) : null
  const hora = relogio
    ? `${String(relogio.getHours()).padStart(2, '0')}:${String(relogio.getMinutes()).padStart(2, '0')}`
    : '--:--'

  return (
    <div className="relative mt-3 flex items-center justify-between gap-2 border-t border-[color:var(--sidebar-line)] px-2 pt-3.5">
      <p
        className="flex min-w-0 items-center gap-2 text-[12px] font-semibold text-[color:var(--sidebar-ink-2)]"
        title={`Versão ${versao}`}
      >
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
