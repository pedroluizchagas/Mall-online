'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, Monitor, Smartphone, Store } from 'lucide-react'

import { urlPreviewDaLoja, type RascunhoPreview } from '@/lib/storefront-url'

/**
 * Preview ao vivo de Minha Loja = o STOREFRONT REAL num iframe, vestindo o
 * rascunho que o lojista está editando (tema + conteúdo), antes de publicar.
 *
 * Substitui o celular desenhado à mão que vivia aqui (um terceiro renderizador
 * da loja, com chips fictícios e "Aberto · 8h–20h" literal). Agora o que o
 * lojista vê é a mesma página que o cliente abre — inclusive a VITRINE do
 * arquétipo (Forno, Smash, Passarela…), não só as cores.
 *
 * Três molduras: celular (390px — a largura em que as vitrines foram
 * desenhadas e a mesma que o app Mallevo veste, porque as vitrines web são
 * portes 1:1 das do app), computador (coluna central de 480px sobre a pele) e
 * App Mallevo (a mesma vitrine dentro do chrome do app — status bar, voltar e
 * barra de menu —, que o storefront veste com `?app=1`; é a MESMA página, não
 * o app RN rodando).
 *
 * O rascunho vai na URL (`/preview?draft=`), com debounce, e o storefront o
 * aplica só naquele request — nada é persistido até "Publicar".
 */

type Dispositivo = 'celular' | 'computador' | 'app'
type Tela = 'inicio' | 'produto'

const MOLDURA = {
  celular: { largura: 390, altura: 800 },
  computador: { largura: 1280, altura: 800 },
  // iPhone com notch: a moldura em que o app foi desenhado.
  app: { largura: 390, altura: 844 },
} as const

const LEGENDA: Record<Dispositivo, string> = {
  celular: 'É a sua loja de verdade, vestindo o que você está editando, como abre no navegador do celular.',
  computador: 'É a sua loja de verdade, vestindo o que você está editando, como abre no computador.',
  app: 'A mesma vitrine dentro do app Mallevo, com a navegação do shopping. Os clientes chegam nela pelo app, sem endereço.',
}

export function PreviewVitrine({
  slug,
  rascunho,
  produtoId,
  temMidiaNaoPublicada,
}: {
  slug: string | null
  rascunho: RascunhoPreview
  /** Produto aberto na tela "Produto" (destaque ou primeiro do catálogo). */
  produtoId: string | null
  /** Logo/banner/fotos escolhidos e ainda não publicados (não entram no preview). */
  temMidiaNaoPublicada: boolean
}) {
  const [dispositivo, setDispositivo] = useState<Dispositivo>('celular')
  const [tela, setTela] = useState<Tela>('inicio')
  const [carregando, setCarregando] = useState(true)

  // URL alvo muda a cada tecla; o iframe só recarrega depois de 600ms parado.
  const srcAlvo = useMemo(
    () =>
      slug
        ? urlPreviewDaLoja(slug, rascunho, {
            produtoId: tela === 'produto' ? produtoId : null,
            app: dispositivo === 'app',
          })
        : null,
    [slug, rascunho, tela, produtoId, dispositivo],
  )
  const [src, setSrc] = useState<string | null>(srcAlvo)
  useEffect(() => {
    if (srcAlvo === src) return
    const id = setTimeout(() => {
      setCarregando(true)
      setSrc(srcAlvo)
    }, 600)
    return () => clearTimeout(id)
  }, [srcAlvo, src])
  // A troca de endereço vai pelo REF, não por `key`/prop: remontar o iframe a
  // cada debounce destruía a vitrine e piscava branco a cada tecla. Agora o
  // mesmo elemento navega e o "Atualizando…" some no `load`.
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const srcInicial = useRef<string | null>(srcAlvo)
  useEffect(() => {
    const el = iframeRef.current
    if (!el || !src) return
    if (el.getAttribute('src') === src) return
    el.setAttribute('src', src)
  }, [src])

  // Escala a moldura para caber na largura que o painel oferece (medida, não
  // imposta): o celular não passa de 340px; o computador usa tudo que houver.
  const areaRef = useRef<HTMLDivElement>(null)
  const [larguraDisponivel, setLarguraDisponivel] = useState(320)
  useEffect(() => {
    const el = areaRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const obs = new ResizeObserver(([entrada]) => {
      const w = Math.floor(entrada.contentRect.width)
      if (w > 0) setLarguraDisponivel(w)
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  const ehTelefone = dispositivo !== 'computador'
  const larguraPainel = ehTelefone ? Math.min(340, larguraDisponivel) : larguraDisponivel
  const { largura, altura } = MOLDURA[dispositivo]
  const escala = larguraPainel / largura
  const alturaEscalada = Math.round(altura * escala)

  return (
    <div ref={areaRef} className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--bg-3)' }}>
          {(
            [
              ['celular', 'Celular', Smartphone],
              ['computador', 'Computador', Monitor],
              ['app', 'App Mallevo', Store],
            ] as const
          ).map(([valor, rotulo, Icone]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setDispositivo(valor)}
              className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[11px] font-semibold transition-all"
              style={{
                background: dispositivo === valor ? 'var(--bg)' : 'transparent',
                color: dispositivo === valor ? 'var(--ink)' : 'var(--ink-3)',
                boxShadow: dispositivo === valor ? 'var(--shadow-sm)' : 'none',
              }}
            >
              <Icone size={13} />
              {rotulo}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--bg-3)' }}>
          {(
            [
              ['inicio', 'Início'],
              ['produto', 'Produto'],
            ] as const
          ).map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setTela(valor)}
              disabled={valor === 'produto' && !produtoId}
              className="rounded-[10px] px-3 py-1.5 text-[11px] font-semibold transition-all disabled:opacity-40"
              style={{
                background: tela === valor ? 'var(--bg)' : 'transparent',
                color: tela === valor ? 'var(--ink)' : 'var(--ink-3)',
                boxShadow: tela === valor ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>

      {!slug ? (
        <div
          className="rounded-2xl p-6 text-center text-sm"
          style={{ background: 'var(--bg)', border: '1px dashed var(--line)', color: 'var(--ink-2)' }}
        >
          Defina o endereço da loja em{' '}
          <a href="/configuracoes?aba=identificacao" className="font-semibold underline">
            Configurações › Identificação
          </a>{' '}
          para ver o preview.
        </div>
      ) : (
        <div className="relative mx-auto" style={{ width: larguraPainel }}>
          <div
            className={
              ehTelefone
                ? 'relative overflow-hidden rounded-[40px] border-[10px] shadow-xl'
                : 'relative overflow-hidden rounded-xl border-[6px] shadow-xl'
            }
            style={{
              borderColor: 'var(--ink)',
              background: 'var(--bg)',
              width: larguraPainel,
              height: alturaEscalada,
            }}
          >
            {ehTelefone && (
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-2 z-10 h-[18px] w-[92px] -translate-x-1/2 rounded-full"
                style={{ background: 'var(--ink)' }}
              />
            )}
            {src && (
              <iframe
                ref={iframeRef}
                src={srcInicial.current ?? undefined}
                title="Preview da loja"
                onLoad={() => setCarregando(false)}
                className="absolute left-0 top-0 origin-top-left border-0"
                style={{ width: largura, height: altura, transform: `scale(${escala})` }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            )}
            {carregando && (
              <div
                role="status"
                className="pointer-events-none absolute left-1/2 top-8 z-20 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-semibold shadow-md"
                style={{ background: 'var(--ink)', color: 'var(--bg)' }}
              >
                Atualizando…
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-1.5 text-center text-[11px] leading-snug" style={{ color: 'var(--ink-3)' }}>
        <p>{LEGENDA[dispositivo]}</p>
        {temMidiaNaoPublicada && (
          <p style={{ color: 'var(--warn)' }}>Logo, banner e fotos novas aparecem depois de publicar.</p>
        )}
        {slug && src && (
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold hover:underline"
            style={{ color: 'var(--ink-2)' }}
          >
            Abrir o preview em nova aba <ExternalLink size={11} />
          </a>
        )}
      </div>
    </div>
  )
}
