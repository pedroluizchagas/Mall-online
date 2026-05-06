'use client'

import { useState, useRef } from 'react'
import { Check, Lock, Upload, Zap, ImagePlus } from 'lucide-react'

// ─── Templates ───────────────────────────────────────────────────────────────

type Tema = {
  id: string
  nome: string
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

const TEMPLATES: Tema[] = [
  {
    id: 'market',
    nome: 'Market',
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
    id: 'boutique',
    nome: 'Boutique',
    acento: '#e8c4b8',
    acentoDk: '#c4907a',
    acentoInk: '#2a1412',
    bgTela: '#fdf8f5',
    bgHeader: '#f0e4dc',
    bgCard: '#ffffff',
    textoPrimario: '#2a1412',
    textoSecundario: '#9a7868',
    linha: '#eeddd5',
  },
  {
    id: 'artesanal',
    nome: 'Artesanal',
    acento: '#e8a060',
    acentoDk: '#c07030',
    acentoInk: '#ffffff',
    bgTela: '#fdf4ec',
    bgHeader: '#d4845a',
    bgCard: '#fff8f0',
    textoPrimario: '#1a0f08',
    textoSecundario: '#8a6a50',
    linha: '#e8d4c0',
  },
  {
    id: 'neon',
    nome: 'Neon',
    acento: '#39ff14',
    acentoDk: '#28cc0e',
    acentoInk: '#000000',
    bgTela: '#080808',
    bgHeader: '#0f0f0f',
    bgCard: '#141414',
    textoPrimario: '#f0f0f0',
    textoSecundario: '#555555',
    linha: '#1e1e1e',
  },
]

// ─── Paletas ─────────────────────────────────────────────────────────────────

type Paleta = {
  id: string
  nome: string
  cor1: string
  cor2: string
  bg: string
  acento: string
  acentoDk: string
  acentoInk: string
}

const PALETAS: Paleta[] = [
  {
    id: 'midnight',
    nome: 'Midnight',
    cor1: '#14b8a6',
    cor2: '#3b82f6',
    bg: '#0f172a',
    acento: '#14b8a6',
    acentoDk: '#0d9488',
    acentoInk: '#000000',
  },
  {
    id: 'ocean',
    nome: 'Ocean',
    cor1: '#38bdf8',
    cor2: '#0ea5e9',
    bg: '#0c1a2e',
    acento: '#38bdf8',
    acentoDk: '#0284c7',
    acentoInk: '#000000',
  },
  {
    id: 'berry',
    nome: 'Berry',
    cor1: '#d946ef',
    cor2: '#a855f7',
    bg: '#1a082e',
    acento: '#d946ef',
    acentoDk: '#a21caf',
    acentoInk: '#ffffff',
  },
  {
    id: 'ember',
    nome: 'Ember',
    cor1: '#fb923c',
    cor2: '#ef4444',
    bg: '#1c0800',
    acento: '#fb923c',
    acentoDk: '#ea580c',
    acentoInk: '#000000',
  },
  {
    id: 'slate',
    nome: 'Slate',
    cor1: '#94a3b8',
    cor2: '#475569',
    bg: '#0f172a',
    acento: '#94a3b8',
    acentoDk: '#64748b',
    acentoInk: '#000000',
  },
  {
    id: 'matcha',
    nome: 'Matcha',
    cor1: '#84cc16',
    cor2: '#22c55e',
    bg: '#0a1a00',
    acento: '#84cc16',
    acentoDk: '#65a30d',
    acentoInk: '#000000',
  },
]

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LojaEditorInicial {
  nome: string
  descricao: string | null
  logo_url: string | null
  banner_url: string | null
}

export interface ProdutoEditorInicial {
  id: string
  nome: string
  foto_url: string | null
  preco: number
}

interface Props {
  loja: LojaEditorInicial
  produtos: ProdutoEditorInicial[]
}

type TabPreview = 'home' | 'produto' | 'carrinho'

// ─── Editor principal ─────────────────────────────────────────────────────────

export function MinhaLojaEditor({ loja, produtos }: Props) {
  const [templateId, setTemplateId] = useState('market')
  const [paletaId, setPaletaId] = useState<string | null>(null)
  const [nome, setNome] = useState(loja.nome)
  const [tagline, setTagline] = useState(loja.descricao ?? '')
  const [logoUrl, setLogoUrl] = useState<string | null>(loja.logo_url)
  const [bannerUrl, setBannerUrl] = useState<string | null>(loja.banner_url)
  const [activeTab, setActiveTab] = useState<TabPreview>('home')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const logoInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0]
  const paleta = paletaId ? PALETAS.find((p) => p.id === paletaId) : null

  const temaAtivo: Tema = {
    ...template,
    acento: paleta?.acento ?? template.acento,
    acentoDk: paleta?.acentoDk ?? template.acentoDk,
    acentoInk: paleta?.acentoInk ?? template.acentoInk,
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setLogoUrl(url)
  }

  function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setBannerUrl(url)
  }

  async function handlePublicar() {
    setSaving(true)
    localStorage.setItem(
      'mallevo-loja-config',
      JSON.stringify({ templateId, paletaId, nome, tagline })
    )
    await new Promise((r) => setTimeout(r, 800))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="flex" style={{ height: '100%' }}>
      {/* ── Painel esquerdo (editor) ──────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-w-0">
        <div className="p-9 max-w-[720px]">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-9">
            <div>
              <h1 className="font-display text-[28px] m-0 leading-tight">Minha Loja</h1>
              <p className="text-[14px] text-ink-3 mt-1">
                Personalize a experiência visual dos seus clientes no app.
              </p>
            </div>
            <button
              onClick={handlePublicar}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold hover:opacity-90 transition-opacity flex-shrink-0 disabled:opacity-60"
              style={{
                background: saved ? 'var(--ok)' : 'var(--brick)',
                color: saved ? '#fff' : 'var(--brick-ink)',
              }}
            >
              <Zap className="w-3.5 h-3.5" />
              {saving ? 'Publicando…' : saved ? 'Publicado!' : 'Publicar alterações'}
            </button>
          </div>

          {/* ── TEMPLATE ─────────────────────────────────────── */}
          <Secao titulo="TEMPLATE">
            <div className="space-y-3">
              {TEMPLATES.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  selected={templateId === t.id}
                  onSelect={() => setTemplateId(t.id)}
                />
              ))}
            </div>
          </Secao>

          {/* ── IDENTIDADE ───────────────────────────────────── */}
          <Secao titulo="IDENTIDADE">
            <div className="flex gap-6 items-start">
              {/* Logo upload */}
              <div className="flex flex-col items-center gap-1.5">
                <p className="text-xs font-semibold text-ink-2 self-start mb-1">Logo</p>
                <button
                  onClick={() => logoInputRef.current?.click()}
                  className="w-[90px] h-[90px] rounded-2xl flex flex-col items-center justify-center gap-1.5 border-2 border-dashed hover:opacity-80 transition-opacity overflow-hidden"
                  style={{
                    borderColor: 'var(--line-2)',
                    background: logoUrl ? 'transparent' : 'var(--bg-2)',
                  }}
                >
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-ink-3" />
                      <span className="text-[10px] text-ink-3 font-medium text-center leading-tight">
                        Enviar logo
                      </span>
                    </>
                  )}
                </button>
                <p className="text-[9px] text-ink-3">PNG, SVG · 512px</p>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/svg+xml,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleLogoChange}
                />
              </div>

              {/* Campos */}
              <div className="flex-1 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-ink-2 block mb-1.5">
                    Nome da loja
                  </label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Nome da sua loja"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-colors"
                    style={{
                      border: '1px solid var(--line-2)',
                      background: 'var(--bg)',
                      color: 'var(--ink)',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--brick-dk)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--line-2)')}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-2 block mb-1.5">
                    Tagline
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="Uma frase que descreve sua loja"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-colors"
                    style={{
                      border: '1px solid var(--line-2)',
                      background: 'var(--bg)',
                      color: 'var(--ink)',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--brick-dk)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--line-2)')}
                  />
                </div>
              </div>
            </div>
          </Secao>

          {/* ── PALETA DE CORES ──────────────────────────────── */}
          <Secao titulo="PALETA DE CORES">
            <div className="grid grid-cols-3 gap-3">
              {PALETAS.map((p) => (
                <PaletaCard
                  key={p.id}
                  paleta={p}
                  selected={paletaId === p.id}
                  onSelect={() => setPaletaId(paletaId === p.id ? null : p.id)}
                />
              ))}
            </div>
          </Secao>

          {/* ── TIPOGRAFIA ───────────────────────────────────── */}
          <Secao titulo="TIPOGRAFIA">
            <div
              className="flex items-center justify-between px-5 py-4 rounded-2xl"
              style={{ border: '1px solid var(--line)', background: 'var(--bg)' }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0"
                  style={{ background: 'var(--ink)', color: 'var(--bg)' }}
                >
                  Aa
                </div>
                <div>
                  <p className="text-sm font-bold text-ink">Plus Jakarta Sans</p>
                  <p className="text-xs text-ink-3 mt-0.5">
                    Amarrada ao template{' '}
                    <span className="font-semibold" style={{ color: 'var(--ink-2)' }}>
                      {template.nome}
                    </span>
                    . Garante consistência visual.
                  </p>
                </div>
              </div>
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: 'var(--bg-2)', color: 'var(--ink-3)' }}
              >
                <Lock className="w-3 h-3" />
                Bloqueada
              </div>
            </div>
          </Secao>

          {/* ── BANNER PROMOCIONAL ───────────────────────────── */}
          <Secao titulo="BANNER PROMOCIONAL">
            <button
              onClick={() => bannerInputRef.current?.click()}
              className="w-full rounded-2xl overflow-hidden border-2 border-dashed hover:opacity-80 transition-opacity"
              style={{
                borderColor: 'var(--line-2)',
                background: 'var(--bg)',
                height: 140,
              }}
            >
              {bannerUrl ? (
                <img
                  src={bannerUrl}
                  alt="Banner"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--bg-2)' }}
                  >
                    <ImagePlus className="w-5 h-5 text-ink-3" />
                  </div>
                  <p className="text-sm font-semibold text-ink-2">Clique para enviar um banner</p>
                  <p className="text-xs text-ink-3">PNG, JPG ou WebP · Recomendado 1200 × 400px</p>
                </div>
              )}
            </button>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleBannerChange}
            />
          </Secao>
        </div>
      </div>

      {/* ── Painel direito (preview) ──────────────────────────────── */}
      <div
        className="flex-shrink-0 flex flex-col border-l overflow-y-auto"
        style={{
          width: 308,
          borderColor: 'var(--line)',
          background: 'var(--bg-2)',
          position: 'sticky',
          top: 0,
          maxHeight: 'calc(100vh - 24px)',
        }}
      >
        <div className="p-5 flex flex-col flex-1">
          <p
            className="text-[10px] uppercase font-semibold mb-4"
            style={{ color: 'var(--ink-3)', letterSpacing: '0.14em' }}
          >
            Preview ao vivo
          </p>

          {/* Tab switcher */}
          <div
            className="flex gap-1 mb-5 p-1 rounded-xl"
            style={{ background: 'var(--bg-3)' }}
          >
            {(['home', 'produto', 'carrinho'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-1.5 rounded-[10px] text-[11px] font-semibold capitalize transition-all"
                style={{
                  background: activeTab === tab ? 'var(--bg)' : 'transparent',
                  color: activeTab === tab ? 'var(--ink)' : 'var(--ink-3)',
                  boxShadow: activeTab === tab ? 'var(--shadow-sm)' : 'none',
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Phone mockup */}
          <div className="flex justify-center flex-1">
            <PreviewPhone
              tema={temaAtivo}
              nome={nome}
              tagline={tagline}
              logoUrl={logoUrl}
              bannerUrl={bannerUrl}
              produtos={produtos}
              tab={activeTab}
            />
          </div>

          <p className="text-[11px] text-ink-3 text-center mt-4 leading-snug">
            Este é o visual que seus clientes verão ao abrir sua loja no Mallevo.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Subcomponentes do editor ─────────────────────────────────────────────────

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <p
        className="text-[10px] uppercase font-semibold mb-4"
        style={{ color: 'var(--ink-3)', letterSpacing: '0.14em' }}
      >
        {titulo}
      </p>
      {children}
    </div>
  )
}

function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: Tema
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className="w-full text-left rounded-2xl overflow-hidden transition-all hover:opacity-90"
      style={{
        border: `2px solid ${selected ? 'var(--brick-dk)' : 'var(--line)'}`,
        outline: selected ? '3px solid var(--brick-lt)' : 'none',
      }}
    >
      <div className="flex">
        {/* Mini UI preview */}
        <div
          className="flex-1 relative"
          style={{ background: template.bgTela, height: 90, overflow: 'hidden' }}
        >
          {/* Header strip */}
          <div
            style={{ height: 22, background: template.bgHeader, display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px' }}
          >
            <div
              style={{ width: 14, height: 14, borderRadius: 4, background: template.acento, flexShrink: 0 }}
            />
            <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(0,0,0,0.12)' }} />
            <div style={{ width: 14, height: 14, borderRadius: 14, background: 'rgba(0,0,0,0.1)' }} />
          </div>
          {/* Content simulation */}
          <div style={{ padding: '0 10px', marginTop: -10, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 7 }}>
              <div
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  border: `2px solid ${template.bgTela}`,
                  background: template.acento, flexShrink: 0,
                }}
              />
              <div>
                <div style={{ width: 60, height: 5, borderRadius: 3, background: template.textoPrimario, opacity: 0.3, marginBottom: 4 }} />
                <div style={{ width: 40, height: 4, borderRadius: 3, background: template.textoSecundario, opacity: 0.3 }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4 }}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{ height: 28, borderRadius: 5, background: i === 0 ? template.acento : template.linha }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Name + check */}
        <div
          className="flex flex-col items-center justify-between py-3 px-4 flex-shrink-0"
          style={{ width: 90, background: selected ? 'var(--brick-lt)' : 'var(--bg-2)' }}
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{
              background: selected ? 'var(--brick-dk)' : 'var(--line-2)',
            }}
          >
            {selected && <Check style={{ width: 12, height: 12, color: '#fff' }} />}
          </div>
          <p
            className="text-xs font-bold text-center"
            style={{ color: selected ? 'var(--brick-dk)' : 'var(--ink-2)' }}
          >
            {template.nome}
          </p>
        </div>
      </div>
    </button>
  )
}

function PaletaCard({
  paleta,
  selected,
  onSelect,
}: {
  paleta: Paleta
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className="rounded-2xl overflow-hidden text-left transition-all hover:opacity-90"
      style={{
        border: `2px solid ${selected ? 'var(--brick-dk)' : 'transparent'}`,
        outline: selected ? '3px solid var(--brick-lt)' : 'none',
      }}
    >
      {/* Gradient strip */}
      <div
        style={{
          height: 8,
          background: `linear-gradient(90deg, ${paleta.cor1} 0%, ${paleta.cor2} 100%)`,
        }}
      />
      {/* Dark card */}
      <div
        className="flex items-center justify-between px-3 py-2.5"
        style={{ background: paleta.bg }}
      >
        <p className="text-[11px] font-semibold" style={{ color: '#f0f0ee' }}>
          {paleta.nome}
        </p>
        {selected && (
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: 'var(--brick-dk)' }}
          >
            <Check style={{ width: 9, height: 9, color: '#fff' }} />
          </div>
        )}
      </div>
    </button>
  )
}

// ─── Phone preview ────────────────────────────────────────────────────────────

function PreviewPhone({
  tema,
  nome,
  tagline,
  logoUrl,
  bannerUrl,
  produtos,
  tab,
}: {
  tema: Tema
  nome: string
  tagline: string
  logoUrl: string | null
  bannerUrl: string | null
  produtos: ProdutoEditorInicial[]
  tab: TabPreview
}) {
  const w = 224

  return (
    <div
      style={{
        width: w,
        background: '#0a0a09',
        borderRadius: 40,
        padding: '12px 7px 22px',
        boxShadow:
          '0 40px 80px -20px rgba(0,0,0,0.55), inset 0 0 0 1.5px rgba(255,255,255,0.09), 0 0 0 1px rgba(0,0,0,0.95)',
        flexShrink: 0,
      }}
    >
      {/* Dynamic island */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        <div
          style={{
            width: 88,
            height: 12,
            background: '#000',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.04)',
          }}
        />
      </div>

      {/* Screen */}
      <div style={{ borderRadius: 28, overflow: 'hidden', minHeight: 420, background: tema.bgTela }}>
        {tab === 'home' && (
          <HomeScreen
            tema={tema}
            nome={nome}
            tagline={tagline}
            logoUrl={logoUrl}
            bannerUrl={bannerUrl}
            produtos={produtos}
          />
        )}
        {tab === 'produto' && <ProdutoScreen tema={tema} produto={produtos[0] ?? null} />}
        {tab === 'carrinho' && <CarrinhoScreen tema={tema} produtos={produtos.slice(0, 2)} />}
      </div>

      {/* Home indicator */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
        <div
          style={{
            width: 88,
            height: 4,
            background: 'rgba(255,255,255,0.20)',
            borderRadius: 3,
          }}
        />
      </div>
    </div>
  )
}

function Sb({ bg, textColor }: { bg: string; textColor: string }) {
  const now = new Date()
  const h = now.getHours().toString().padStart(2, '0')
  const m = now.getMinutes().toString().padStart(2, '0')
  return (
    <div
      style={{
        height: 18,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 14px',
      }}
    >
      <span style={{ fontSize: 7, fontWeight: 700, color: textColor, opacity: 0.65 }}>
        {h}:{m}
      </span>
      <span style={{ fontSize: 6, color: textColor, opacity: 0.5 }}>◾◾◾</span>
    </div>
  )
}

function HomeScreen({
  tema,
  nome,
  tagline,
  logoUrl,
  bannerUrl,
  produtos,
}: {
  tema: Tema
  nome: string
  tagline: string
  logoUrl: string | null
  bannerUrl: string | null
  produtos: ProdutoEditorInicial[]
}) {
  const cats = ['Todos', 'Hortifruti', 'Mercearia', 'Limpeza']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: tema.bgTela, minHeight: 420 }}>
      <Sb bg={tema.bgHeader} textColor={tema.textoPrimario} />

      {/* App bar */}
      <div
        style={{
          padding: '7px 12px 6px',
          background: tema.bgHeader,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            padding: '2px 9px',
            borderRadius: 20,
            background: tema.acento,
            fontSize: 9,
            fontWeight: 800,
            color: tema.acentoInk,
            letterSpacing: '-0.02em',
          }}
        >
          Mallevo
        </div>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            background: 'rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
          }}
        >
          🔍
        </div>
      </div>

      {/* Store header card */}
      <div style={{ padding: '10px 12px', background: tema.bgCard, borderBottom: `1px solid ${tema.linha}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: tagline ? 6 : 0 }}>
          {/* Logo */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              overflow: 'hidden',
              flexShrink: 0,
              background: tema.acento,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 15,
              fontWeight: 800,
              color: tema.acentoInk,
            }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              (nome || 'L').charAt(0).toUpperCase()
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: tema.textoPrimario,
                letterSpacing: '-0.02em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {nome || 'Nome da loja'}
            </div>
            <div style={{ fontSize: 8, color: tema.textoSecundario, marginTop: 1 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: '#4fb025',
                  marginRight: 3,
                  verticalAlign: 'middle',
                }}
              />
              Aberto · 8h–20h
            </div>
          </div>
        </div>
        {tagline && (
          <div
            style={{
              fontSize: 8,
              color: tema.textoSecundario,
              lineHeight: 1.4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {tagline}
          </div>
        )}
        <div style={{ marginTop: 7 }}>
          <div
            style={{
              display: 'inline-block',
              padding: '4px 11px',
              borderRadius: 20,
              background: tema.acento,
              color: tema.acentoInk,
              fontSize: 8,
              fontWeight: 700,
            }}
          >
            Ver ofertas
          </div>
        </div>
      </div>

      {/* Categories */}
      <div
        style={{
          padding: '8px 12px 4px',
          borderBottom: `1px solid ${tema.linha}`,
        }}
      >
        <div
          style={{
            fontSize: 8,
            fontWeight: 700,
            color: tema.textoPrimario,
            marginBottom: 6,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            opacity: 0.6,
          }}
        >
          Categorias
        </div>
        <div style={{ display: 'flex', gap: 4, overflow: 'hidden' }}>
          {cats.map((c, i) => (
            <div
              key={c}
              style={{
                padding: '2px 8px',
                borderRadius: 20,
                fontSize: 7,
                fontWeight: 600,
                background: i === 0 ? tema.acento : 'rgba(128,128,128,0.12)',
                color: i === 0 ? tema.acentoInk : tema.textoSecundario,
                whiteSpace: 'nowrap',
              }}
            >
              {c}
            </div>
          ))}
        </div>
      </div>

      {/* Products grid */}
      <div style={{ padding: '10px 12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {produtos.slice(0, 4).map((p) => (
            <div
              key={p.id}
              style={{
                background: tema.bgCard,
                borderRadius: 10,
                overflow: 'hidden',
                border: `1px solid ${tema.linha}`,
              }}
            >
              <div style={{ height: 52, background: tema.linha, overflow: 'hidden', position: 'relative' }}>
                {p.foto_url && (
                  <img src={p.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    right: 4,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: tema.acento,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    color: tema.acentoInk,
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  +
                </div>
              </div>
              <div style={{ padding: '4px 6px 6px' }}>
                <div
                  style={{
                    fontSize: 7,
                    fontWeight: 600,
                    color: tema.textoPrimario,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginBottom: 2,
                  }}
                >
                  {p.nome}
                </div>
                <div style={{ fontSize: 8, fontWeight: 700, color: tema.acentoDk }}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.preco / 100)}
                </div>
              </div>
            </div>
          ))}
          {produtos.length === 0 &&
            [0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{ height: 90, borderRadius: 10, border: `1.5px dashed ${tema.linha}` }}
              />
            ))}
        </div>
      </div>

      {/* Bottom nav */}
      <div
        style={{
          marginTop: 'auto',
          padding: '8px 0 4px',
          borderTop: `1px solid ${tema.linha}`,
          display: 'flex',
          justifyContent: 'space-around',
          background: tema.bgTela,
        }}
      >
        {['🏠', '🔍', '🛒', '👤'].map((icon, i) => (
          <div
            key={i}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
          >
            <span style={{ fontSize: 15 }}>{icon}</span>
            {i === 0 && (
              <div
                style={{ width: 4, height: 4, borderRadius: '50%', background: tema.acento }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ProdutoScreen({
  tema,
  produto,
}: {
  tema: Tema
  produto: ProdutoEditorInicial | null
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: tema.bgTela, minHeight: 420 }}>
      <Sb bg={tema.bgTela} textColor={tema.textoPrimario} />

      {/* Back + title */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderBottom: `1px solid ${tema.linha}`,
        }}
      >
        <span style={{ fontSize: 14, color: tema.textoSecundario }}>←</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: tema.textoPrimario }}>
          {produto?.nome ?? 'Produto'}
        </span>
      </div>

      {/* Product image */}
      <div style={{ height: 130, background: tema.linha, overflow: 'hidden' }}>
        {produto?.foto_url && (
          <img
            src={produto.foto_url}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </div>

      {/* Product info */}
      <div style={{ padding: '10px 12px', flex: 1 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: tema.textoPrimario,
            letterSpacing: '-0.02em',
            marginBottom: 4,
          }}
        >
          {produto?.nome ?? 'Nome do produto'}
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, color: tema.acentoDk, marginBottom: 8 }}>
          {produto
            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.preco / 100)
            : 'R$ 0,00'}
        </div>

        <div
          style={{
            fontSize: 8,
            color: tema.textoSecundario,
            lineHeight: 1.5,
            marginBottom: 12,
          }}
        >
          Descrição do produto aparece aqui. Ingredientes, informações nutricionais e observações para o cliente.
        </div>

        {/* Quantity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 10px',
              borderRadius: 20,
              border: `1px solid ${tema.linha}`,
              background: tema.bgCard,
            }}
          >
            <span style={{ fontSize: 12, color: tema.textoSecundario }}>−</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: tema.textoPrimario }}>1</span>
            <span style={{ fontSize: 12, color: tema.textoSecundario }}>+</span>
          </div>
        </div>

        <div
          style={{
            padding: '9px 14px',
            borderRadius: 24,
            background: tema.acento,
            color: tema.acentoInk,
            fontSize: 10,
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          Adicionar ao carrinho
        </div>
      </div>
    </div>
  )
}

function CarrinhoScreen({
  tema,
  produtos,
}: {
  tema: Tema
  produtos: ProdutoEditorInicial[]
}) {
  const total = produtos.reduce((s, p) => s + p.preco, 0)
  const fmt = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n / 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: tema.bgTela, minHeight: 420 }}>
      <Sb bg={tema.bgTela} textColor={tema.textoPrimario} />

      {/* Title */}
      <div style={{ padding: '10px 12px 6px', borderBottom: `1px solid ${tema.linha}` }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: tema.textoPrimario }}>Meu carrinho</span>
      </div>

      {/* Items */}
      <div style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {produtos.length === 0 && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9,
              color: tema.textoSecundario,
            }}
          >
            Carrinho vazio
          </div>
        )}
        {produtos.map((p) => (
          <div
            key={p.id}
            style={{
              display: 'flex',
              gap: 8,
              background: tema.bgCard,
              borderRadius: 10,
              padding: 7,
              border: `1px solid ${tema.linha}`,
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: tema.linha,
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {p.foto_url && (
                <img src={p.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 8,
                  fontWeight: 600,
                  color: tema.textoPrimario,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {p.nome}
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: tema.acentoDk, marginTop: 2 }}>
                {fmt(p.preco)}
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '2px 7px',
                borderRadius: 16,
                border: `1px solid ${tema.linha}`,
                fontSize: 10,
                color: tema.textoSecundario,
              }}
            >
              − <span style={{ color: tema.textoPrimario, fontWeight: 700, fontSize: 9 }}>1</span> +
            </div>
          </div>
        ))}
      </div>

      {/* Total + checkout */}
      <div style={{ padding: '8px 12px 10px', borderTop: `1px solid ${tema.linha}`, background: tema.bgCard }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 9, color: tema.textoSecundario }}>Total</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: tema.textoPrimario }}>
            {fmt(total)}
          </span>
        </div>
        <div
          style={{
            padding: '9px 14px',
            borderRadius: 24,
            background: tema.acento,
            color: tema.acentoInk,
            fontSize: 10,
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          Finalizar pedido
        </div>
      </div>
    </div>
  )
}
