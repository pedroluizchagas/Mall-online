'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/lib/actions/auth'

/* ── Ícones ─────────────────────────────────────────────────────────────── */
function IconPedidos() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
      <path d="M3 6h18"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  )
}

function IconProdutos() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.29 7 12 12 20.71 7"/>
      <line x1="12" x2="12" y1="22" y2="12"/>
    </svg>
  )
}

function IconCategorias() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="7" x="3" y="3" rx="1"/>
      <rect width="7" height="7" x="14" y="3" rx="1"/>
      <rect width="7" height="7" x="3" y="14" rx="1"/>
      <rect width="7" height="7" x="14" y="14" rx="1"/>
    </svg>
  )
}

function IconFinanceiro() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="2" y2="22"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  )
}

function IconConfiguracoes() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function IconSair() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" x2="9" y1="12" y2="12"/>
    </svg>
  )
}

function IconSearch() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}

/* ── Grupos de navegação ─────────────────────────────────────────────────── */
const navGroups = [
  {
    label: 'Menu Principal',
    items: [
      { href: '/pedidos',    label: 'Pedidos',    icon: IconPedidos },
      { href: '/produtos',   label: 'Produtos',   icon: IconProdutos },
      { href: '/categorias', label: 'Categorias', icon: IconCategorias },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { href: '/financeiro',    label: 'Financeiro',    icon: IconFinanceiro },
      { href: '/configuracoes', label: 'Configurações', icon: IconConfiguracoes },
    ],
  },
]

/* ── Botão sair ─────────────────────────────────────────────────────────── */
function BotaoSair() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[#555] hover:text-[#888] transition-colors duration-150 text-[12px] font-medium"
      >
        <IconSair />
        Sair
      </button>
    </form>
  )
}

/* ── Componente principal ───────────────────────────────────────────────── */
export function Sidebar({ nomeLoja }: { nomeLoja?: string | null }) {
  const pathname = usePathname()

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside
      className="flex flex-col h-screen sidebar-scroll overflow-y-auto flex-shrink-0"
      style={{ width: 210, minWidth: 210, background: '#151515' }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 16px 16px' }}>
        <div style={{
          width: 28, height: 28,
          background: '#4CAF82',
          borderRadius: 7,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <span style={{ color: '#fff', fontWeight: 600, fontSize: 15, flex: 1 }}>Mallora</span>
      </div>

      {/* Barra de pesquisa */}
      <div style={{
        margin: '0 12px 4px',
        background: '#1f1f1f',
        borderRadius: 8,
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '8px 10px',
      }}>
        <IconSearch />
        <input
          type="text"
          placeholder="Pesquise aqui..."
          style={{
            background: 'none', border: 'none', outline: 'none',
            color: '#666', fontSize: 11.5, width: '100%',
            fontFamily: 'inherit',
          }}
        />
        <span style={{
          background: '#2a2a2a', color: '#555', fontSize: 9,
          padding: '2px 5px', borderRadius: 4, whiteSpace: 'nowrap',
        }}>⌘K</span>
      </div>

      {/* Navegação por grupos */}
      {navGroups.map((group) => (
        <div key={group.label}>
          {/* Label da seção */}
          <div style={{
            fontSize: 8.5, fontWeight: 600,
            letterSpacing: '0.09em', color: '#383838',
            textTransform: 'uppercase',
            padding: '14px 16px 5px',
          }}>
            {group.label}
          </div>

          {/* Itens */}
          {group.items.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                className={`sidebar-nav-link${active ? ' active' : ''}`}
              >
                <Icon />
                {label}
                <span className="sidebar-active-bar" />
              </Link>
            )
          })}
        </div>
      ))}

      {/* Rodapé: loja + sair */}
      <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #1e1e1e' }}>
        {nomeLoja && (
          <div style={{
            margin: '10px 12px 4px',
            background: '#1c1c1c',
            borderRadius: 11,
            padding: '11px 13px',
          }}>
            <div style={{ color: '#3a3a3a', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>
              Sua loja
            </div>
            <div style={{ fontWeight: 600, fontSize: 12, color: '#ddd' }}>
              {nomeLoja}
            </div>
          </div>
        )}

        <BotaoSair />
      </div>
    </aside>
  )
}
