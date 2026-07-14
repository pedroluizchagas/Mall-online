import type { DashboardTemplate } from '@mallevo/lib'

/**
 * Destinos e ações do command palette (⌘K). Gerado a partir do
 * DashboardTemplate para respeitar os módulos do nicho — espelha a lógica
 * da sidebar (buildGrupos), mas como dados puros (sem ícones) e com ações
 * extras que a sidebar não lista (ex.: "Novo produto").
 */
export interface Comando {
  id: string
  label: string
  href: string
  grupo: string
  /** Termos extras que também casam na busca. */
  palavras?: string
}

export function construirComandos(template: DashboardTemplate): Comando[] {
  const plural = template.produto.labels.produtoPlural
  const singular = template.produto.labels.produtoSingular

  const comandos: Comando[] = [
    { id: 'inicio', label: 'Início', href: '/', grupo: 'Operar', palavras: 'home painel dashboard' },
  ]

  if (template.modulos.pedidos) {
    comandos.push({ id: 'pedidos', label: 'Pedidos', href: '/pedidos', grupo: 'Operar', palavras: 'ordens vendas' })
  }
  if (template.modulos.produtos) {
    comandos.push(
      { id: 'produtos', label: plural, href: '/produtos', grupo: 'Operar', palavras: 'catalogo produtos itens' },
      {
        id: 'novo-produto',
        label: `Novo ${singular.toLowerCase()}`,
        href: '/produtos/novo',
        grupo: 'Ações',
        palavras: 'criar adicionar cadastrar produto',
      },
      { id: 'categorias', label: 'Categorias', href: '/categorias', grupo: 'Operar', palavras: 'secoes' },
    )
    if (template.modulos.estoque) {
      comandos.push({ id: 'estoque', label: 'Estoque', href: '/estoque', grupo: 'Operar', palavras: 'inventario' })
    }
  }
  if (template.modulos.entregadores) {
    comandos.push({ id: 'entregadores', label: 'Entregadores', href: '/entregadores', grupo: 'Operar', palavras: 'motoboy courier' })
  }
  if (template.modulos.agenda) {
    comandos.push({ id: 'agenda', label: 'Agenda', href: '/agenda', grupo: 'Operar', palavras: 'horarios agendamento' })
  }
  comandos.push(
    { id: 'mensagens', label: 'Mensagens', href: '/mensagens', grupo: 'Operar', palavras: 'chat conversa' },
    { id: 'avaliacoes', label: 'Avaliações', href: '/avaliacoes', grupo: 'Operar', palavras: 'reviews notas estrelas' },
  )

  if (template.modulos.financeiro) {
    comandos.push({ id: 'financeiro', label: 'Financeiro', href: '/financeiro', grupo: 'Analisar', palavras: 'repasses extrato saldo' })
  }
  if (template.modulos.relatorios) {
    comandos.push({ id: 'relatorios', label: 'Relatórios', href: '/relatorios', grupo: 'Analisar', palavras: 'analytics metricas graficos' })
  }

  comandos.push(
    { id: 'vitrine', label: 'Vitrine da loja', href: '/minha-loja', grupo: 'Minha loja', palavras: 'tema estilo aparencia logo cor' },
    { id: 'configuracoes', label: 'Configurações', href: '/configuracoes', grupo: 'Minha loja', palavras: 'ajustes horarios entrega pagamento' },
    { id: 'tipo-de-loja', label: 'Tipo de loja', href: '/configuracoes/tipo-de-loja', grupo: 'Minha loja', palavras: 'template nicho' },
  )
  if (template.modulos.agenda) {
    comandos.push({ id: 'staff', label: 'Profissionais', href: '/configuracoes/staff', grupo: 'Minha loja', palavras: 'equipe funcionarios' })
  }

  comandos.push(
    { id: 'minha-conta', label: 'Minha conta', href: '/minha-conta', grupo: 'Conta', palavras: 'perfil assinatura seguranca faturas' },
    { id: 'ajuda', label: 'Central de ajuda', href: '/ajuda', grupo: 'Conta', palavras: 'suporte faq duvidas ticket' },
  )

  return comandos
}
