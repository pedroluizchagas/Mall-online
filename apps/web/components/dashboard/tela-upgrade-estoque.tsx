interface Props {
  mensagem?: string
}

export function TelaUpgradeEstoque({ mensagem }: Props) {
  return (
    <div className="text-center py-16 px-6">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: 'rgba(193,241,72,0.12)' }}
      >
        <span className="text-2xl">📦</span>
      </div>
      <h3 className="text-lg font-semibold text-ink mb-2">Controle de estoque</h3>
      <p className="text-sm text-ink-3 mb-6">
        {mensagem ?? 'O controle de estoque está disponível nos planos Profissional e Premium.'}
      </p>
      <a
        href="/minha-conta?aba=assinatura"
        className="inline-block px-6 py-2.5 rounded-full text-sm font-bold hover:opacity-90 transition-opacity"
        style={{ background: 'var(--brick)', color: 'var(--brick-ink)' }}
      >
        Ver planos disponíveis
      </a>
    </div>
  )
}
