'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Check, Lock, Upload, Zap, ImagePlus } from 'lucide-react'
import {
  ARQUETIPOS,
  PALETAS,
  RADIUS_STEPS_PX,
  getArquetipoSugestao,
  resolveTheme,
  type ArquetipoCodigo,
  normalizeStoreConteudo,
} from '@mallevo/lib'
import { publicarVitrine } from '@/lib/actions/loja-vitrine'
import {
  ConteudoVitrine,
  conteudoInicial,
  conteudoParaPayload,
  type ConteudoEditavel,
  type ProdutoParaDestaque,
} from '@/components/dashboard/conteudo-vitrine'
import { extrairCoresDaLogo } from '@/lib/cor-da-logo'
import { showToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/dashboard/page-header'
import { StoreStatusToggle } from '@/components/dashboard/store-status-toggle'
import { LinkPublicoBotao } from '@/components/dashboard/link-publico-botao'
import { PreviewVitrine } from '@/components/dashboard/preview-vitrine'
import { PainelVitrine } from '@/components/dashboard/painel-vitrine'
import type { RascunhoPreview } from '@/lib/storefront-url'

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
  /** `stores.conteudo` cru (StoreConteudo v1) — voz da vitrine. */
  conteudo?: unknown | null
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

interface Props {
  loja: LojaEditorInicial
  /** Catálogo para o seletor de destaques e para o preview (id, nome, foto). */
  catalogo?: ProdutoParaDestaque[]
}

// ─── Editor principal ─────────────────────────────────────────────────────────

export function MinhaLojaEditor({ loja, catalogo = [] }: Props) {
  const presetInicial: ArquetipoCodigo =
    loja.theme && typeof loja.theme.preset === 'string' && loja.theme.preset in ARQUETIPOS
      ? (loja.theme.preset as ArquetipoCodigo)
      : getArquetipoSugestao(loja.categoriaSlug).default
  const accentInicial =
    (loja.theme?.color as { accent?: string } | undefined)?.accent ?? null
  const paletaInicial =
    typeof loja.theme?.palette === 'string' ? loja.theme.palette : null

  const [preset, setPreset] = useState<ArquetipoCodigo>(presetInicial)
  const [conteudo, setConteudo] = useState<ConteudoEditavel>(() =>
    conteudoInicial(normalizeStoreConteudo(loja.conteudo ?? null)),
  )
  // Paleta curada do arquétipo (null = original). Trocar de estilo reseta.
  const [paleta, setPaleta] = useState<string | null>(paletaInicial)
  const [accent, setAccent] = useState<string | null>(accentInicial)
  const [nome, setNome] = useState(loja.nome)
  const [tagline, setTagline] = useState(loja.descricao ?? '')
  const [logoUrl, setLogoUrl] = useState<string | null>(loja.logo_url)
  const [bannerUrl, setBannerUrl] = useState<string | null>(loja.banner_url)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
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

  // Cores de marca extraídas da logo (docs/store-theme/06 §6.3) — viram
  // sugestões de accent. Logo neutra/erro → [] (sem sugestões, sem bloquear).
  const [coresLogo, setCoresLogo] = useState<string[]>([])
  useEffect(() => {
    if (!logoUrl) {
      setCoresLogo([])
      return
    }
    let cancelado = false
    extrairCoresDaLogo(logoUrl).then((cores) => {
      if (!cancelado) setCoresLogo(cores)
    })
    return () => {
      cancelado = true
    }
  }, [logoUrl])

  // Tokens resolvidos pela engine real — alimentam o seletor de cor e a
  // tipografia mostrada; o preview em si é o storefront (abaixo).
  const tokens = resolveTheme({
    v: 2,
    preset,
    ...(paleta ? { palette: paleta } : {}),
    ...(accent ? { color: { accent } } : {}),
  })

  // Rascunho que o storefront veste no preview (mesmo JSON que "Publicar" grava).
  const rascunho = useMemo<RascunhoPreview>(
    () => ({
      theme: {
        v: 2,
        preset,
        ...(paleta ? { palette: paleta } : {}),
        ...(accent ? { color: { accent } } : {}),
      },
      conteudo: conteudoParaPayload(conteudo),
      categoria: loja.categoriaSlug,
    }),
    [preset, paleta, accent, conteudo, loja.categoriaSlug],
  )
  const produtoPreviewId = conteudo.destaques[0] ?? catalogo[0]?.id ?? null
  const temMidiaNaoPublicada = Boolean(logoFile || bannerFile || conteudo.galeriaNovas.length > 0)

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
    formData.set('palette', paleta ?? '')
    formData.set('accent', accent ?? '')
    formData.set('nome', nome)
    formData.set('tagline', tagline)
    if (logoFile) formData.set('logo', logoFile)
    if (bannerFile) formData.set('banner', bannerFile)
    formData.set('conteudo', JSON.stringify(conteudoParaPayload(conteudo)))
    formData.set('galeria_casa_mantida', JSON.stringify(conteudo.galeriaMantida))
    conteudo.galeriaNovas.forEach((f) => formData.append('galeria_casa', f))

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
    setConteudo((c) => ({ ...c, galeriaNovas: [] }))
    showToast({ tipo: 'sucesso', titulo: 'Vitrine publicada' })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="flex" style={{ height: '100%' }}>
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
            <PainelVitrine
              preset={preset}
              categoriaSlug={loja.categoriaSlug}
              aoEscolherEstilo={(p) => {
                setPreset(p)
                setPaleta(null)
              }}
            />
            <div className="space-y-3">
              {recomendados.map((code) => (
                <ArquetipoCard
                  key={code}
                  code={code}
                  selected={preset === code}
                  recomendado={code === sugestao.default}
                  onSelect={() => {
                    setPreset(code)
                    setPaleta(null)
                  }}
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
                      onSelect={() => {
                        setPreset(code)
                        setPaleta(null)
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </Secao>

          {/* ── PALETA DO ESTILO ─────────────────────────────── */}
          <Secao titulo="PALETA DO ESTILO">
            <p className="text-xs text-ink-3 -mt-2 mb-3">
              Variações de cor curadas para o estilo {ARQUETIPOS[preset].nome} —
              mesma forma e tipografia, outra temperatura.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <PaletaChip
                nome="Original"
                cores={[
                  ARQUETIPOS[preset].tokens.color.bg,
                  ARQUETIPOS[preset].tokens.color.accent,
                  ARQUETIPOS[preset].tokens.color.ink,
                ]}
                selecionada={paleta === null}
                onSelecionar={() => setPaleta(null)}
              />
              {PALETAS[preset].map((p) => (
                <PaletaChip
                  key={p.codigo}
                  nome={p.nome}
                  cores={[p.color.bg, p.color.accent, p.color.ink]}
                  selecionada={paleta === p.codigo}
                  onSelecionar={() => setPaleta(p.codigo)}
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

            {/* Sugestões extraídas da logo — só quando a logo tem cor de marca */}
            {coresLogo.length > 0 && (
              <div
                className="mt-3 flex items-center gap-3 px-5 py-3.5 rounded-2xl"
                style={{ border: '1px solid var(--line)', background: 'var(--bg)' }}
              >
                <p className="text-xs font-semibold text-ink-2 flex-shrink-0">
                  Da sua logo:
                </p>
                <div className="flex items-center gap-2">
                  {coresLogo.map((cor) => {
                    const ativa = accent?.toUpperCase() === cor
                    return (
                      <button
                        key={cor}
                        onClick={() => setAccent(cor)}
                        aria-label={`Usar ${cor} como cor de destaque`}
                        title={cor}
                        className="w-8 h-8 rounded-lg flex-shrink-0 transition-transform hover:scale-110"
                        style={{
                          background: cor,
                          boxShadow: ativa
                            ? '0 0 0 2px var(--bg), 0 0 0 4px var(--brick-dk)'
                            : 'inset 0 0 0 1px rgba(0,0,0,0.12)',
                        }}
                      />
                    )
                  })}
                </div>
                <p className="text-[11px] text-ink-3 min-w-0">
                  Cores encontradas na sua logo — toque para aplicar.
                </p>
              </div>
            )}
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

          {/* ── CONTEÚDO DA VITRINE ──────────────────────────── */}
          <Secao titulo="CONTEÚDO DA VITRINE">
            <ConteudoVitrine valor={conteudo} onChange={setConteudo} catalogo={catalogo} />
          </Secao>
        </div>
      </div>

      {/* ── Painel direito: a loja real em preview ─────────────── */}
      <div
        className="flex-shrink-0 flex flex-col border-l overflow-y-auto"
        style={{
          // Celular cabe em 360px; "Computador" ganha até 46% da largura.
          width: 'clamp(360px, 46vw, 720px)',
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
          <PreviewVitrine
            slug={loja.slug}
            rascunho={rascunho}
            produtoId={produtoPreviewId}
            temMidiaNaoPublicada={temMidiaNaoPublicada}
          />
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

function PaletaChip({
  nome,
  cores,
  selecionada,
  onSelecionar,
}: {
  nome: string
  /** [bg, accent, ink] — amostras exibidas no chip. */
  cores: [string, string, string]
  selecionada: boolean
  onSelecionar: () => void
}) {
  return (
    <button
      onClick={onSelecionar}
      className="flex items-center gap-2.5 pl-2.5 pr-3.5 py-2 rounded-full transition-all hover:opacity-90"
      style={{
        border: `2px solid ${selecionada ? 'var(--brick-dk)' : 'var(--line)'}`,
        background: selecionada ? 'var(--brick-lt)' : 'var(--bg)',
      }}
    >
      <span className="flex -space-x-1.5">
        {cores.map((cor, i) => (
          <span
            key={i}
            className="w-5 h-5 rounded-full"
            style={{
              background: cor,
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.10), 0 0 0 2px var(--bg)',
              zIndex: 3 - i,
            }}
          />
        ))}
      </span>
      <span
        className="text-xs font-bold"
        style={{ color: selecionada ? 'var(--brick-dk)' : 'var(--ink-2)' }}
      >
        {nome}
      </span>
    </button>
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
  const t = arq.tokens
  // Mini-tema do cartão: cores e forma vêm direto dos tokens do arquétipo.
  const template = {
    acento: t.color.accent,
    bgTela: t.color.bg,
    bgHeader: t.color.surface,
    bgCard: t.color.surface,
    linha: t.color.line,
    textoPrimario: t.color.ink,
    textoSecundario: t.color.inkMuted,
  }
  // Mini-preview (~40% do phone): raio reduzido proporcionalmente para que o
  // DNA de forma do arquétipo (sharp/soft/round) apareça já na seleção.
  const raioMini = Math.max(1, Math.round(RADIUS_STEPS_PX[t.shape.radius].md * 0.33))
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
