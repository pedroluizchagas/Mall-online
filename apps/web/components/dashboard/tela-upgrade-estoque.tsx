interface Props {
  mensagem?: string
}

export function TelaUpgradeEstoque({ mensagem }: Props) {
  return (
    <div className="text-center py-16 px-6">
      <div className="w-16 h-16 bg-[#1A4D3A]/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">📦</span>
      </div>
      <h3 className="text-lg font-semibold text-[#1A4D3A] mb-2">
        Controle de estoque
      </h3>
      <p className="text-gray-500 text-sm mb-6">
        {mensagem ??
          'O controle de estoque está disponível nos planos Profissional e Premium.'}
      </p>
      <a
        href="/dashboard/configuracoes/assinatura"
        className="inline-block bg-[#1A4D3A] text-white px-6 py-2.5 rounded-lg
          text-sm font-medium hover:bg-[#163d2e] transition-colors"
      >
        Ver planos disponíveis
      </a>
    </div>
  )
}
