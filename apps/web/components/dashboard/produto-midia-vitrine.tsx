'use client'

import { useEffect, useMemo, useState } from 'react'
import { ImagePlus, Plus, Trash2, X } from 'lucide-react'
import { UNIDADES_VENDA } from '@mallevo/lib'

/**
 * Bloco "Mídia e vitrine" do formulário de produto — o que as vitrines do
 * app e do storefront leem de `products.metadata` e que, até aqui, nenhum
 * formulário gravava (só o mock do consumer produzia):
 *
 * - `galeria`: fotos extras do PDP (a primeira dá lugar ao `foto_url`);
 * - `recorte`: PNG de fundo transparente — o "produto solto" da Torra, Smash,
 *   Horta e Ritual;
 * - `especificacoes`: ficha técnica em pares rótulo/valor (Artesã, Feira);
 * - `unidade`: unidade de venda ao lado do preço ("R$ 8,90 /kg", Feira).
 *
 * Arquivos vão nos inputs `galeria` (múltiplo) e `recorte`; as fotos já
 * gravadas que o lojista MANTÉM vão em `galeria_mantida` (JSON) e a remoção
 * do recorte em `remover_recorte`. `especificacoes` e `unidade` seguem pelo
 * `metadata` JSON do formulário (estado controlado pelo pai).
 */

export interface VitrineProduto {
  galeriaMantida: string[]
  especificacoes: [string, string][]
  unidade: string
  removerRecorte: boolean
}

export const LIMITE_GALERIA = 10
export const LIMITE_ESPECIFICACOES = 12
const TAMANHO_MAX_BYTES = 5 * 1024 * 1024

const inputClass =
  'w-full px-3 py-2 text-sm text-ink bg-bg rounded-xl border focus:outline-none focus:ring-2 focus:ring-brick transition-shadow'

/** Gate por nicho — `DashboardTemplate.produto.midia` (@mallevo/lib). */
export interface MidiaFlags {
  galeria: boolean
  recorte: boolean
  especificacoes: boolean
  unidade: boolean
}

export function MidiaVitrine({
  valor,
  onChange,
  recorteAtual,
  midia,
}: {
  valor: VitrineProduto
  onChange: (v: VitrineProduto) => void
  recorteAtual: string | null
  midia: MidiaFlags
}) {
  const [novas, setNovas] = useState<File[]>([])
  const [novoRecorte, setNovoRecorte] = useState<File | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  // Pré-visualizações locais (object URLs), revogadas ao trocar.
  const previews = useMemo(() => novas.map((f) => URL.createObjectURL(f)), [novas])
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews])
  const previewRecorte = useMemo(
    () => (novoRecorte ? URL.createObjectURL(novoRecorte) : null),
    [novoRecorte],
  )
  useEffect(() => () => { if (previewRecorte) URL.revokeObjectURL(previewRecorte) }, [previewRecorte])

  const total = valor.galeriaMantida.length + novas.length

  function escolherGaleria(lista: FileList | null) {
    if (!lista) return
    const aceitos: File[] = []
    let recusados = 0
    for (const f of Array.from(lista)) {
      const tipoOk = ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
      if (!tipoOk || f.size > TAMANHO_MAX_BYTES) { recusados++; continue }
      aceitos.push(f)
    }
    const espaco = Math.max(0, LIMITE_GALERIA - total)
    const cabem = aceitos.slice(0, espaco)
    setNovas((atual) => [...atual, ...cabem])
    setAviso(
      recusados > 0
        ? `${recusados} arquivo(s) ignorado(s): use JPEG, PNG ou WebP até 5MB.`
        : aceitos.length > cabem.length
          ? `A galeria aceita até ${LIMITE_GALERIA} fotos.`
          : null,
    )
  }

  function escolherRecorte(lista: FileList | null) {
    const f = lista?.[0] ?? null
    if (!f) return
    if (!['image/png', 'image/webp'].includes(f.type) || f.size > TAMANHO_MAX_BYTES) {
      setAviso('O recorte precisa ser PNG ou WebP com fundo transparente, até 5MB.')
      return
    }
    setNovoRecorte(f)
    onChange({ ...valor, removerRecorte: false })
  }

  function atualizarEspec(i: number, campo: 0 | 1, texto: string) {
    const lista = valor.especificacoes.map((par, idx) =>
      idx === i ? ((campo === 0 ? [texto, par[1]] : [par[0], texto]) as [string, string]) : par,
    )
    onChange({ ...valor, especificacoes: lista })
  }

  return (
    <div
      className="rounded-xl p-4 space-y-5"
      style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
    >
      <div>
        <p className="text-sm font-semibold text-ink">Mídia e vitrine</p>
        <p className="text-xs text-ink-3">
          O que a vitrine da sua loja mostra além da foto principal. Tudo opcional.
        </p>
      </div>

      {/* ── Galeria ─────────────────────────────────────────── */}
      {midia.galeria && (
      <div role="group" aria-labelledby="midia-galeria-rotulo">
        <p id="midia-galeria-rotulo" className="block text-sm font-medium text-ink-2 mb-1">
          Galeria de fotos
        </p>
        <p className="text-xs text-ink-3 mb-2">
          Fotos extras que o cliente desliza no detalhe do produto. Até {LIMITE_GALERIA}.
        </p>
        <div className="flex flex-wrap gap-2">
          {valor.galeriaMantida.map((url) => (
            <Miniatura
              key={url}
              src={url}
              aoRemover={() =>
                onChange({ ...valor, galeriaMantida: valor.galeriaMantida.filter((u) => u !== url) })
              }
            />
          ))}
          {previews.map((src, i) => (
            <Miniatura
              key={src}
              src={src}
              nova
              aoRemover={() => setNovas((atual) => atual.filter((_, idx) => idx !== i))}
            />
          ))}
          {total < LIMITE_GALERIA && (
            <label
              className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl text-ink-3 hover:text-ink"
              style={{ border: '1px dashed var(--line)' }}
            >
              <ImagePlus size={18} />
              <span className="text-[10px] font-semibold">Adicionar</span>
              <input
                id="midia-galeria-arquivos"
                type="file"
                name="galeria"
                multiple
                accept="image/jpeg,image/png,image/webp"
                aria-label="Adicionar fotos à galeria"
                className="sr-only"
                onChange={(e) => escolherGaleria(e.target.files)}
              />
            </label>
          )}
        </div>
        <input type="hidden" name="galeria_mantida" value={JSON.stringify(valor.galeriaMantida)} />
      </div>
      )}

      {/* ── Recorte ─────────────────────────────────────────── */}
      {midia.recorte && (
      <div role="group" aria-labelledby="midia-recorte-rotulo">
        <p id="midia-recorte-rotulo" className="block text-sm font-medium text-ink-2 mb-1">
          Recorte sem fundo
        </p>
        <p className="text-xs text-ink-3 mb-2">
          PNG com fundo transparente. Algumas vitrines mostram o produto "solto" sobre a cor da casa.
        </p>
        <div className="flex items-center gap-3">
          {(previewRecorte || (recorteAtual && !valor.removerRecorte)) && (
            <div
              className="relative h-20 w-20 rounded-xl"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, var(--line) 25%, transparent 25%, transparent 75%, var(--line) 75%), linear-gradient(45deg, var(--line) 25%, transparent 25%, transparent 75%, var(--line) 75%)',
                backgroundSize: '12px 12px',
                backgroundPosition: '0 0, 6px 6px',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewRecorte ?? recorteAtual ?? ''}
                alt=""
                className="h-full w-full rounded-xl object-contain"
              />
              <button
                type="button"
                aria-label="Remover recorte"
                onClick={() => {
                  setNovoRecorte(null)
                  onChange({ ...valor, removerRecorte: true })
                }}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full"
                style={{ background: 'var(--ink)', color: 'var(--bg)' }}
              >
                <X size={11} />
              </button>
            </div>
          )}
          <label
            className="inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-ink hover:bg-bg"
            style={{ border: '1px solid var(--line)' }}
          >
            <ImagePlus size={14} />
            {recorteAtual || novoRecorte ? 'Trocar recorte' : 'Enviar recorte'}
            <input
              id="midia-recorte-arquivo"
              type="file"
              name="recorte"
              accept="image/png,image/webp"
              aria-label={recorteAtual || novoRecorte ? 'Trocar o recorte sem fundo' : 'Enviar um recorte sem fundo'}
              className="sr-only"
              onChange={(e) => escolherRecorte(e.target.files)}
            />
          </label>
        </div>
        <input type="hidden" name="remover_recorte" value={valor.removerRecorte ? 'true' : 'false'} />
      </div>
      )}

      {/* ── Especificações ───────────────────────────────────── */}
      {midia.especificacoes && (
      <div role="group" aria-labelledby="midia-ficha-rotulo">
        <p id="midia-ficha-rotulo" className="block text-sm font-medium text-ink-2 mb-1">
          Ficha técnica
        </p>
        <p className="text-xs text-ink-3 mb-2">
          Pares rótulo e valor — Material, Dimensões, Origem, Peso… Até {LIMITE_ESPECIFICACOES}.
        </p>
        <div className="space-y-2">
          {valor.especificacoes.map((par, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={par[0]}
                onChange={(e) => atualizarEspec(i, 0, e.target.value)}
                placeholder="Rótulo"
                aria-label={`Rótulo da linha ${i + 1} da ficha técnica`}
                maxLength={40}
                className={`${inputClass} basis-2/5`}
                style={{ borderColor: 'var(--line)' }}
              />
              <input
                value={par[1]}
                onChange={(e) => atualizarEspec(i, 1, e.target.value)}
                placeholder="Valor"
                aria-label={`Valor da linha ${i + 1} da ficha técnica`}
                maxLength={120}
                className={`${inputClass} flex-1`}
                style={{ borderColor: 'var(--line)' }}
              />
              <button
                type="button"
                aria-label="Remover linha"
                onClick={() =>
                  onChange({ ...valor, especificacoes: valor.especificacoes.filter((_, idx) => idx !== i) })
                }
                className="p-2 text-ink-3 hover:text-ink"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {valor.especificacoes.length < LIMITE_ESPECIFICACOES && (
            <button
              type="button"
              onClick={() => onChange({ ...valor, especificacoes: [...valor.especificacoes, ['', '']] })}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-2 hover:text-ink"
            >
              <Plus size={14} /> Adicionar linha
            </button>
          )}
        </div>
      </div>
      )}

      {/* ── Unidade ─────────────────────────────────────────── */}
      {midia.unidade && (
        <div>
          <label htmlFor="midia-unidade" className="block text-sm font-medium text-ink-2 mb-1">
            Unidade de venda
          </label>
          <p className="text-xs text-ink-3 mb-2">Aparece ao lado do preço ("R$ 8,90 /kg").</p>
          <select
            id="midia-unidade"
            value={valor.unidade}
            onChange={(e) => onChange({ ...valor, unidade: e.target.value })}
            className={inputClass}
            style={{ borderColor: 'var(--line)' }}
          >
            <option value="">Sem unidade</option>
            {UNIDADES_VENDA.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      )}

      {aviso && (
        <p role="status" className="text-xs" style={{ color: 'var(--warn)' }}>
          {aviso}
        </p>
      )}
    </div>
  )
}

function Miniatura({ src, nova, aoRemover }: { src: string; nova?: boolean; aoRemover: () => void }) {
  return (
    <div className="relative h-20 w-20">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full rounded-xl object-cover" />
      {nova && (
        <span
          className="absolute bottom-1 left-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
          style={{ background: 'var(--brick)', color: 'var(--brick-ink, #111)' }}
        >
          nova
        </span>
      )}
      <button
        type="button"
        aria-label="Remover foto"
        onClick={aoRemover}
        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full"
        style={{ background: 'var(--ink)', color: 'var(--bg)' }}
      >
        <X size={11} />
      </button>
    </div>
  )
}
