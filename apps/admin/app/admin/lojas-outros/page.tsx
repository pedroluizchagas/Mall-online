import { getLojasEmOutros } from '@/lib/consultas'
import { contagem, dataCurta, quando } from '@/lib/format'
import { urlDaLoja } from '@/lib/storefront-url'
import { PageHeader } from '@/components/admin/page-header'
import { EmptyState } from '@/components/admin/empty-state'
import { Tijolo } from '@/components/admin/tijolo'
import { Reclassificar } from '@/components/admin/diretorio/reclassificar'
import { PartnerIcon } from '@/components/ui/partner-icon'

export const dynamic = 'force-dynamic'

/**
 * Lojas em "Outros": quem escolheu a categoria genérica no cadastro e espera
 * o nicho certo — sem ele, a loja fica com o template genérico e fora dos
 * pisos temáticos do app. A mais antiga primeiro.
 */
export default async function PaginaLojasEmOutros() {
  const { categoriaExiste, lojas, categorias } = await getLojasEmOutros()
  const agora = Date.now()

  return (
    <div className="slide-up p-6 sm:p-9">
      <PageHeader
        sobrelinha="Diretório"
        titulo="Lojas em “Outros”"
        subtitulo="Quem escolheu a categoria genérica no cadastro. Levar a loja para o nicho certo dá a ela o template do painel e o piso do app."
      />

      {!categoriaExiste ? (
        <div className="cartao">
          <EmptyState
            icone="alert"
            titulo="A categoria “outros” não está no banco"
            descricao="Ela vem do seed das categorias globais (tenant_id nulo). Aplique o seed para usar esta tela."
          />
        </div>
      ) : lojas.length === 0 ? (
        <div className="cartao">
          <EmptyState
            icone="check-double"
            titulo="Todas as lojas têm nicho"
            descricao="Quando alguém escolher “Outros” no cadastro, a loja aparece aqui para você reclassificar."
            cta={{ label: 'Ver adoção de templates', href: '/admin/adocao-templates' }}
          />
        </div>
      ) : (
        <>
          <p className="mb-3 text-[13px] font-semibold text-ink-3">
            {contagem(lojas.length, 'loja esperando', 'lojas esperando')} — a mais antiga primeiro.
          </p>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {lojas.map((l) => (
              <li key={l.id} className="cartao flex list-none flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <Tijolo nome={l.nome} foto={l.logo} />
                  <div className="min-w-0">
                    <p className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-[14.5px] font-semibold text-ink">{l.nome}</span>
                      {!l.noAr && <span className="shrink-0 text-[12px] font-semibold text-warn">Pausada</span>}
                    </p>
                    <p className="mt-0.5 truncate text-[12.5px] text-ink-3">
                      {[l.lojista, l.email].filter(Boolean).join(' · ') || 'Lojista sem nome'}
                    </p>
                    <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-ink-3">
                      <span title={dataCurta(l.criadoEm)}>Cadastrada {quando(l.criadoEm, agora)}</span>
                      {l.slug && (
                        <a
                          href={urlDaLoja(l.slug)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group inline-flex min-w-0 items-center gap-1 font-mono text-[11.5px] text-ink-2 hover:text-ink"
                        >
                          <span className="truncate">{l.slug}.mallevo.com.br</span>
                          <PartnerIcon name="external" size={12} strokeWidth={2} className="shrink-0 opacity-70 group-hover:opacity-100" />
                        </a>
                      )}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 self-end sm:self-auto">
                  <Reclassificar storeId={l.id} storeNome={l.nome} categorias={categorias} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
