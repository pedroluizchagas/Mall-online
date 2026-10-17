'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import {
  ARQUETIPOS,
  PALETAS,
  getArquetipoSugestao,
  getOpcoesDeVitrine,
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
import { EscolhaVitrine, type CategoriaDaLoja } from '@/components/dashboard/escolha-vitrine'
import type { RascunhoPreview } from '@/lib/storefront-url'
import { PartnerIcon } from '@/components/ui/partner-icon'
import { cx } from '@/lib/cx'

export interface LojaEditorInicial {
  nome: string
  descricao: string | null
  logo_url: string | null
  banner_url: string | null
  /** `stores.theme` cru (StoreThemeConfig v2 ou legado v1). */
  theme: Record<string, unknown> | null
  ativo: boolean
  slug: string | null
  /** Categoria (nicho) — decide as vitrines próprias e sugere o arquétipo. */
  categoria: CategoriaDaLoja | null
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
  const categoriaSlug = loja.categoria?.slug ?? null
  const presetPublicado: ArquetipoCodigo | null =
    loja.theme && typeof loja.theme.preset === 'string' && loja.theme.preset in ARQUETIPOS
      ? (loja.theme.preset as ArquetipoCodigo)
      : null
  const presetInicial: ArquetipoCodigo =
    presetPublicado ?? getOpcoesDeVitrine(categoriaSlug).recomendado ?? getArquetipoSugestao(categoriaSlug).default
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
  // Abaixo de 1280px editor e vitrine não cabem lado a lado: viram abas.
  const [painel, setPainel] = useState<'editar' | 'vitrine'>('editar')

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
      categoria: categoriaSlug,
    }),
    [preset, paleta, accent, conteudo, categoriaSlug],
  )
  const produtoPreviewId = conteudo.destaques[0] ?? catalogo[0]?.id ?? null
  const temMidiaNaoPublicada = Boolean(logoFile || bannerFile || conteudo.galeriaNovas.length > 0)
  const produtosComFoto = catalogo.filter((p) => p.foto_url).length

  function escolherEstilo(codigo: ArquetipoCodigo) {
    setPreset(codigo)
    setPaleta(null)
  }

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

  const botaoPublicar = (className?: string) => (
    <button
      onClick={handlePublicar}
      disabled={saving}
      className={cx(
        'items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-60',
        className,
      )}
      style={{
        background: saved ? 'var(--ok)' : 'var(--brick)',
        color: saved ? '#fff' : 'var(--brick-ink)',
      }}
    >
      <PartnerIcon name="send" size={12} />
      {saving ? (
        'Publicando…'
      ) : saved ? (
        'Publicado!'
      ) : (
        <>
          Publicar<span className="hidden sm:inline"> alterações</span>
        </>
      )}
    </button>
  )

  return (
    <div className="flex flex-col xl:flex-row">
      {/* ── Abas (abaixo de 1280px): editor OU vitrine, publicar sempre à mão ── */}
      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-canvas/90 px-4 py-2.5 backdrop-blur-md sm:px-6 xl:hidden">
        <div className="flex gap-1 rounded-full bg-bg p-1 ring-1 ring-inset ring-line">
          {(
            [
              ['editar', 'Editar', 'edit'],
              ['vitrine', 'Ver vitrine', 'eye'],
            ] as const
          ).map(([valor, rotulo, icone]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setPainel(valor)}
              aria-pressed={painel === valor}
              className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[12px] font-semibold transition-colors"
              style={{
                background: painel === valor ? 'var(--ink)' : 'transparent',
                color: painel === valor ? 'var(--bg)' : 'var(--ink-2)',
              }}
            >
              <PartnerIcon name={icone} size={14} strokeWidth={2} />
              {rotulo}
            </button>
          ))}
        </div>
        {botaoPublicar('inline-flex shrink-0 whitespace-nowrap py-2')}
      </div>

      {/* ── Painel esquerdo (editor) ──────────────────────────────── */}
      <div className={cx('min-w-0 flex-1', painel === 'vitrine' && 'hidden xl:block')}>
        <div className="max-w-[720px] px-5 py-7 sm:p-9">
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
                {botaoPublicar('hidden xl:inline-flex')}
              </>
            }
          />

          {/* ── VITRINE E ESTILO ─────────────────────────────── */}
          <Secao titulo="VITRINE E ESTILO">
            <p className="text-xs text-ink-3 -mt-2 mb-3">
              A vitrine é o layout da loja; o estilo, as cores e a tipografia. Escolha
              pelo que combina com o tom da sua marca — dá para mudar quando quiser.
            </p>
            <EscolhaVitrine
              preset={preset}
              presetPublicado={presetPublicado}
              categoria={loja.categoria}
              produtosComFoto={produtosComFoto}
              aoEscolher={escolherEstilo}
            />
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
                      <PartnerIcon name="upload" size={20} className="text-ink-3" />
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
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus-visible:outline-none transition-colors"
                    style={{
                      border: '1px solid var(--line-2)',
                      background: 'var(--bg)',
                      color: 'var(--ink)',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--ink)')}
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
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus-visible:outline-none transition-colors"
                    style={{
                      border: '1px solid var(--line-2)',
                      background: 'var(--bg)',
                      color: 'var(--ink)',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--ink)')}
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
                            ? '0 0 0 2px var(--bg), 0 0 0 4px var(--ink)'
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
                <PartnerIcon name="lock" size={12} />
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
                    <PartnerIcon name="image-plus" size={20} className="text-ink-3" />
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
      {/* Do lado do editor a partir de 1280px (celular cabe em 400px;
          "Computador" ganha até 40% da largura); abaixo, é a aba "Ver vitrine". */}
      <div
        className={cx(
          'flex-col xl:sticky xl:top-0 xl:flex xl:max-h-[calc(100dvh-24px)] xl:w-[clamp(400px,40vw,720px)] xl:shrink-0 xl:self-start xl:overflow-y-auto xl:border-l xl:border-line xl:bg-bg-2',
          painel === 'vitrine' ? 'flex' : 'hidden',
        )}
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
        border: `2px solid ${selecionada ? 'var(--ink)' : 'var(--line)'}`,
        background: 'var(--bg)',
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
        style={{ color: selecionada ? 'var(--ink)' : 'var(--ink-2)' }}
      >
        {nome}
      </span>
    </button>
  )
}
