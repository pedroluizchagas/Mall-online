'use client'

import type { DashboardTemplate } from '@mallevo/lib'
import { iconeDaCategoria } from '@/lib/icones-categoria'
import { PartnerIcon, type PartnerIconName } from '@/components/ui/partner-icon'

// Mesmo canal publicado na landing de parceiros.
const SUPORTE_EMAIL = 'contato@mallevo.com.br'

/** Ícone de sinalização de cada piso — o mesmo do diretório do app (Diretorio.tsx). */
const ICONE_POR_PISO: Record<string, PartnerIconName> = {
  'praca-alimentacao': 'utensils',
  'moda-estilo': 'hanger',
  saude: 'pulse',
  beleza: 'scissors',
  pet: 'paw',
  'casa-vida': 'armchair',
  mercado: 'basket',
  servicos: 'wrench',
  'presentes-diversao': 'gift',
}

interface PisoMin {
  slug: string
  nome: string
}

interface Props {
  categoriaNome: string | null
  categoriaSlug: string | null
  template: DashboardTemplate
  pisos: PisoMin[]
}

function featuresDoTemplate(template: DashboardTemplate): string[] {
  const features: string[] = []
  if (template.produto.permiteVariacoes !== 'nunca') {
    features.push('Variações de produto (tamanho, cor)')
  }
  if (template.produto.permiteModificadores) {
    features.push('Modificadores (adicionais, ponto da carne)')
  }
  if (template.modulos.estoque) {
    features.push('Controle de estoque')
  }
  if (template.modulos.agenda) {
    features.push('Agenda de horários')
  }
  if (template.modulos.entregadores) {
    features.push('Gestão de entregadores')
  }
  if (template.modulos.financeiro) {
    features.push('Painel financeiro')
  }
  if (template.modulos.relatorios) {
    features.push('Relatórios de vendas')
  }
  return features
}

/**
 * O tipo de loja e o que ele liga no painel: o modelo, os pisos onde a loja
 * aparece no app e os módulos ativos. Ícones de linha da casa — nada de emoji.
 */
export function TipoDeLojaCard({ categoriaNome, categoriaSlug, template, pisos }: Props) {
  const features = featuresDoTemplate(template)
  const IconeCategoria = iconeDaCategoria(categoriaSlug)
  const assuntoSuporte = encodeURIComponent(
    `Solicitação: troca de tipo de loja (atual: ${categoriaNome ?? 'não definido'})`,
  )

  return (
    <div className="space-y-5">
      <div className="cartao p-6">
        <div className="flex items-center gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-marquee text-[color:var(--brick)]">
            <IconeCategoria className="size-6" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-ink">
              {categoriaNome ?? 'Categoria não definida'}
            </h2>
            <p className="mt-0.5 text-[13.5px] text-ink-3">
              Modelo do painel: <span className="font-semibold text-ink">{template.nome}</span>
            </p>
          </div>
        </div>

        {pisos.length > 0 && (
          <div className="mt-6 border-t border-line pt-5">
            <p className="micro text-ink-3">Onde sua loja aparece no app</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {pisos.map((p) => (
                <li
                  key={p.slug}
                  className="inline-flex items-center gap-2 rounded-full bg-bg-2 py-1.5 pl-2 pr-3.5 text-[13px] font-semibold text-ink"
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-bg text-ink">
                    <PartnerIcon name={ICONE_POR_PISO[p.slug] ?? 'store'} size={13} strokeWidth={2} />
                  </span>
                  {p.nome}
                </li>
              ))}
            </ul>
          </div>
        )}

        {features.length > 0 && (
          <div className="mt-6 border-t border-line pt-5">
            <p className="micro text-ink-3">Funcionalidades ativas</p>
            <ul className="mt-3 space-y-2.5">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-[14px] text-ink">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-marquee text-[color:var(--brick)]">
                    <PartnerIcon name="check" size={11} strokeWidth={3} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="rounded-[20px] p-6" style={{ background: 'var(--warn-lt)' }}>
        <p className="text-[14px] leading-relaxed text-ink-2">
          O tipo de loja define como ela funciona no Mallevo. Para trocar, fale com a gente — assim garantimos que
          nada se perca na transição.
        </p>
        <a
          href={`mailto:${SUPORTE_EMAIL}?subject=${assuntoSuporte}`}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[13.5px] font-bold text-bg transition-opacity hover:opacity-90"
        >
          <PartnerIcon name="mail" size={15} strokeWidth={2} />
          Falar com a gente
        </a>
      </div>
    </div>
  )
}
