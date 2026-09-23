/**
 * Contratos TypeScript dos Templates de Dashboard por Nicho.
 *
 * Fonte da verdade: docs/dashboard-templates/02-arquitetura-templates.md
 *
 * Um template é um objeto declarativo que descreve:
 *  - quais módulos do dashboard ficam visíveis
 *  - quais campos o formulário de produto exibe
 *  - copy/labels específicos do nicho
 *  - defaults aplicados na criação de produto
 *  - perguntas extras do wizard de onboarding da loja
 *
 * Template não é armazenado no banco — é derivado de
 * `categories.slug` via mapping em `./mapping.ts`.
 */

export type TemplateCodigo =
  | 'food'
  | 'fashion'
  | 'pharmacy'
  | 'pet'
  | 'services'
  | 'generic'

export type CampoExtraTipo =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multi-select'
  | 'multi-tag'
  | 'multi-staff'
  | 'url'
  | 'range'

export interface CampoExtraDef {
  /** Identificador estável usado no banco/metadata. */
  codigo: string
  label: string
  tipo: CampoExtraTipo
  obrigatorio?: boolean
  placeholder?: string
  /** Sugestões pré-preenchidas para inputs do tipo multi-tag. */
  sugestoes?: readonly string[]
  /** Opções fixas para inputs do tipo select / multi-select. */
  opcoes?: readonly string[]
  /** Regex de validação para campos do tipo text/url. */
  validacao?: RegExp
  /** Valor inicial — usado em booleans e selects. */
  defaultValue?: string | number | boolean
  /** Código de outro campo cuja verdade torna este visível (UI condicional). */
  condicional?: string
}

export type WizardStepTipo =
  | 'text'
  | 'number'
  | 'select'
  | 'multi-select'

export interface WizardStepDef {
  codigo: string
  label: string
  tipo: WizardStepTipo
  obrigatorio?: boolean
  opcoes?: readonly string[]
}

export interface DashboardTemplate {
  codigo: TemplateCodigo
  /** Nome humano exibido no onboarding. */
  nome: string
  descricao: string
  /** Emoji ou nome de ícone (usado na sidebar/cards). */
  icone: string
  /** Slugs de `categories` que sugerem esse template (espelha `mapping.ts`). */
  categoriasGlobais: readonly string[]

  modulos: {
    pedidos: boolean
    produtos: boolean
    estoque: boolean
    entregadores: boolean
    /** `agenda` é exclusivo de templates baseados em agendamento (services, pet). */
    agenda: boolean
    relatorios: boolean
    financeiro: boolean
  }

  produto: {
    /** `sempre` força criar variants; `opcional` permite; `nunca` esconde a UI. */
    permiteVariacoes: 'sempre' | 'opcional' | 'nunca'
    permiteModificadores: boolean
    camposExtras: readonly CampoExtraDef[]
    labels: {
      produtoSingular: string
      produtoPlural: string
      precoLabel: string
    }
    defaults: {
      trackStock: boolean
      disponivel: boolean
    }
    /**
     * Blocos de "Mídia e vitrine" que este nicho edita em `products.metadata`
     * (A-17: o gate estava chumbado no formulário do dashboard).
     *
     * O que cada flag alimenta nas vitrines do consumer/storefront:
     *  - `galeria`: fotos extras do PDP — toda loja tem;
     *  - `recorte`: PNG sem fundo do "produto solto" (Torra, Smash, Horta,
     *    Ritual, Gôndola) — praça de alimentação e lojas genéricas;
     *  - `especificacoes`: ficha técnica em pares (Artesã, Jardim, Gôndola) —
     *    casa/decoração, floricultura, mercado e demais nichos `generic`, e
     *    também comida (o cardápio do seed usa Tamanho/Massa e o e2e cobre);
     *  - `unidade`: unidade de venda ao lado do preço ("R$ 8,90 /kg") —
     *    comida e mercado.
     *
     * Flag desligada só ESCONDE o editor: o que já estiver gravado é
     * preservado, nunca apagado por não ter aparecido na tela.
     */
    midia: {
      galeria: boolean
      recorte: boolean
      especificacoes: boolean
      unidade: boolean
    }
  }

  consumer: {
    /** Como o app mobile renderiza a página de detalhe do produto. */
    layoutPdp: 'simples' | 'variacao' | 'cardapio' | 'agendamento'
  }

  onboarding: {
    wizardSteps: readonly WizardStepDef[]
  }
}

/** Forma mínima esperada de uma store para resolver o template. */
export interface StoreParaTemplate {
  categoria?: { slug?: string | null } | null
}
