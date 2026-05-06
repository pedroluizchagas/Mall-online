'use client'

import { useState, useEffect } from 'react'
import { Smartphone, Globe, Check, Package, Clock, Store } from 'lucide-react'
import Link from 'next/link'

type Template = {
  id: string
  nome: string
  tag: string
  acento: string
  acentoDk: string
  acentoInk: string
  bgTela: string
  bgHeader: string
  bgCard: string
  textoPrimario: string
  textoSecundario: string
  linha: string
}

const TEMPLATES: Template[] = [
  {
    id: 'verde-minas',
    nome: 'Verde Minas',
    tag: 'Padrão',
    acento: '#c1f148',
    acentoDk: '#a3d22a',
    acentoInk: '#18181b',
    bgTela: '#f6f6f3',
    bgHeader: '#a3d22a',
    bgCard: '#ffffff',
    textoPrimario: '#0f0f0d',
    textoSecundario: '#8a8a84',
    linha: '#ececea',
  },
  {
    id: 'noite',
    nome: 'Noite',
    tag: 'Dark',
    acento: '#c1f148',
    acentoDk: '#9fd41f',
    acentoInk: '#18181b',
    bgTela: '#111110',
    bgHeader: '#1a1a18',
    bgCard: '#1f1f1d',
    textoPrimario: '#f5f5f0',
    textoSecundario: '#6a6a64',
    linha: '#2a2a28',
  },
  {
    id: 'clean',
    nome: 'Clean',
    tag: 'Minimalista',
    acento: '#0f0f0d',
    acentoDk: '#18181b',
    acentoInk: '#ffffff',
    bgTela: '#ffffff',
    bgHeader: '#f0f0ed',
    bgCard: '#f6f6f3',
    textoPrimario: '#0f0f0d',
    textoSecundario: '#8a8a84',
    linha: '#ececea',
  },
  {
    id: 'ambar',
    nome: 'Âmbar',
    tag: 'Quente',
    acento: '#f2c94c',
    acentoDk: '#c8991a',
    acentoInk: '#18181b',
    bgTela: '#fffbf0',
    bgHeader: '#f5e0a0',
    bgCard: '#ffffff',
    textoPrimario: '#1a1209',
    textoSecundario: '#8a7850',
    linha: '#e8e0c8',
  },
]

function fmt(centavos: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100)
}

export interface LojaPreview {
  nome: string
  logo_url: string | null
  banner_url: string | null
  descricao: string | null
  tempo_entrega: number | null
  taxa_entrega: number
  aceita_pix: boolean
  aceita_cartao_online: boolean
  slug: string | null
}

export interface ProdutoPreview {
  id: string
  nome: string
  foto_url: string | null
  preco: number
}

interface Props {
  loja: LojaPreview
  produtos: ProdutoPreview[]
}

type View = 'app' | 'web'

export function PreviewLoja({ loja, produtos }: Props) {
  const [view, setView] = useState<View>('app')
  const [templateId, setTemplateId] = useState('verde-minas')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const t = localStorage.getItem('mallevo-loja-template')
    if (t && TEMPLATES.find((x) => x.id === t)) setTemplateId(t)
  }, [])

  const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0]

  function handleSave() {
    localStorage.setItem('mallevo-loja-template', templateId)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_236px] gap-8 items-start">
      {/* Phone preview */}
      <div className="flex flex-col items-center gap-6">
        {/* View toggle */}
        <div
          className="inline-flex items-center p-1 rounded-2xl"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', gap: 2 }}
        >
          <ToggleBtn active={view === 'app'} onClick={() => setView('app')}>
            <Smartphone className="w-3.5 h-3.5" />
            App Mallevo
          </ToggleBtn>
          <ToggleBtn active={view === 'web'} onClick={() => setView('web')}>
            <Globe className="w-3.5 h-3.5" />
            E-commerce Web
          </ToggleBtn>
        </div>

        {/* Phone mockup */}
        <PhoneFrame>
          {view === 'app' ? (
            <AppScreen loja={loja} produtos={produtos} template={template} />
          ) : (
            <WebScreen loja={loja} produtos={produtos} template={template} />
          )}
        </PhoneFrame>

        <p className="text-[11px] text-ink-3 text-center">
          Visualização aproximada · conteúdo real pode variar
        </p>
      </div>

      {/* Sidebar: themes + quick links */}
      <div className="space-y-5 pt-1">
        <div>
          <p
            className="text-[10px] uppercase font-semibold mb-3"
            style={{ color: 'var(--ink-3)', letterSpacing: '0.14em' }}
          >
            Tema da loja
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplateId(t.id)}
                className="relative rounded-xl overflow-hidden text-left transition-all"
                style={{
                  border: `2px solid ${templateId === t.id ? 'var(--brick-dk)' : 'var(--line)'}`,
                  transform: templateId === t.id ? 'scale(1.03)' : 'scale(1)',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                }}
              >
                <div
                  style={{
                    height: 44,
                    background: `linear-gradient(135deg, ${t.bgHeader} 0%, ${t.acento} 100%)`,
                  }}
                />
                <div className="px-2.5 py-2" style={{ background: t.bgTela }}>
                  <div className="text-[10px] font-bold truncate" style={{ color: t.textoPrimario }}>
                    {t.nome}
                  </div>
                  <div className="text-[9px]" style={{ color: t.textoSecundario }}>
                    {t.tag}
                  </div>
                </div>
                {templateId === t.id && (
                  <div
                    className="absolute top-2 right-2 flex items-center justify-center rounded-full"
                    style={{
                      width: 18,
                      height: 18,
                      background: 'var(--brick-dk)',
                    }}
                  >
                    <Check style={{ width: 10, height: 10, color: '#fff' }} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
          style={{
            background: saved ? 'var(--ok)' : 'var(--brick)',
            color: saved ? '#fff' : 'var(--brick-ink)',
          }}
        >
          {saved ? '✓ Tema aplicado!' : 'Aplicar tema'}
        </button>

        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
        >
          <p
            className="text-[10px] uppercase font-semibold"
            style={{ color: 'var(--ink-3)', letterSpacing: '0.14em' }}
          >
            Editar conteúdo
          </p>
          {[
            { label: 'Banner e logo', href: '/configuracoes/loja', Icon: Store },
            { label: 'Horários e entrega', href: '/configuracoes/loja', Icon: Clock },
            { label: 'Produtos', href: '/produtos', Icon: Package },
          ].map(({ label, href, Icon }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center justify-between text-xs font-medium hover:opacity-70 transition-opacity"
              style={{ color: 'var(--ink-2)' }}
            >
              <div className="flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 text-ink-3" />
                <span>{label}</span>
              </div>
              <span style={{ color: 'var(--ink-3)' }}>→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function ToggleBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
      style={{
        background: active ? 'var(--bg)' : 'transparent',
        color: active ? 'var(--ink)' : 'var(--ink-3)',
        boxShadow: active ? 'var(--shadow-sm)' : 'none',
      }}
    >
      {children}
    </button>
  )
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: 272,
        background: '#0a0a09',
        borderRadius: 46,
        padding: '14px 9px 28px',
        boxShadow:
          '0 48px 96px -24px rgba(0,0,0,0.55), inset 0 0 0 1.5px rgba(255,255,255,0.09), 0 0 0 1px rgba(0,0,0,0.95)',
        flexShrink: 0,
      }}
    >
      {/* Dynamic island */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
        <div
          style={{
            width: 110,
            height: 14,
            background: '#000',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.04)',
          }}
        />
      </div>

      {/* Screen */}
      <div style={{ borderRadius: 34, overflow: 'hidden', minHeight: 500 }}>{children}</div>

      {/* Home indicator */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
        <div
          style={{
            width: 110,
            height: 5,
            background: 'rgba(255,255,255,0.22)',
            borderRadius: 3,
          }}
        />
      </div>
    </div>
  )
}

function StatusBar({ bg, textColor }: { bg: string; textColor: string }) {
  return (
    <div
      style={{
        height: 20,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
      }}
    >
      <span style={{ fontSize: 8, fontWeight: 700, color: textColor, opacity: 0.65 }}>9:41</span>
      <span style={{ fontSize: 7, color: textColor, opacity: 0.55 }}>◾◾◾</span>
    </div>
  )
}

function AppScreen({
  loja,
  produtos,
  template,
}: {
  loja: LojaPreview
  produtos: ProdutoPreview[]
  template: Template
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: template.bgTela }}>
      <StatusBar bg={template.bgHeader} textColor={template.textoPrimario} />

      {/* App top bar */}
      <div
        style={{
          padding: '8px 14px 8px',
          background: template.bgHeader,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            padding: '3px 11px',
            borderRadius: 20,
            background: template.acento,
            fontSize: 10,
            fontWeight: 800,
            color: template.acentoInk,
            letterSpacing: '-0.02em',
          }}
        >
          Mallevo
        </div>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            background: 'rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
          }}
        >
          👤
        </div>
      </div>

      {/* Banner */}
      <div
        style={{
          height: 92,
          background: loja.banner_url
            ? undefined
            : `linear-gradient(135deg, ${template.bgHeader} 0%, ${template.acento} 100%)`,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {loja.banner_url && (
          <img
            src={loja.banner_url}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.25) 100%)',
          }}
        />
      </div>

      {/* Store identity */}
      <div style={{ padding: '0 14px', marginTop: -26, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 9, marginBottom: 10 }}>
          {/* Logo */}
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              border: `3px solid ${template.bgTela}`,
              overflow: 'hidden',
              flexShrink: 0,
              background: template.acento,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 800,
              color: template.acentoInk,
              boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
            }}
          >
            {loja.logo_url ? (
              <img
                src={loja.logo_url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              loja.nome.charAt(0).toUpperCase()
            )}
          </div>
          <div style={{ paddingBottom: 3 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: template.textoPrimario,
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }}
            >
              {loja.nome.length > 18 ? loja.nome.slice(0, 18) + '…' : loja.nome}
            </div>
            {loja.tempo_entrega && (
              <div style={{ fontSize: 9, color: template.textoSecundario, marginTop: 2 }}>
                ⏱ {loja.tempo_entrega} min ·{' '}
                {loja.taxa_entrega === 0 ? 'Grátis' : fmt(loja.taxa_entrega)}
              </div>
            )}
          </div>
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 12, overflow: 'hidden' }}>
          {['Todos', 'Destaques', 'Ofertas'].map((cat, i) => (
            <div
              key={cat}
              style={{
                padding: '3px 10px',
                borderRadius: 20,
                fontSize: 9,
                fontWeight: 600,
                background: i === 0 ? template.acento : 'rgba(128,128,128,0.1)',
                color: i === 0 ? template.acentoInk : template.textoSecundario,
                whiteSpace: 'nowrap',
              }}
            >
              {cat}
            </div>
          ))}
        </div>

        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: template.textoPrimario,
            marginBottom: 8,
            letterSpacing: '-0.01em',
          }}
        >
          Mais pedidos
        </div>

        {/* Product grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
          {produtos.slice(0, 4).map((p) => (
            <div
              key={p.id}
              style={{
                background: template.bgCard,
                borderRadius: 12,
                overflow: 'hidden',
                border: `1px solid ${template.linha}`,
              }}
            >
              <div style={{ height: 62, background: template.linha, overflow: 'hidden' }}>
                {p.foto_url && (
                  <img
                    src={p.foto_url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
              </div>
              <div style={{ padding: '5px 8px 7px' }}>
                <div
                  style={{
                    fontSize: 8,
                    fontWeight: 600,
                    color: template.textoPrimario,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.nome}
                </div>
                <div style={{ fontSize: 9, fontWeight: 700, color: template.acentoDk, marginTop: 2 }}>
                  {fmt(p.preco)}
                </div>
              </div>
            </div>
          ))}
          {Array.from({ length: Math.max(0, 4 - produtos.length) }).map((_, i) => (
            <div
              key={`ph-${i}`}
              style={{
                height: 98,
                borderRadius: 12,
                border: `1.5px dashed ${template.linha}`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Bottom nav */}
      <div
        style={{
          marginTop: 14,
          padding: '10px 0 6px',
          borderTop: `1px solid ${template.linha}`,
          display: 'flex',
          justifyContent: 'space-around',
          background: template.bgTela,
        }}
      >
        {['🏠', '🔍', '🛒', '👤'].map((icon, i) => (
          <div
            key={i}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}
          >
            <span style={{ fontSize: 17 }}>{icon}</span>
            {i === 0 && (
              <div
                style={{ width: 4, height: 4, borderRadius: '50%', background: template.acento }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function WebScreen({
  loja,
  produtos,
  template,
}: {
  loja: LojaPreview
  produtos: ProdutoPreview[]
  template: Template
}) {
  const urlDisplay = loja.slug ? `mallevo.com.br/${loja.slug}` : 'mallevo.com.br/sua-loja'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: template.bgTela }}>
      <StatusBar bg="#f0f0ed" textColor="#0f0f0d" />

      {/* Browser chrome */}
      <div
        style={{
          padding: '6px 10px 5px',
          background: '#f0f0ed',
          borderBottom: '1px solid #dcdcd8',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', gap: 3.5 }}>
            {['#ff5f57', '#ffbd2e', '#28c840'].map((c) => (
              <div key={c} style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />
            ))}
          </div>
          <div
            style={{
              flex: 1,
              background: '#ffffff',
              borderRadius: 8,
              padding: '3px 9px',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              border: '1px solid #dcdcd8',
            }}
          >
            <span style={{ fontSize: 7, color: '#4a7c3f' }}>🔒</span>
            <span
              style={{
                fontSize: 7,
                color: '#4a4a46',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                fontFamily: 'monospace',
              }}
            >
              {urlDisplay}
            </span>
          </div>
        </div>
      </div>

      {/* Web content */}
      <div style={{ background: template.bgTela }}>
        {/* Banner */}
        <div
          style={{
            height: 84,
            background: loja.banner_url
              ? undefined
              : `linear-gradient(135deg, ${template.bgHeader} 0%, ${template.acento} 100%)`,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {loja.banner_url && (
            <img
              src={loja.banner_url}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.30) 100%)',
            }}
          />
        </div>

        {/* Store identity */}
        <div style={{ padding: '0 14px 12px', marginTop: -24, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 9 }}>
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: 14,
                border: '3px solid #fff',
                overflow: 'hidden',
                flexShrink: 0,
                background: template.acento,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 800,
                color: template.acentoInk,
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
              }}
            >
              {loja.logo_url ? (
                <img
                  src={loja.logo_url}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                loja.nome.charAt(0).toUpperCase()
              )}
            </div>
            <div style={{ paddingBottom: 3 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: template.textoPrimario,
                  letterSpacing: '-0.02em',
                }}
              >
                {loja.nome}
              </div>
              {loja.descricao && (
                <div
                  style={{
                    fontSize: 8,
                    color: template.textoSecundario,
                    marginTop: 1,
                    maxWidth: 150,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {loja.descricao}
                </div>
              )}
            </div>
          </div>

          {/* Info pills */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
            {loja.aceita_pix && (
              <WebPill bg={template.linha} color={template.textoSecundario}>
                PIX
              </WebPill>
            )}
            {loja.aceita_cartao_online && (
              <WebPill bg={template.linha} color={template.textoSecundario}>
                Cartão
              </WebPill>
            )}
            {loja.tempo_entrega && (
              <WebPill bg={template.linha} color={template.textoSecundario}>
                ⏱ {loja.tempo_entrega} min
              </WebPill>
            )}
            {loja.taxa_entrega === 0 && (
              <WebPill bg="rgba(79,176,37,0.12)" color="#4fb025">
                Frete grátis
              </WebPill>
            )}
          </div>

          {/* CTA */}
          <div
            style={{
              padding: '8px 14px',
              borderRadius: 24,
              background: template.acento,
              color: template.acentoInk,
              fontSize: 9,
              fontWeight: 700,
              textAlign: 'center',
              marginBottom: 13,
            }}
          >
            Ver cardápio completo →
          </div>

          {/* Products list */}
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: template.textoPrimario,
              marginBottom: 8,
              letterSpacing: '-0.01em',
            }}
          >
            Em destaque
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {produtos.slice(0, 3).map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  gap: 8,
                  background: template.bgCard,
                  borderRadius: 10,
                  border: `1px solid ${template.linha}`,
                  padding: 6,
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 9,
                    background: template.linha,
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  {p.foto_url && (
                    <img
                      src={p.foto_url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 8,
                      fontWeight: 600,
                      color: template.textoPrimario,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.nome}
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: template.acentoDk, marginTop: 1 }}>
                    {fmt(p.preco)}
                  </div>
                </div>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: template.acento,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: 15,
                    color: template.acentoInk,
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  +
                </div>
              </div>
            ))}
            {produtos.length === 0 && (
              <div
                style={{
                  height: 56,
                  borderRadius: 10,
                  border: `1.5px dashed ${template.linha}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 8,
                  color: template.textoSecundario,
                }}
              >
                Nenhum produto cadastrado
              </div>
            )}
          </div>
        </div>

        {/* Web footer */}
        <div
          style={{
            padding: '8px 14px 10px',
            borderTop: `1px solid ${template.linha}`,
            display: 'flex',
            justifyContent: 'center',
            background: template.bgTela,
          }}
        >
          <span style={{ fontSize: 8, color: template.textoSecundario }}>
            Powered by{' '}
            <strong style={{ color: template.textoPrimario }}>Mallevo</strong>
          </span>
        </div>
      </div>
    </div>
  )
}

function WebPill({
  children,
  bg,
  color,
}: {
  children: React.ReactNode
  bg: string
  color: string
}) {
  return (
    <span
      style={{
        padding: '2px 7px',
        borderRadius: 20,
        fontSize: 8,
        background: bg,
        color,
      }}
    >
      {children}
    </span>
  )
}
