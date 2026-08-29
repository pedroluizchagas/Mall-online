import Link from 'next/link'

/**
 * Moldura das páginas institucionais (Termos, Privacidade).
 *
 * Vive no storefront porque é ele quem atende o apex `mallevo.com.br`
 * (ver middleware.ts: sem subdomínio, `slug` é null). São as URLs que o app
 * mobile abre em Perfil › Ajuda e que as lojas de aplicativos exigem que
 * estejam publicadas e acessíveis SEM login.
 */
export function PaginaLegal({
  titulo,
  atualizadoEm,
  children,
}: {
  titulo: string
  atualizadoEm: string
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-lg font-extrabold tracking-tight text-ink">
            Mallevo
          </Link>
          <span className="text-xs font-medium text-ink-muted">
            Atualizado em {atualizadoEm}
          </span>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-8 text-3xl font-extrabold tracking-tight text-ink">
          {titulo}
        </h1>
        <div className="flex flex-col gap-6">{children}</div>
      </article>

      <footer className="border-t border-line px-6 py-8">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted">
          <Link href="/termos" className="underline hover:text-ink">
            Termos de Uso
          </Link>
          <Link href="/privacidade" className="underline hover:text-ink">
            Política de Privacidade
          </Link>
        </div>
      </footer>
    </main>
  )
}

/** Seção numerada do documento. */
export function Secao({
  titulo,
  children,
}: {
  titulo: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-ink">{titulo}</h2>
      <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-ink-muted">
        {children}
      </div>
    </section>
  )
}

/** Lista de itens dentro de uma seção. */
export function Lista({ itens }: { itens: React.ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-5">
      {itens.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}
