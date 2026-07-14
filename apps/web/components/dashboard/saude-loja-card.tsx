import Link from 'next/link'
import { AlertTriangle, ArrowRight, CheckCircle2, Info, XCircle } from 'lucide-react'
import type { AvisoSaude, SeveridadeAviso } from '@/lib/actions/home'

/**
 * "Saúde da loja" — checklist permanente da home (dashboard-redesign 03
 * §3.1 / Fase 4 §5). Mantém a memória do SetupWizard após a configuração
 * completa e agrega avisos operacionais acionáveis (foto faltando, estoque
 * baixo, avaliação em queda, loja pausada, vitrine sem estilo).
 */

const ESTILO_SEVERIDADE: Record<
  SeveridadeAviso,
  { icone: typeof CheckCircle2; cor: string; fundo: string }
> = {
  ok: { icone: CheckCircle2, cor: 'var(--ok, #2E7D4F)', fundo: 'var(--ok-lt, #E9F5EE)' },
  info: { icone: Info, cor: 'var(--sky, #3B6FA0)', fundo: 'var(--sky-lt, #EAF2F9)' },
  aviso: { icone: AlertTriangle, cor: 'var(--warn, #A66A00)', fundo: 'var(--warn-lt, #FBF3E0)' },
  erro: { icone: XCircle, cor: 'var(--err, #B3402F)', fundo: 'var(--err-lt, #FBEAE6)' },
}

const PESO: Record<SeveridadeAviso, number> = { erro: 0, aviso: 1, info: 2, ok: 3 }

export function SaudeLojaCard({ avisos }: { avisos: AvisoSaude[] }) {
  if (avisos.length === 0) return null

  const ordenados = [...avisos].sort((a, b) => PESO[a.severidade] - PESO[b.severidade])
  const pendencias = avisos.filter((a) => a.severidade !== 'ok').length

  return (
    <div className="rounded-lg border border-line bg-bg p-[22px] mt-[18px]">
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="m-0 text-base font-bold tracking-tight">Saúde da loja</h3>
        <span className="font-mono text-[10px] text-ink-3">
          {pendencias === 0
            ? 'tudo certo'
            : `${pendencias} ${pendencias === 1 ? 'pendência' : 'pendências'}`}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {ordenados.map((aviso) => {
          const meta = ESTILO_SEVERIDADE[aviso.severidade]
          const Icone = meta.icone
          const conteudo = (
            <>
              <Icone className="w-3.5 h-3.5 flex-shrink-0" style={{ color: meta.cor }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--ink-2)' }}>
                {aviso.titulo}
              </span>
              {aviso.cta && (
                <span
                  className="inline-flex items-center gap-0.5 text-[11px] font-bold"
                  style={{ color: meta.cor }}
                >
                  {aviso.cta.label}
                  <ArrowRight className="w-3 h-3" />
                </span>
              )}
            </>
          )

          const classe =
            'inline-flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full transition-opacity'
          const estilo = { background: meta.fundo, border: '1px solid var(--line)' }

          return aviso.cta ? (
            <Link
              key={aviso.id}
              href={aviso.cta.href}
              className={`${classe} hover:opacity-80`}
              style={estilo}
            >
              {conteudo}
            </Link>
          ) : (
            <span key={aviso.id} className={classe} style={estilo}>
              {conteudo}
            </span>
          )
        })}
      </div>
    </div>
  )
}
