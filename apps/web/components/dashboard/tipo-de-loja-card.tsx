'use client'

import { Check, Mail } from 'lucide-react'
import type { DashboardTemplate } from '@mallora/lib'

// TODO(suporte): trocar por canal oficial quando o e-mail/help-desk estiver definido.
const SUPORTE_EMAIL = 'support@mallevo.com.br'

interface PisoMin {
  slug: string
  nome: string
  icone: string
}

interface Props {
  categoriaNome: string | null
  categoriaIcone: string | null
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

export function TipoDeLojaCard({ categoriaNome, categoriaIcone, template, pisos }: Props) {
  const features = featuresDoTemplate(template)
  const assuntoSuporte = encodeURIComponent(
    `Solicitação: troca de tipo de loja (atual: ${categoriaNome ?? 'não definido'})`,
  )

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-5">
          <span className="text-4xl">{categoriaIcone ?? '🏪'}</span>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-ink">
              {categoriaNome ?? 'Categoria não definida'}
            </h2>
            <p className="text-sm text-ink-3 mt-0.5">
              Template do dashboard:{' '}
              <span className="font-semibold text-ink">{template.nome}</span>
            </p>
          </div>
        </div>

        {pisos.length > 0 && (
          <div className="mb-5">
            <p className="text-xs uppercase tracking-wider font-semibold text-ink-3 mb-2">
              Vitrines no app do consumidor
            </p>
            <div className="flex flex-wrap gap-2">
              {pisos.map((p) => (
                <span
                  key={p.slug}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-sm text-ink"
                >
                  <span>{p.icone}</span>
                  {p.nome}
                </span>
              ))}
            </div>
          </div>
        )}

        {features.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-ink-3 mb-2">
              Funcionalidades ativas
            </p>
            <ul className="space-y-1.5">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-ink">
                  <Check className="w-4 h-4 text-[#7CB342] flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <p className="text-sm text-amber-900 mb-4">
          A categoria define como sua loja funciona no Mallevo. Para trocar, é
          necessário falar com nosso suporte — assim garantimos que nada seja
          perdido na transição.
        </p>
        <a
          href={`mailto:${SUPORTE_EMAIL}?subject=${assuntoSuporte}`}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-amber-300 text-amber-900 text-sm font-semibold hover:bg-amber-100 transition-colors"
        >
          <Mail className="w-4 h-4" />
          Falar com o suporte
        </a>
      </div>
    </div>
  )
}
