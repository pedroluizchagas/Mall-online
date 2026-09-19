import { VITRINES, getVitrineDoArquetipo, resolveVitrine, type ArquetipoCodigo } from '@mallevo/lib'
import { ARQUETIPOS } from '@mallevo/lib'

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
      <div className="mb-5 rounded-2xl px-5 py-4" style={{ background: 'var(--brick-lt)', color: 'var(--ink)' }}>
        <p className="text-[10px] font-semibold uppercase" style={{ letterSpacing: '0.14em', color: 'var(--ink-2)' }}>
          Sua vitrine
        </p>
        <p className="mt-1 text-base font-bold">Vitrine ativada: {v.nome}</p>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--ink-2)' }}>
          {v.descricao} É o layout que sua loja veste no app Mallevo e no site — veja ao lado.
        </p>
        <p className="mt-2 text-[11px]" style={{ color: 'var(--ink-3)' }}>
          Ela usa a campanha, o texto da casa, os destaques e as fotos da casa da seção
          "Conteúdo da vitrine"; produtos com recorte sem fundo ganham destaque.
        </p>
      </div>
    )
  }

  return (
    <div className="mb-5 rounded-2xl px-5 py-4" style={{ background: 'var(--bg-2)', color: 'var(--ink-2)' }}>
      <p className="text-[10px] font-semibold uppercase" style={{ letterSpacing: '0.14em', color: 'var(--ink-3)' }}>
        Sua vitrine
      </p>
      <p className="mt-1 text-base font-bold" style={{ color: 'var(--ink)' }}>
        Layout padrão
      </p>
      <p className="mt-1 text-xs leading-relaxed">
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
