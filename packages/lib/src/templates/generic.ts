import type { DashboardTemplate } from './types'

export const templateGeneric: DashboardTemplate = {
  codigo: 'generic',
  nome: 'Produtos Diversos',
  descricao:
    'Cobertura ampla para varejo de produtos físicos sem variação obrigatória.',
  icone: '📦',
  categoriasGlobais: [
    'beleza-cosmeticos',
    'eletronicos-tecnologia',
    'casa-decoracao',
    'construcao-ferramentas',
    'papelaria-livraria',
    'brinquedos-presentes',
    'floricultura-plantas',
    'automotivo',
    'mercado-conveniencia',
    'outros',
  ],

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
    permiteVariacoes: 'opcional',
    permiteModificadores: false,
    camposExtras: [
      { codigo: 'garantia_meses', label: 'Garantia (meses)', tipo: 'number', obrigatorio: false },
      { codigo: 'marca', label: 'Marca', tipo: 'text', obrigatorio: false },
      { codigo: 'modelo', label: 'Modelo', tipo: 'text', obrigatorio: false },
      { codigo: 'peso_g', label: 'Peso (g)', tipo: 'number', obrigatorio: false },
      {
        codigo: 'dimensoes_cm',
        label: 'Dimensões (LxAxP cm)',
        tipo: 'text',
        obrigatorio: false,
      },
    ],
    labels: {
      produtoSingular: 'Produto',
      produtoPlural: 'Produtos',
      precoLabel: 'Preço',
    },
    defaults: {
      trackStock: true,
      disponivel: true,
    },
  },

  consumer: {
    layoutPdp: 'simples',
  },

  onboarding: {
    wizardSteps: [
      {
        tipo: 'multi-select',
        codigo: 'tipos_produto',
        label: 'O que você vende?',
        opcoes: ['Eletrônicos', 'Casa', 'Decoração', 'Brinquedos', 'Papelaria', 'Outros'],
      },
    ],
  },
}
