import { ChevronDown } from 'lucide-react'

const PERGUNTAS: { q: string; a: string }[] = [
  {
    q: 'Como ativo minha loja para começar a vender?',
    a: 'Vá em Minha loja, preencha endereço, horários e formas de pagamento, e ative o switch "Loja aberta". Sua loja já aparece no marketplace.',
  },
  {
    q: 'Como configuro horários de funcionamento?',
    a: 'Em Minha loja → Horários, defina abertura e fechamento por dia da semana. Você pode marcar dias como fechados ou abrir intervalos diferentes (almoço + jantar).',
  },
  {
    q: 'Como adiciono entregadores?',
    a: 'Em Entregadores, clique em "Convidar entregador". Gere o link com token e envie ao entregador — ele completa o cadastro pelo próprio celular.',
  },
  {
    q: 'Como aceito pedidos com agendamento?',
    a: 'Pedidos agendados aparecem em Agenda com a data/hora marcada. Aceite normalmente; eles entram em preparo conforme o horário escolhido pelo cliente.',
  },
  {
    q: 'Quando recebo o dinheiro das vendas?',
    a: 'Repasses caem semanalmente (D+7 do pedido entregue) na conta bancária cadastrada em Financeiro. Você pode antecipar mediante taxa.',
  },
  {
    q: 'Onde vejo relatórios de vendas?',
    a: 'Em Relatórios você acompanha faturamento, ticket médio, pedidos por hora, produtos mais vendidos e desempenho de cupons.',
  },
]

export function Faq() {
  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold text-ink mb-3">Perguntas frequentes</h2>
      <div className="space-y-2">
        {PERGUNTAS.map((p) => (
          <details
            key={p.q}
            className="group rounded-xl border bg-bg px-4 py-3 [&_summary::-webkit-details-marker]:hidden"
            style={{ borderColor: 'var(--line)' }}
          >
            <summary className="flex items-center justify-between gap-3 cursor-pointer list-none text-sm font-semibold text-ink">
              <span>{p.q}</span>
              <ChevronDown
                className="w-4 h-4 text-ink-3 shrink-0 transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <p className="mt-2 text-sm text-ink-2 leading-relaxed">{p.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
