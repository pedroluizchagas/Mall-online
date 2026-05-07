import type { DashboardTemplate } from './types'

export const templatePet: DashboardTemplate = {
  codigo: 'pet',
  nome: 'Pet Shop',
  descricao: 'Pet shops com produtos por porte/peso e serviços de banho & tosa.',
  icone: '🐶',
  categoriasGlobais: ['pet-shop'],

  modulos: {
    pedidos: true,
    produtos: true,
    estoque: true,
    entregadores: true,
    agenda: true,
    relatorios: true,
    financeiro: true,
  },

  produto: {
    permiteVariacoes: 'opcional',
    permiteModificadores: false,
    camposExtras: [
      {
        codigo: 'especie',
        label: 'Espécie',
        tipo: 'multi-select',
        opcoes: ['Cães', 'Gatos', 'Aves', 'Peixes', 'Roedores', 'Outros'],
      },
      {
        codigo: 'faixa_peso_kg',
        label: 'Faixa de peso (kg)',
        tipo: 'range',
      },
      {
        codigo: 'tipo_oferta',
        label: 'Tipo',
        tipo: 'select',
        opcoes: ['Produto físico', 'Serviço (banho/tosa)'],
      },
    ],
    labels: {
      produtoSingular: 'Item',
      produtoPlural: 'Catálogo',
      precoLabel: 'Preço',
    },
    defaults: {
      trackStock: true,
      disponivel: true,
    },
  },

  consumer: {
    layoutPdp: 'variacao',
  },

  onboarding: {
    wizardSteps: [
      {
        tipo: 'select',
        codigo: 'oferece_servicos',
        label: 'Oferece banho & tosa?',
        opcoes: ['Sim', 'Não'],
      },
    ],
  },
}
