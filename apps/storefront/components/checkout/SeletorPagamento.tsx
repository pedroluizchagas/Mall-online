'use client'

/**
 * SeletorPagamento — port RN→DOM de
 * apps/mobile-consumer/components/SeletorPagamento.tsx (Stage 3d).
 *
 * UI pura. `loja` vem da view `public_catalog_stores` (D2, via Server →
 * props), não da tabela base. Mesmas opções/condições do mobile.
 */

export type FormaPagamento =
  | 'online_cartao'
  | 'online_pix'
  | 'dinheiro'
  | 'cartao_maquininha'

interface Loja {
  aceita_dinheiro: boolean
  aceita_pix: boolean
  aceita_cartao_maquininha: boolean
  aceita_cartao_online: boolean
}

type IconeNome = 'wallet' | 'phone' | 'cash'

interface OpcaoPagamento {
  id: FormaPagamento
  label: string
  descricao: string
  icone: IconeNome
  condicao: (loja: Loja) => boolean
}

const OPCOES: OpcaoPagamento[] = [
  {
    id: 'online_cartao',
    label: 'Cartão de crédito',
    descricao: 'Parcele em até 12x — pagamento seguro Pagar.me',
    icone: 'wallet',
    condicao: (l) => l.aceita_cartao_online,
  },
  {
    id: 'online_pix',
    label: 'Pix',
    descricao: 'Aprovação imediata via QR Code',
    icone: 'phone',
    condicao: (l) => l.aceita_pix,
  },
  {
    id: 'dinheiro',
    label: 'Dinheiro na entrega',
    descricao: 'Pague ao receber seu pedido',
    icone: 'cash',
    condicao: (l) => l.aceita_dinheiro,
  },
  {
    id: 'cartao_maquininha',
    label: 'Cartão na maquininha',
    descricao: 'Débito ou crédito na entrega',
    icone: 'wallet',
    condicao: (l) => l.aceita_cartao_maquininha,
  },
]

function IconePagamento({ nome }: { nome: IconeNome }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {nome === 'wallet' && (
        <>
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="M3 10h18M16 14h2" />
        </>
      )}
      {nome === 'phone' && (
        <>
          <rect x="7" y="3" width="10" height="18" rx="2" />
          <path d="M11 18h2" />
        </>
      )}
      {nome === 'cash' && (
        <>
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <circle cx="12" cy="12" r="2.5" />
        </>
      )}
    </svg>
  )
}

interface Props {
  loja: Loja
  selecionado: FormaPagamento
  onSelecionar: (forma: FormaPagamento) => void
}

export function SeletorPagamento({ loja, selecionado, onSelecionar }: Props) {
  const opcoesDisponiveis = OPCOES.filter((op) => op.condicao(loja))

  return (
    <div className="px-6 pt-6">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-muted">
        Pagamento
      </p>

      <div className="flex flex-col gap-2">
        {opcoesDisponiveis.map((opcao) => {
          const ativo = selecionado === opcao.id
          return (
            <button
              key={opcao.id}
              type="button"
              onClick={() => onSelecionar(opcao.id)}
              className={`flex items-center gap-3 rounded-md border p-4 text-left transition-colors ${
                ativo
                  ? 'border-accent bg-accent-soft'
                  : 'border-line bg-surface'
              }`}
            >
              <span
                className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 ${
                  ativo
                    ? 'border-ink bg-ink text-accent'
                    : 'border-line text-transparent'
                }`}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M5 12l5 5L20 7" />
                </svg>
              </span>

              <span className="text-ink">
                <IconePagamento nome={opcao.icone} />
              </span>

              <span className="flex flex-1 flex-col gap-0.5">
                <span className="text-sm font-bold text-ink">
                  {opcao.label}
                </span>
                <span className="text-xs font-medium text-ink-muted">
                  {opcao.descricao}
                </span>
              </span>
            </button>
          )
        })}

        {opcoesDisponiveis.length === 0 && (
          <p className="py-4 text-center text-sm font-medium text-ink-muted">
            Nenhuma forma de pagamento disponível.
          </p>
        )}
      </div>
    </div>
  )
}
