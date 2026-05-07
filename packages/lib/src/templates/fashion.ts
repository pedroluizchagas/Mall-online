import type { DashboardTemplate } from './types'

export const templateFashion: DashboardTemplate = {
  codigo: 'fashion',
  nome: 'Moda & Vestuário',
  descricao:
    'Roupas, calçados, acessórios e lingerie. Suporta grade de tamanho × cor.',
  icone: '👗',
  categoriasGlobais: ['vestuario-calcados', 'acessorios-joias'],

  modulos: {
    pedidos: true,
    produtos: true,
    estoque: true,
    entregadores: true,
    agenda: false,
    relatorios: true,
    financeiro: true,
  },

  produto: {
    permiteVariacoes: 'sempre',
    permiteModificadores: false,
    camposExtras: [
      { codigo: 'colecao', label: 'Coleção', tipo: 'text', obrigatorio: false },
      {
        codigo: 'genero',
        label: 'Gênero',
        tipo: 'select',
        opcoes: ['Feminino', 'Masculino', 'Unissex', 'Infantil'],
      },
      {
        codigo: 'tabela_medidas',
        label: 'Tabela de medidas (URL)',
        tipo: 'url',
        obrigatorio: false,
      },
      { codigo: 'composicao', label: 'Composição', tipo: 'text', obrigatorio: false },
      { codigo: 'cuidados', label: 'Cuidados', tipo: 'text', obrigatorio: false },
    ],
    labels: {
      produtoSingular: 'Peça',
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
        tipo: 'multi-select',
        codigo: 'subnichos',
        label: 'O que você vende?',
        opcoes: [
          'Roupa feminina',
          'Roupa masculina',
          'Calçados',
          'Acessórios',
          'Lingerie',
          'Infantil',
        ],
      },
      {
        tipo: 'select',
        codigo: 'tem_loja_fisica',
        label: 'Possui loja física para troca?',
        opcoes: ['Sim', 'Não'],
      },
    ],
  },
}
