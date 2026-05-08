// Tipos que não vêm do schema do Supabase mas são usados na aplicação

export type OrderStatus =
  | 'novo'
  | 'confirmado'
  | 'em_preparo'
  | 'aguardando_entregador'
  | 'saiu_para_entrega'
  | 'entregue'
  | 'cancelado'

export type PaymentStatus = 'pendente' | 'pago' | 'estornado' | 'em_disputa'

export type BillingStatus = 'trial' | 'ativa' | 'em_atraso' | 'cancelada' | 'suspensa'

export type CourierStatus = 'pendente' | 'aprovado' | 'reprovado' | 'suspenso'

export type PayoutStatus = 'agendado' | 'processando' | 'concluido' | 'falhou'

// Endereço (usado em consumers.enderecos e orders.endereco_entrega)
export interface Endereco {
  apelido?: string        // ex: 'Casa', 'Trabalho'
  rua: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  estado: string
  cep: string
  latitude?: number
  longitude?: number
}

// Snapshot de um modificador selecionado dentro de um item do carrinho.
// Mantém nome e preco_extra para sobreviver à edição/remoção do modifier
// no catálogo do lojista.
export interface ItemCarrinhoModifier {
  modifier_id: string
  nome: string
  preco_extra: number     // centavos
}

// Item do carrinho (estado local — não vem do banco).
// linha_id é gerado localmente ao adicionar; itens com mesmo product_id mas
// modifiers diferentes coexistem como linhas separadas.
export interface ItemCarrinho {
  linha_id: string
  product_id: string
  nome: string
  preco: number           // centavos, preço base do produto
  quantidade: number
  foto_url?: string
  observacoes?: string
  modifiers?: ItemCarrinhoModifier[]
}

// Horários de funcionamento da loja
export interface HorariosFuncionamento {
  seg?: { abre: string; fecha: string } | null
  ter?: { abre: string; fecha: string } | null
  qua?: { abre: string; fecha: string } | null
  qui?: { abre: string; fecha: string } | null
  sex?: { abre: string; fecha: string } | null
  sab?: { abre: string; fecha: string } | null
  dom?: { abre: string; fecha: string } | null
}
