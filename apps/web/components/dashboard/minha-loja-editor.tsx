'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, Lock, Upload, Zap, ImagePlus } from 'lucide-react'
import {
  ARQUETIPOS,
  RADIUS_STEPS_PX,
  TYPE_SCALE_FACTOR,
  getArquetipoSugestao,
  googleFontsHref,
  resolveTheme,
  type ArquetipoCodigo,
  type ThemeTokens,
} from '@mallevo/lib'
import { publicarVitrine } from '@/lib/actions/loja-vitrine'
import { showToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/dashboard/page-header'
import { StoreStatusToggle } from '@/components/dashboard/store-status-toggle'
import { LinkPublicoBotao } from '@/components/dashboard/link-publico-botao'

// ─── Tema (forma consumida pelo preview) ───────────────────────────────────────

type Tema = {
  acento: string
  acentoDk: string
  acentoInk: string
  bgTela: string
  bgHeader: string
  bgCard: string
  textoPrimario: string
  textoSecundario: string
  linha: string
  /** Raio (px, já na escala do preview) de cards/imagens. */
  raioCard: number
  /** Raio (px, escala do preview) de chips e CTAs "stadium". */
  raioPill: number
  /** Família display do arquétipo (carregada via Google Fonts no preview). */
  fonteDisplay: string
  /** Fator de escala dos títulos (typography.scale do arquétipo). */
  fatorTipo: number
}

/** O phone mockup é ~55% do device real — raios acompanham a miniatura. */
const ESCALA_PREVIEW = 0.55
function raioPreview(px: number): number {
  return px >= 999 ? 999 : Math.max(2, Math.round(px * ESCALA_PREVIEW))
}

/** Pilha de fonte do display no preview (fallback de sistema). */
function fonteDisplayCss(tema: Tema): string {
  return `"${tema.fonteDisplay}", system-ui, sans-serif`
}

/**
 * Deriva o `Tema` do preview a partir dos tokens resolvidos do StoreTheme — a
 * MESMA engine (`resolveTheme`, @mallevo/lib) que o storefront e o app usam,
 * incluindo forma (RADIUS_STEPS_PX) e tipografia (família display +
 * TYPE_SCALE_FACTOR). Garante "o que vejo é o que publico". Preço/realce em
 * `ink` (igual aos apps reais, onde o preço é renderizado em text-ink).
 */
function temaFromTokens(t: ThemeTokens): Tema {
  const raios = RADIUS_STEPS_PX[t.shape.radius]
  return {
    acento: t.color.accent,
    acentoDk: t.color.ink,
    acentoInk: t.color.accentInk,
    bgTela: t.color.bg,
    bgHeader: t.color.surface,
    bgCard: t.color.surface,
    textoPrimario: t.color.ink,
    textoSecundario: t.color.inkMuted,
    linha: t.color.line,
    raioCard: raioPreview(raios.md),
    raioPill: raioPreview(raios.pill),
    fonteDisplay: t.typography.display.family,
    fatorTipo: TYPE_SCALE_FACTOR[t.typography.scale],
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LojaEditorInicial {
  nome: string
  descricao: string | null
  logo_url: string | null
  banner_url: string | null
  /** `stores.theme` cru (StoreThemeConfig v2 ou legado v1). */
  theme: Record<string, unknown> | null
  ativo: boolean
  slug: string | null
  /** Slug da categoria — sugere o arquétipo default no editor. */
  categoriaSlug: string | null
}

const TAMANHO_MAX_BYTES = 5 * 1024 * 1024
const MIME_PERMITIDOS = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

function validarUpload(arquivo: File, rotulo: string): string | null {
  if (arquivo.size > TAMANHO_MAX_BYTES) {
    return `${rotulo} excede o tamanho máximo de 5MB`
  }
  if (!MIME_PERMITIDOS.includes(arquivo.type)) {
    return `${rotulo} deve ser PNG, JPEG, WebP ou SVG`
  }
  return null
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
  const presetInicial: ArquetipoCodigo =
    loja.theme && typeof loja.theme.preset === 'string' && loja.theme.preset in ARQUETIPOS
      ? (loja.theme.preset as ArquetipoCodigo)
      : getArquetipoSugestao(loja.categoriaSlug).default
  const accentInicial =
    (loja.theme?.color as { accent?: string } | undefined)?.accent ?? null

  const [preset, setPreset] = useState<ArquetipoCodigo>(presetInicial)
  const [accent, setAccent] = useState<string | null>(accentInicial)
  const [nome, setNome] = useState(loja.nome)
  const [tagline, setTagline] = useState(loja.descricao ?? '')
  const [logoUrl, setLogoUrl] = useState<string | null>(loja.logo_url)
  const [bannerUrl, setBannerUrl] = useState<string | null>(loja.banner_url)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [activeTab, setActiveTab] = useState<TabPreview>('home')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const logoInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const logoPreviewRef = useRef<string | null>(null)
  const bannerPreviewRef = useRef<string | null>(null)

  // Cleanup das URLs criadas com URL.createObjectURL ao desmontar
  useEffect(() => {
    return () => {
      if (logoPreviewRef.current) URL.revokeObjectURL(logoPreviewRef.current)
      if (bannerPreviewRef.current) URL.revokeObjectURL(bannerPreviewRef.current)
    }
  }, [])

  // Tema do preview derivado da engine real (preset + override de accent).
  const tokens = resolveTheme({
    v: 2,
    preset,
    ...(accent ? { color: { accent } } : {}),
  })
  const temaAtivo: Tema = temaFromTokens(tokens)
  // Fonte display do arquétipo ativo — o preview tipografa como os apps reais.
  const fontsHref = googleFontsHref(tokens)

  const sugestao = getArquetipoSugestao(loja.categoriaSlug)
  const recomendados: ArquetipoCodigo[] = [sugestao.default, ...sugestao.alternativas]
  const outros = (Object.keys(ARQUETIPOS) as ArquetipoCodigo[]).filter(
    (c) => !recomendados.includes(c)
  )

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const erro = validarUpload(file, 'Logo')
    if (erro) {
      showToast({ tipo: 'erro', titulo: 'Logo inválido', descricao: erro })
      e.target.value = ''
      return
    }
    if (logoPreviewRef.current) URL.revokeObjectURL(logoPreviewRef.current)
    const url = URL.createObjectURL(file)
    logoPreviewRef.current = url
    setLogoFile(file)
    setLogoUrl(url)
  }

  function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const erro = validarUpload(file, 'Banner')
    if (erro) {
      showToast({ tipo: 'erro', titulo: 'Banner inválido', descricao: erro })
      e.target.value = ''
      return
    }
    if (bannerPreviewRef.current) URL.revokeObjectURL(bannerPreviewRef.current)
    const url = URL.createObjectURL(file)
    bannerPreviewRef.current = url
    setBannerFile(file)
    setBannerUrl(url)
  }

  async function handlePublicar() {
    setSaving(true)

    const formData = new FormData()
    formData.set('preset', preset)
    formData.set('accent', accent ?? '')
    formData.set('nome', nome)
    formData.set('tagline', tagline)
    if (logoFile) formData.set('logo', logoFile)
    if (bannerFile) formData.set('banner', bannerFile)

    const resultado = await publicarVitrine(formData)
    setSaving(false)

    if ('erro' in resultado) {
      showToast({
        tipo: 'erro',
        titulo: 'Não foi possível publicar',
        descricao: resultado.erro,
      })
      return
    }

    setLogoFile(null)
    setBannerFile(null)
    showToast({ tipo: 'sucesso', titulo: 'Vitrine publicada' })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="flex" style={{ height: '100%' }}>
      {fontsHref && (
        <>
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link rel="stylesheet" href={fontsHref} />
        </>
      )}
      {/* ── Painel esquerdo (editor) ──────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-w-0">
        <div className="p-9 max-w-[720px]">
          <PageHeader
            titulo="Minha Loja"
            subtitulo="Personalize a vitrine que seus clientes verão."
            badgeCabecalho={
              loja.ativo
                ? { texto: 'Loja aberta', cor: 'ok' }
                : { texto: 'Loja pausada', cor: 'warn' }
            }
            acoes={
              <>
                <StoreStatusToggle inicialAtivo={loja.ativo} />
                <LinkPublicoBotao slug={loja.slug} />
                <button
                  onClick={handlePublicar}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-60"
                  style={{
                    background: saved ? 'var(--ok)' : 'var(--brick)',
                    color: saved ? '#fff' : 'var(--brick-ink)',
                  }}
                >
                  <Zap className="w-3 h-3" />
                  {saving ? 'Publicando…' : saved ? 'Publicado!' : 'Publicar alterações'}
                </button>
              </>
            }
          />

          {/* ── ESTILO DA LOJA ───────────────────────────────── */}
          <Secao titulo="ESTILO DA LOJA">
            <p className="text-xs text-ink-3 -mt-2 mb-3">
              Sugeridos para a sua categoria — escolha o que combina com o tom da
              sua marca. Você pode mudar quando quiser.
            </p>
            <div className="space-y-3">
              {recomendados.map((code) => (
                <ArquetipoCard
                  key={code}
                  code={code}
                  selected={preset === code}
                  recomendado={code === sugestao.default}
                  onSelect={() => setPreset(code)}
                />
              ))}
            </div>
            {outros.length > 0 && (
              <>
                <p
                  className="text-[10px] uppercase font-semibold mt-5 mb-3"
                  style={{ color: 'var(--ink-3)', letterSpacing: '0.14em' }}
                >
                  Outros estilos
                </p>
                <div className="space-y-3">
                  {outros.map((code) => (
                    <ArquetipoCard
                      key={code}
                      code={code}
                      selected={preset === code}
                      onSelect={() => setPreset(code)}
                    />
                  ))}
                </div>
              </>
            )}
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

          {/* ── COR DE DESTAQUE ──────────────────────────────── */}
          <Secao titulo="COR DE DESTAQUE">
            <div
              className="flex items-center gap-4 px-5 py-4 rounded-2xl"
              style={{ border: '1px solid var(--line)', background: 'var(--bg)' }}
            >
              <label
                className="relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer"
                style={{ boxShadow: 'inset 0 0 0 1px var(--line-2)' }}
              >
                <span
                  className="block w-full h-full"
                  style={{ background: tokens.color.accent }}
                />
                <input
                  type="color"
                  value={tokens.color.accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  aria-label="Cor de destaque"
                />
              </label>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ink">Cor dos botões e destaques</p>
                <p className="text-xs text-ink-3 mt-0.5">
                  {accent
                    ? 'Personalizada'
                    : `Padrão do estilo ${ARQUETIPOS[preset].nome}`}{' '}
                  · {tokens.color.accent.toUpperCase()}
                </p>
              </div>
              {accent && (
                <button
                  onClick={() => setAccent(null)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 hover:opacity-90 transition-opacity"
                  style={{ background: 'var(--bg-2)', color: 'var(--ink-2)' }}
                >
                  Restaurar
                </button>
              )}
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
                  <p className="text-sm font-bold text-ink">
                    {ARQUETIPOS[preset].tokens.typography.display.family}
                  </p>
                  <p className="text-xs text-ink-3 mt-0.5">
                    Tipografia do estilo{' '}
                    <span className="font-semibold" style={{ color: 'var(--ink-2)' }}>
                      {ARQUETIPOS[preset].nome}
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

function ArquetipoCard({
  code,
  selected,
  recomendado,
  onSelect,
}: {
  code: ArquetipoCodigo
  selected: boolean
  recomendado?: boolean
  onSelect: () => void
}) {
  const arq = ARQUETIPOS[code]
  const template = temaFromTokens(arq.tokens)
  // Mini-preview (~40% do phone): raio reduzido proporcionalmente para que o
  // DNA de forma do arquétipo (sharp/soft/round) apareça já na seleção.
  const raioMini = Math.max(1, Math.round(template.raioCard * 0.6))
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
          className="flex-shrink-0 relative"
          style={{ width: 132, background: template.bgTela, height: 100, overflow: 'hidden' }}
        >
          {/* Header strip */}
          <div
            style={{ height: 22, background: template.bgHeader, display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', borderBottom: `1px solid ${template.linha}` }}
          >
            <div
              style={{ width: 14, height: 14, borderRadius: 4, background: template.acento, flexShrink: 0 }}
            />
            <div style={{ flex: 1, height: 5, borderRadius: 3, background: template.linha }} />
            <div style={{ width: 14, height: 14, borderRadius: 14, background: template.linha }} />
          </div>
          {/* Content simulation */}
          <div style={{ padding: '0 10px', marginTop: 8, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 7 }}>
              <div
                style={{
                  width: 28, height: 28, borderRadius: raioMini,
                  background: template.acento, flexShrink: 0,
                }}
              />
              <div>
                <div style={{ width: 50, height: 5, borderRadius: 3, background: template.textoPrimario, opacity: 0.7, marginBottom: 4 }} />
                <div style={{ width: 34, height: 4, borderRadius: 3, background: template.textoSecundario, opacity: 0.6 }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4 }}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{ height: 26, borderRadius: raioMini, background: i === 0 ? template.acento : template.bgCard, border: `1px solid ${template.linha}` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Nome + descrição + check */}
        <div
          className="flex-1 min-w-0 flex flex-col justify-between py-3 px-4"
          style={{ background: selected ? 'var(--brick-lt)' : 'var(--bg-2)' }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p
                  className="text-sm font-bold truncate"
                  style={{ color: selected ? 'var(--brick-dk)' : 'var(--ink)' }}
                >
                  {arq.nome}
                </p>
                {recomendado && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
                  >
                    Recomendado
                  </span>
                )}
              </div>
              <p className="text-[11px] text-ink-3 mt-1 leading-snug line-clamp-2">
                {arq.descricao}
              </p>
            </div>
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: selected ? 'var(--brick-dk)' : 'var(--line-2)' }}
            >
              {selected && <Check style={{ width: 12, height: 12, color: '#fff' }} />}
            </div>
          </div>
          <div className="flex gap-1 mt-2">
            {arq.mood.map((m) => (
              <span
                key={m}
                className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--bg-3)', color: 'var(--ink-3)' }}
              >
                {m}
              </span>
            ))}
          </div>
        </div>
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
            borderRadius: tema.raioPill,
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
              borderRadius: tema.raioCard,
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
                fontSize: Math.round(11 * tema.fatorTipo),
                fontWeight: 700,
                fontFamily: fonteDisplayCss(tema),
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
              borderRadius: tema.raioPill,
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
                borderRadius: tema.raioPill,
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
                borderRadius: tema.raioCard,
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
                style={{
                  height: 90,
                  borderRadius: tema.raioCard,
                  border: `1.5px dashed ${tema.linha}`,
                }}
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
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            fontFamily: fonteDisplayCss(tema),
            color: tema.textoPrimario,
          }}
        >
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
            fontSize: Math.round(13 * tema.fatorTipo),
            fontWeight: 700,
            fontFamily: fonteDisplayCss(tema),
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
              borderRadius: tema.raioPill,
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
            borderRadius: tema.raioPill,
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
        <span
          style={{
            fontSize: Math.round(14 * tema.fatorTipo),
            fontWeight: 700,
            fontFamily: fonteDisplayCss(tema),
            color: tema.textoPrimario,
          }}
        >
          Meu carrinho
        </span>
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
              borderRadius: tema.raioCard,
              padding: 7,
              border: `1px solid ${tema.linha}`,
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: Math.max(2, tema.raioCard - 2),
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
                borderRadius: tema.raioPill,
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
            borderRadius: tema.raioPill,
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
