'use client'

import { useEffect, useMemo, useState } from 'react'
import { ImagePlus, Search, X } from 'lucide-react'
import { CONTEUDO_LIMITES, type StoreConteudo } from '@mallevo/lib'

/**
 * Seção "Conteúdo da vitrine" do editor de Minha Loja — a VOZ da loja que as
 * vitrines do app e do storefront leem de `stores.conteudo` (v1, @mallevo/lib):
 * campanha do hero, manifesto da casa, fotos do espaço e destaques escolhidos.
 * Antes disto, esses textos eram literais dentro dos componentes ("Nova
 * coleção", "DEU FOME? PEDE. CHEGOU.") e os destaques eram os 3 primeiros
 * produtos por `ordem`.
 *
 * Controlado pelo pai (o editor monta o FormData no "Publicar"): texto vai em
 * `conteudo` (JSON), fotos novas em `galeria_casa` (arquivos) e as mantidas em
 * `galeria_casa_mantida` (JSON).
 */

export interface ConteudoEditavel {
  campanha: { eyebrow: string; titulo: string; subtitulo: string; cta: string }
  manifesto: string
  destaques: string[]
  galeriaMantida: string[]
  galeriaNovas: File[]
}

export function conteudoInicial(raw: StoreConteudo): ConteudoEditavel {
  return {
    campanha: {
      eyebrow: raw.campanha?.eyebrow ?? '',
      titulo: raw.campanha?.titulo ?? '',
      subtitulo: raw.campanha?.subtitulo ?? '',
      cta: raw.campanha?.cta ?? '',
    },
    manifesto: raw.manifesto ?? '',
    destaques: raw.destaques ?? [],
    galeriaMantida: raw.galeria_casa ?? [],
    galeriaNovas: [],
  }
}

/** O JSON que vai no FormData (`conteudo`) — só texto; fotos são resolvidas no servidor. */
export function conteudoParaPayload(c: ConteudoEditavel) {
  const t = (s: string) => s.trim()
  const campanha = t(c.campanha.titulo)
    ? {
        titulo: t(c.campanha.titulo),
        ...(t(c.campanha.eyebrow) ? { eyebrow: t(c.campanha.eyebrow) } : {}),
        ...(t(c.campanha.subtitulo) ? { subtitulo: t(c.campanha.subtitulo) } : {}),
        ...(t(c.campanha.cta) ? { cta: t(c.campanha.cta) } : {}),
      }
    : undefined
  return {
    v: 1 as const,
    ...(campanha ? { campanha } : {}),
    ...(t(c.manifesto) ? { manifesto: t(c.manifesto) } : {}),
    ...(c.destaques.length > 0 ? { destaques: c.destaques } : {}),
  }
}

export interface ProdutoParaDestaque {
  id: string
  nome: string
  foto_url: string | null
}

const inputClass =
  'w-full px-3 py-2 text-sm text-ink bg-bg rounded-xl border focus:outline-none focus:ring-2 focus:ring-brick transition-shadow'
const TAMANHO_MAX = 5 * 1024 * 1024

export function ConteudoVitrine({
  valor,
  onChange,
  catalogo,
}: {
  valor: ConteudoEditavel
  onChange: (v: ConteudoEditavel) => void
  catalogo: ProdutoParaDestaque[]
}) {
  const [busca, setBusca] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)

  const previews = useMemo(() => valor.galeriaNovas.map((f) => URL.createObjectURL(f)), [valor.galeriaNovas])
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews])

  const porId = useMemo(() => new Map(catalogo.map((p) => [p.id, p])), [catalogo])
  const candidatos = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return catalogo
      .filter((p) => !valor.destaques.includes(p.id))
      .filter((p) => !q || p.nome.toLowerCase().includes(q))
      .slice(0, 8)
  }, [busca, catalogo, valor.destaques])

  const totalFotos = valor.galeriaMantida.length + valor.galeriaNovas.length
  const set = (parcial: Partial<ConteudoEditavel>) => onChange({ ...valor, ...parcial })
  const setCampanha = (campo: keyof ConteudoEditavel['campanha'], texto: string) =>
    set({ campanha: { ...valor.campanha, [campo]: texto } })

  function escolherFotos(lista: FileList | null) {
    if (!lista) return
    const ok: File[] = []
    let recusados = 0
    for (const f of Array.from(lista)) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type) || f.size > TAMANHO_MAX) { recusados++; continue }
      ok.push(f)
    }
    const espaco = Math.max(0, CONTEUDO_LIMITES.galeriaCasa - totalFotos)
    set({ galeriaNovas: [...valor.galeriaNovas, ...ok.slice(0, espaco)] })
    setAviso(
      recusados ? `${recusados} arquivo(s) ignorado(s): JPEG, PNG ou WebP até 5MB.` :
      ok.length > espaco ? `Até ${CONTEUDO_LIMITES.galeriaCasa} fotos da casa.` : null,
    )
  }

  const contador = (atual: number, max: number) => (
    <span className="text-[10px] tabular-nums" style={{ color: atual > max ? 'var(--err)' : 'var(--ink-3)' }}>
      {atual}/{max}
    </span>
  )

  return (
    <div className="space-y-6">
      <p className="text-xs text-ink-3 -mt-2">
        A voz da sua vitrine. Cada estilo usa esses textos do seu jeito: como manchete do topo,
        statement da casa ou palavra do pôster. Tudo opcional — sem texto, a vitrine usa o nome e a
        descrição da loja.
      </p>

      {/* ── Campanha ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-ink">Campanha do topo</p>
        <Campo rotulo="Sobrelinha" sufixo={contador(valor.campanha.eyebrow.length, CONTEUDO_LIMITES.eyebrow)}>
          <input value={valor.campanha.eyebrow} onChange={(e) => setCampanha('eyebrow', e.target.value)} maxLength={CONTEUDO_LIMITES.eyebrow} placeholder="Nova coleção · Só hoje · Fresquinho" className={inputClass} style={{ borderColor: 'var(--line)' }} />
        </Campo>
        <Campo rotulo="Título" sufixo={contador(valor.campanha.titulo.length, CONTEUDO_LIMITES.titulo)}>
          <input value={valor.campanha.titulo} onChange={(e) => setCampanha('titulo', e.target.value)} maxLength={CONTEUDO_LIMITES.titulo} placeholder="A manchete da sua vitrine" className={inputClass} style={{ borderColor: 'var(--line)' }} />
        </Campo>
        <Campo rotulo="Subtítulo" sufixo={contador(valor.campanha.subtitulo.length, CONTEUDO_LIMITES.subtitulo)}>
          <input value={valor.campanha.subtitulo} onChange={(e) => setCampanha('subtitulo', e.target.value)} maxLength={CONTEUDO_LIMITES.subtitulo} placeholder="Uma linha de apoio" className={inputClass} style={{ borderColor: 'var(--line)' }} />
        </Campo>
        <Campo rotulo="Botão" sufixo={contador(valor.campanha.cta.length, CONTEUDO_LIMITES.cta)}>
          <input value={valor.campanha.cta} onChange={(e) => setCampanha('cta', e.target.value)} maxLength={CONTEUDO_LIMITES.cta} placeholder="Ver cardápio" className={inputClass} style={{ borderColor: 'var(--line)' }} />
        </Campo>
      </div>

      {/* ── Manifesto ────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold text-ink">Texto da casa</p>
          {contador(valor.manifesto.length, CONTEUDO_LIMITES.manifesto)}
        </div>
        <textarea
          value={valor.manifesto}
          onChange={(e) => set({ manifesto: e.target.value })}
          maxLength={CONTEUDO_LIMITES.manifesto}
          rows={4}
          placeholder="Quem vocês são, como fazem, por que vale a visita. A primeira frase pode virar o statement da vitrine."
          className={`${inputClass} resize-y`}
          style={{ borderColor: 'var(--line)' }}
        />
      </div>

      {/* ── Destaques ────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold text-ink">Destaques</p>
          {contador(valor.destaques.length, CONTEUDO_LIMITES.destaques)}
        </div>
        <p className="text-xs text-ink-3">Os produtos que abrem a vitrine, na ordem que você escolher.</p>
        {valor.destaques.length > 0 && (
          <ol className="space-y-1.5">
            {valor.destaques.map((id, i) => {
              const p = porId.get(id)
              return (
                <li key={id} className="flex items-center gap-2 rounded-xl px-2 py-1.5" style={{ background: 'var(--bg-2)' }}>
                  <span className="w-5 text-center text-[11px] font-bold text-ink-3">{i + 1}</span>
                  <MiniFoto src={p?.foto_url ?? null} />
                  <span className="flex-1 truncate text-sm text-ink">{p?.nome ?? 'Produto removido'}</span>
                  <button type="button" aria-label="Subir" disabled={i === 0} onClick={() => set({ destaques: mover(valor.destaques, i, i - 1) })} className="px-1.5 text-xs text-ink-3 hover:text-ink disabled:opacity-30">↑</button>
                  <button type="button" aria-label="Descer" disabled={i === valor.destaques.length - 1} onClick={() => set({ destaques: mover(valor.destaques, i, i + 1) })} className="px-1.5 text-xs text-ink-3 hover:text-ink disabled:opacity-30">↓</button>
                  <button type="button" aria-label="Remover destaque" onClick={() => set({ destaques: valor.destaques.filter((d) => d !== id) })} className="p-1 text-ink-3 hover:text-ink"><X size={13} /></button>
                </li>
              )
            })}
          </ol>
        )}
        {valor.destaques.length < CONTEUDO_LIMITES.destaques && (
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto para destacar…" className={`${inputClass} pl-9`} style={{ borderColor: 'var(--line)' }} />
            {(busca || candidatos.length > 0) && (
              <ul className="mt-1.5 max-h-56 overflow-y-auto rounded-xl" style={{ border: '1px solid var(--line)', background: 'var(--bg)' }}>
                {candidatos.length === 0 ? (
                  <li className="px-3 py-2 text-xs text-ink-3">Nenhum produto encontrado.</li>
                ) : candidatos.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => { set({ destaques: [...valor.destaques, p.id] }); setBusca('') }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-bg-2">
                      <MiniFoto src={p.foto_url} />
                      <span className="truncate">{p.nome}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* ── Fotos da casa ────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold text-ink">Fotos da casa</p>
          {contador(totalFotos, CONTEUDO_LIMITES.galeriaCasa)}
        </div>
        <p className="text-xs text-ink-3">O espaço, a equipe, o balcão. Entram no hero e no fecho de algumas vitrines.</p>
        <div className="flex flex-wrap gap-2">
          {valor.galeriaMantida.map((url) => (
            <Miniatura key={url} src={url} aoRemover={() => set({ galeriaMantida: valor.galeriaMantida.filter((u) => u !== url) })} />
          ))}
          {previews.map((src, i) => (
            <Miniatura key={src} src={src} nova aoRemover={() => set({ galeriaNovas: valor.galeriaNovas.filter((_, idx) => idx !== i) })} />
          ))}
          {totalFotos < CONTEUDO_LIMITES.galeriaCasa && (
            <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl text-ink-3 hover:text-ink" style={{ border: '1px dashed var(--line)' }}>
              <ImagePlus size={18} />
              <span className="text-[10px] font-semibold">Adicionar</span>
              <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { escolherFotos(e.target.files); e.target.value = '' }} />
            </label>
          )}
        </div>
      </div>

      {aviso && <p role="status" className="text-xs" style={{ color: 'var(--warn)' }}>{aviso}</p>}
    </div>
  )
}

function mover<T>(lista: T[], de: number, para: number): T[] {
  const copia = [...lista]
  const [item] = copia.splice(de, 1)
  copia.splice(para, 0, item)
  return copia
}

function Campo({ rotulo, sufixo, children }: { rotulo: string; sufixo?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <label className="text-xs font-medium text-ink-2">{rotulo}</label>
        {sufixo}
      </div>
      {children}
    </div>
  )
}

function MiniFoto({ src }: { src: string | null }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="h-7 w-7 shrink-0 rounded-md object-cover" />
  ) : (
    <span className="h-7 w-7 shrink-0 rounded-md" style={{ background: 'var(--bg-3)' }} />
  )
}

function Miniatura({ src, nova, aoRemover }: { src: string; nova?: boolean; aoRemover: () => void }) {
  return (
    <div className="relative h-20 w-20">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full rounded-xl object-cover" />
      {nova && (
        <span className="absolute bottom-1 left-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase" style={{ background: 'var(--brick)', color: '#111' }}>nova</span>
      )}
      <button type="button" aria-label="Remover foto" onClick={aoRemover} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ background: 'var(--ink)' }}>
        <X size={11} />
      </button>
    </div>
  )
}
