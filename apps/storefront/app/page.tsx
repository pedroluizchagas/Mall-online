/**
 * Placeholder do storefront (Stage 1 — scaffold).
 * O roteamento host-based (D1) e a lógica de tenant entram no Stage 2;
 * as telas reais no Stage 3. Aqui só o esqueleto compilável.
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="rounded-lg bg-surface px-8 py-10 text-center shadow-soft">
        <h1 className="text-xl font-bold text-ink">Mallevo Storefront</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Scaffold (Stage 1). Roteamento e telas chegam nos próximos stages.
        </p>
      </div>
    </main>
  )
}
