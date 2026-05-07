import type { DashboardTemplate } from './types'

export const templateServices: DashboardTemplate = {
  codigo: 'services',
  nome: 'Serviços',
  descricao:
    'Salões, estética, saúde, veterinária, manutenção, aulas. Sem entrega, com agendamento.',
  icone: '✂️',
  categoriasGlobais: [
    'saloes-estetica',
    'saude-bem-estar',
    'veterinaria',
    'oficinas-manutencao',
    'aulas-cursos',
  ],

  modulos: {
    pedidos: true,
    produtos: true,
    estoque: false,
    entregadores: false,
    agenda: true,
    relatorios: true,
    financeiro: true,
  },

  produto: {
    permiteVariacoes: 'nunca',
    permiteModificadores: false,
    camposExtras: [
      {
        codigo: 'duracao_min',
        label: 'Duração (minutos)',
        tipo: 'number',
        obrigatorio: true,
      },
      {
        codigo: 'profissionais_ids',
        label: 'Profissionais aptos',
        tipo: 'multi-staff',
      },
      {
        codigo: 'local_atendimento',
        label: 'Local',
        tipo: 'select',
        opcoes: ['No estabelecimento', 'A domicílio', 'Ambos'],
      },
      {
        codigo: 'requer_pre_pagamento',
        label: 'Pedir sinal',
        tipo: 'boolean',
        defaultValue: false,
      },
      {
        codigo: 'percentual_sinal',
        label: '% de sinal',
        tipo: 'number',
        condicional: 'requer_pre_pagamento',
      },
    ],
    labels: {
      produtoSingular: 'Serviço',
      produtoPlural: 'Serviços',
      precoLabel: 'Valor',
    },
    defaults: {
      trackStock: false,
      disponivel: true,
    },
  },

  consumer: {
    layoutPdp: 'agendamento',
  },

  onboarding: {
    wizardSteps: [
      {
        tipo: 'number',
        codigo: 'qtde_profissionais',
        label: 'Quantos profissionais atendem?',
        obrigatorio: true,
      },
      {
        tipo: 'multi-select',
        codigo: 'dias_funcionamento',
        label: 'Dias de atendimento',
        opcoes: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
      },
    ],
  },
}
