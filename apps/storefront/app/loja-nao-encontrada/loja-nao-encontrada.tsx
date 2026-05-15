/**
 * UI compartilhada de "loja não encontrada". Usada pela rota
 * `/loja-nao-encontrada` e por `app/not-found.tsx` (destino de `notFound()`).
 * Usa os tokens de tema do Stage 1 (globals.css / tailwind.config.ts).
 */
export function LojaNaoEncontrada() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-md rounded-lg bg-surface px-8 py-10 text-center shadow-soft">
        <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">
          Mallevo
        </p>
        <h1 className="mt-3 text-2xl font-bold text-ink">
          Loja não encontrada
        </h1>
        <p className="mt-3 text-sm text-ink-muted">
          Esta loja não existe, está fora do ar ou o endereço está incorreto.
          Confira o link e tente novamente.
        </p>
      </div>
    </main>
  )
}
