'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ExternalLink, ShieldAlert } from 'lucide-react'
import { provisionarEnderecoPublico } from '@/lib/actions/lojas'
import { statusEnderecoPublico, urlDaLoja } from '@/lib/storefront-url'
import { showToast } from '@/components/ui/toast'

/**
 * Estado do endereço público da loja (`<slug>.mallevo.com.br`). Com o DNS na
 * Cloudflare, a Vercel só emite certificado para hostname provisionado
 * explicitamente — `stores.domain` registra isso. Slug atual sem registro =
 * loja no ar sem TLS ("Secure Connection Failed"): o botão reprovisiona.
 */
export function EnderecoPublico({ slug, domain }: { slug: string | null; domain: string | null }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const status = statusEnderecoPublico(slug, domain)

  if (status === 'sem_slug') return null

  function provisionar() {
    startTransition(() => {
      void (async () => {
        const r = await provisionarEnderecoPublico()
        if ('erro' in r) {
          showToast({ tipo: 'erro', titulo: 'Não foi possível provisionar', descricao: r.erro })
          return
        }
        showToast({ tipo: 'sucesso', titulo: 'Endereço provisionado', descricao: `${r.domain} recebe o certificado em instantes.` })
        router.refresh()
      })()
    })
  }

  return (
    <div
      className="mt-2 flex flex-col gap-2 rounded-xl p-3 sm:flex-row sm:items-center"
      style={{
        background: status === 'ok' ? 'var(--ok-lt)' : 'var(--err-lt)',
        border: `1px solid ${status === 'ok' ? 'var(--ok-line)' : 'var(--err-line)'}`,
      }}
      role="status"
    >
      {status === 'ok' ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: 'var(--ok)' }} />
      ) : (
        <ShieldAlert className="h-4 w-4 shrink-0" style={{ color: 'var(--err)' }} />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">
          {status === 'ok' ? 'Endereço público ativo' : 'Endereço público sem certificado'}
        </p>
        <p className="text-xs text-ink-2">
          {status === 'ok'
            ? 'Certificado emitido. Sua loja abre com cadeado em '
            : 'O slug atual ainda não foi provisionado; o navegador mostra "conexão não segura" em '}
          <a href={urlDaLoja(slug!)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 underline">
            {slug}.mallevo.com.br <ExternalLink className="h-3 w-3" />
          </a>
          .
        </p>
      </div>
      {status !== 'ok' && (
        <button
          type="button"
          onClick={provisionar}
          disabled={pending}
          className="shrink-0 rounded-full px-4 py-2 text-xs font-bold disabled:opacity-50"
          style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
        >
          {pending ? 'Provisionando…' : 'Provisionar agora'}
        </button>
      )}
    </div>
  )
}
