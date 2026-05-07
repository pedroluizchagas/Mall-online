import type { DashboardTemplate } from './types'

export const templatePharmacy: DashboardTemplate = {
  codigo: 'pharmacy',
  nome: 'Farmácia & Medicamentos',
  descricao:
    'Farmácias, drogarias, manipulação, suplementos. Inclui controle de lote, validade e receita.',
  icone: '💊',
  categoriasGlobais: ['farmacia-medicamentos'],

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
      {
        codigo: 'registro_anvisa',
        label: 'Registro ANVISA',
        tipo: 'text',
        obrigatorio: true,
        placeholder: '1.0123.0456.001-2',
        validacao: /^\d\.\d{4}\.\d{4}\.\d{3}-\d$/,
      },
      {
        codigo: 'principio_ativo',
        label: 'Princípio ativo',
        tipo: 'text',
        obrigatorio: true,
      },
      {
        codigo: 'categoria_regulatoria',
        label: 'Categoria',
        tipo: 'select',
        opcoes: ['MIP', 'Lista A', 'Lista B', 'Lista C'],
      },
      {
        codigo: 'exige_receita',
        label: 'Exige receita',
        tipo: 'boolean',
        defaultValue: false,
      },
      { codigo: 'bula_url', label: 'Bula (PDF)', tipo: 'url' },
      {
        codigo: 'tipo_medicamento',
        label: 'Tipo',
        tipo: 'select',
        opcoes: ['Genérico', 'Similar', 'Referência'],
      },
    ],
    labels: {
      produtoSingular: 'Medicamento/Produto',
      produtoPlural: 'Catálogo',
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
        tipo: 'text',
        codigo: 'crf_responsavel',
        label: 'CRF do farmacêutico responsável',
        obrigatorio: true,
      },
      {
        tipo: 'text',
        codigo: 'alvara_anvisa',
        label: 'Nº do alvará sanitário',
        obrigatorio: true,
      },
      {
        tipo: 'select',
        codigo: 'manipulacao',
        label: 'Faz manipulação?',
        opcoes: ['Sim', 'Não'],
      },
    ],
  },
}
