import type { DashboardTemplate } from './types'

export const templateFood: DashboardTemplate = {
  codigo: 'food',
  nome: 'Praça de Alimentação',
  descricao:
    'Restaurantes, lanchonetes, cafés, bares e outros estabelecimentos de comida e bebida.',
  icone: '🍽️',
  categoriasGlobais: ['alimentos-bebidas'],

  modulos: {
    pedidos: true,
    produtos: true,
    estoque: false,
    entregadores: true,
    agenda: false,
    relatorios: true,
    financeiro: true,
  },

  produto: {
    permiteVariacoes: 'nunca',
    permiteModificadores: true,
    camposExtras: [
      {
        codigo: 'tempo_preparo_min',
        label: 'Tempo de preparo (min)',
        tipo: 'number',
        obrigatorio: false,
      },
      {
        codigo: 'serve_pessoas',
        label: 'Serve quantas pessoas',
        tipo: 'number',
        obrigatorio: false,
      },
      {
        codigo: 'tags',
        label: 'Tags',
        tipo: 'multi-tag',
        sugestoes: ['Vegetariano', 'Vegano', 'Sem glúten', 'Picante', 'Mais pedido'],
      },
    ],
    labels: {
      produtoSingular: 'Item do cardápio',
      produtoPlural: 'Cardápio',
      precoLabel: 'Preço',
    },
    defaults: {
      trackStock: false,
      disponivel: true,
    },
  },

  consumer: {
    layoutPdp: 'cardapio',
  },

  onboarding: {
    wizardSteps: [
      {
        tipo: 'select',
        codigo: 'tipo_cozinha',
        label: 'Tipo de cozinha',
        opcoes: ['Brasileira', 'Italiana', 'Japonesa', 'Hambúrgueres', 'Pizza', 'Açaí', 'Outros'],
      },
      {
        tipo: 'select',
        codigo: 'tem_retirada_local',
        label: 'Aceita retirada no local?',
        opcoes: ['Sim', 'Não'],
      },
    ],
  },
}
