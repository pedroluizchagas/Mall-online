'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react'

type BannerSeveridade = 'info' | 'aviso' | 'erro'

export type BannerStatusItemId =
  | 'stripe_pendente' | 'assinatura_atraso' | 'manutencao'
  | 'avaliacao_baixa' | 'estoque_critico' | 'loja_pausada'

export interface BannerStatusItem {
  id: BannerStatusItemId
  severidade: BannerSeveridade
  titulo: string
  descricao?: string
  cta?: { label: string; href: string }
  dispensavel?: boolean
}

export interface BannerStatusProps {
  itens: BannerStatusItem[]
}

const PRIORIDADE: Record<BannerSeveridade, number> = { erro: 0, aviso: 1, info: 2 }

const ESTILOS = {
  erro: { bg: '#fde8e4', border: '#f4b9ae', fg: '#7a2516', ctaBg: 'var(--err)', ctaFg: '#ffffff', Icone: AlertCircle },
  aviso: { bg: '#fef3c7', border: '#fde68a', fg: '#92400e', ctaBg: '#92400e', ctaFg: '#fef3c7', Icone: AlertTriangle },
  info: { bg: '#e6f0fb', border: '#bcd4ee', fg: '#1f3c66', ctaBg: 'var(--sky)', ctaFg: '#ffffff', Icone: Info },
} as const

const chave = (id: BannerStatusItemId) => `banner-dismissed:${id}`

export function BannerStatus({ itens }: BannerStatusProps) {
  const [dispensados, setDispensados] = useState<Set<BannerStatusItemId> | null>(null)

  useEffect(() => {
    const set = new Set<BannerStatusItemId>()
    for (const it of itens) {
      if (it.dispensavel && window.localStorage.getItem(chave(it.id)) === '1') set.add(it.id)
    }
    setDispensados(set)
  }, [itens])

  if (!dispensados) return null

  const visiveis = itens
    .filter((it) => !dispensados.has(it.id))
    .sort((a, b) => PRIORIDADE[a.severidade] - PRIORIDADE[b.severidade])
    .slice(0, 2)

  if (visiveis.length === 0) return null

  const dispensar = (id: BannerStatusItemId) => {
    window.localStorage.setItem(chave(id), '1')
    setDispensados((prev) => new Set(prev).add(id))
  }

  return (
    <div className="flex flex-col">
      {visiveis.map((item) => {
        const e = ESTILOS[item.severidade]
        const { Icone } = e
        return (
          <div
            key={item.id}
            role={item.severidade === 'erro' ? 'alert' : 'status'}
            className="px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b flex-shrink-0"
            style={{ background: e.bg, borderColor: e.border, color: e.fg }}
          >
            <div className="flex items-start gap-3 min-w-0">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(255,255,255,0.45)' }}
              >
                <Icone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">{item.titulo}</p>
                {item.descricao && (
                  <p className="text-xs leading-snug mt-0.5" style={{ opacity: 0.85 }}>
                    {item.descricao}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {item.cta && (
                <Link
                  href={item.cta.href}
                  className="px-4 py-2 rounded-full font-bold text-sm hover:opacity-90 transition-opacity"
                  style={{ background: e.ctaBg, color: e.ctaFg }}
                >
                  {item.cta.label}
                </Link>
              )}
              {item.dispensavel && (
                <button
                  type="button"
                  onClick={() => dispensar(item.id)}
                  aria-label="Dispensar aviso"
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
