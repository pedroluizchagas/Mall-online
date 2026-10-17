/**
 * Destinos e atalhos da busca (⌘K) da administração — espelha os grupos da
 * sidebar e acrescenta os recortes que a gente abre todo dia (aprovações,
 * recebimentos travados, assinaturas em atraso).
 */
export interface Comando {
  id: string
  label: string
  href: string
  grupo: string
  /** Termos extras que também casam na busca. */
  palavras?: string
}

export const COMANDOS: Comando[] = [
  { id: 'visao-geral', label: 'Visão geral', href: '/admin', grupo: 'Operar', palavras: 'inicio home painel metricas gmv' },
  { id: 'lojistas', label: 'Lojistas', href: '/admin/lojistas', grupo: 'Operar', palavras: 'tenants lojas parceiros' },
  { id: 'entregadores', label: 'Entregadores', href: '/admin/entregadores', grupo: 'Operar', palavras: 'couriers motoboy' },
  {
    id: 'aprovar-entregadores',
    label: 'Entregadores aguardando aprovação',
    href: '/admin/entregadores?status=pendente',
    grupo: 'Atalhos',
    palavras: 'aprovar pendentes cnh cadastro',
  },
  {
    id: 'recebimentos-recusados',
    label: 'Lojistas com recebimento recusado',
    href: '/admin/lojistas?pagarme_status=refused',
    grupo: 'Atalhos',
    palavras: 'pagarme kyc recusado bloqueado',
  },
  {
    id: 'assinaturas-atraso',
    label: 'Assinaturas em atraso',
    href: '/admin/lojistas?status=em_atraso',
    grupo: 'Atalhos',
    palavras: 'stripe cobranca inadimplente',
  },
  { id: 'lojas-outros', label: 'Lojas em “Outros”', href: '/admin/lojas-outros', grupo: 'Diretório', palavras: 'reclassificar categoria nicho' },
  { id: 'adocao', label: 'Adoção de templates', href: '/admin/adocao-templates', grupo: 'Diretório', palavras: 'categorias pisos distribuicao' },
  { id: 'conciliacao', label: 'Conciliação', href: '/admin/financeiro', grupo: 'Financeiro', palavras: 'repasses comissoes receita mes' },
  { id: 'planos', label: 'Planos', href: '/admin/planos', grupo: 'Financeiro', palavras: 'assinatura stripe preco' },
  { id: 'novo-plano', label: 'Novo plano', href: '/admin/planos#novo-plano', grupo: 'Atalhos', palavras: 'criar plano stripe' },
]
