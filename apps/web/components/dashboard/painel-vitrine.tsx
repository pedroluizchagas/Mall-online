import { VITRINES, getVitrineDoArquetipo, resolveVitrine, type ArquetipoCodigo } from '@mallevo/lib'
import { ARQUETIPOS } from '@mallevo/lib'
import { PartnerIcon } from '@/components/ui/partner-icon'

/**
 * "Sua vitrine": o que o estilo escolhido ATIVA de layout na categoria da loja,
 * pela mesma tabela VITRINES que o app e o storefront leem. Quando o estilo
 * não tem vitrine nesta categoria, mostra quais estilos têm — a decisão fica
 * informada, não escondida.
 */
export function PainelVitrine({
  preset,
  categoriaSlug,
  aoEscolherEstilo,
}: {
  preset: ArquetipoCodigo
  categoriaSlug: string | null
  aoEscolherEstilo?: (preset: ArquetipoCodigo) => void
}) {
  const ativa = resolveVitrine(preset, categoriaSlug)
  const doEstilo = getVitrineDoArquetipo(preset)
  const humanizar = (slug: string) => slug.replace(/-/g, ' ')
  const comVitrineAqui = categoriaSlug
    ? Object.values(VITRINES).filter((v) => (v.categorias as readonly string[]).includes(categoriaSlug))
    : []

  if (ativa) {
    const v = VITRINES[ativa]
    return (
      <div className="cartao mb-5 flex gap-4 p-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-marquee text-[color:var(--brick)]">
          <PartnerIcon name="check" size={17} strokeWidth={2.6} />
        </span>
        <div className="min-w-0">
          <p className="micro text-ink-3">Sua vitrine</p>
          <p className="mt-1.5 text-[16px] font-semibold tracking-[-0.015em] text-ink">Vitrine {v.nome} ativada</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
            {v.descricao} É o layout que sua loja veste no app Mallevo e no site — veja ao lado.
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-3">
            Ela usa a campanha, o texto da casa, os destaques e as fotos da casa da seção “Conteúdo da vitrine”;
            produtos com recorte sem fundo ganham destaque.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="cartao mb-5 p-5 text-ink-2">
      <p className="micro text-ink-3">Sua vitrine</p>
      <p className="mt-1.5 text-[16px] font-semibold tracking-[-0.015em] text-ink">Layout padrão</p>
      <p className="mt-1 text-[13px] leading-relaxed">
        {doEstilo
          ? `O estilo ${ARQUETIPOS[preset].nome} tem a vitrine ${doEstilo.nome} em ${doEstilo.categorias
              .map(humanizar)
              .join(', ')}. Na sua categoria, ele veste a loja com as cores, a tipografia e a forma sobre o layout padrão.`
          : `O estilo ${ARQUETIPOS[preset].nome} veste a loja com cores, tipografia e forma sobre o layout padrão.`}
      </p>
      {comVitrineAqui.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold" style={{ color: 'var(--ink)' }}>
            Estilos com vitrine própria para a sua categoria
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {comVitrineAqui.map((v) => (
              <button
                key={v.codigo}
                type="button"
                onClick={() => aoEscolherEstilo?.(v.arquetipo)}
                className="rounded-full px-3 py-1 text-[11px] font-semibold transition-colors hover:opacity-90"
                style={{ background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--line)' }}
              >
                {ARQUETIPOS[v.arquetipo].nome} → vitrine {v.nome}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
