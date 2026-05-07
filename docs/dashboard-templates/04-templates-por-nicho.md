# 04 — Templates por Nicho (Especificação Completa)

### Definição declarativa de cada template + UX, copy e validações

*Versão 1.0 — 07/05/2026*

---

## OBJETIVO

Especificar **cada um dos 6 templates** com nível de detalhe suficiente para implementação direta. Para cada template:

- Objeto `DashboardTemplate` em TypeScript
- Wireframe textual do form de produto
- Wireframe textual da sidebar
- Copy oficial (label, placeholder, mensagens de erro)
- Validações Zod específicas
- Wizard de onboarding (perguntas extras)

---

## TEMPLATE 1 — `food`

### Objeto declarativo

```ts
// packages/lib/templates/food.ts
import { DashboardTemplate } from './types';

export const templateFood: DashboardTemplate = {
  codigo: 'food',
  nome: 'Praça de Alimentação',
  descricao: 'Restaurantes, lanchonetes, cafés, bares e outros estabelecimentos de comida e bebida.',
  icone: '🍽️',
  categoriasGlobais: ['alimentos-e-bebidas'],

  modulos: {
    pedidos: true,
    produtos: true,
    estoque: false,           // food raramente usa estoque granular
    entregadores: true,
    agenda: false,
    relatorios: true,
    financeiro: true,
  },

  produto: {
    permiteVariacoes: 'nunca',
    permiteModificadores: true,
    camposExtras: [
      { codigo: 'tempo_preparo_min', label: 'Tempo de preparo (min)', tipo: 'number', obrigatorio: false },
      { codigo: 'serve_pessoas',     label: 'Serve quantas pessoas',  tipo: 'number', obrigatorio: false },
      { codigo: 'tags',              label: 'Tags',                   tipo: 'multi-tag', sugestoes: ['Vegetariano', 'Vegano', 'Sem glúten', 'Picante', 'Mais pedido'] },
    ],
    labels: {
      produtoSingular: 'Item do cardápio',
      produtoPlural:   'Cardápio',
      precoLabel:      'Preço',
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
      { tipo: 'select', codigo: 'tipo_cozinha', label: 'Tipo de cozinha',
        opcoes: ['Brasileira', 'Italiana', 'Japonesa', 'Hambúrgueres', 'Pizza', 'Açaí', 'Outros'] },
      { tipo: 'select', codigo: 'tem_retirada_local', label: 'Aceita retirada no local?',
        opcoes: ['Sim', 'Não'] },
    ],
  },
};
```

### Sidebar para `food`

```
┌────────────────────────────────┐
│  🏠  Início                    │
│  📋  Pedidos                   │  ← com som de alerta
│  🍽️  Cardápio                  │  ← era "Produtos"
│  💰  Financeiro                │
│  🏪  Minha Loja                │
│  🛵  Entregadores              │
│  📊  Relatórios                │
│  ⚙️  Configurações             │
└────────────────────────────────┘
```

### Form de produto para `food`

```
┌─ Item do cardápio ──────────────────────────────────────┐
│                                                          │
│  Nome *           [_________________________________]   │
│  Descrição        [_________________________________]   │
│  Foto             [📸 enviar imagem]                    │
│  Categoria *      [Lanches ▾]    Ordem [3]              │
│                                                          │
│  Preço *          [R$ _____]   Promoção [R$ _____]      │
│  Tempo de preparo [____ min]   Serve [_] pessoas        │
│                                                          │
│  Tags  [Vegetariano] [Mais pedido]  [+ adicionar]       │
│                                                          │
│  ┌─ Modificadores ───────────────────────────────────┐  │
│  │  + Adicionar grupo de modificadores                │  │
│  │                                                    │  │
│  │  ▼ Ponto da carne   (1 obrigatório, máx 1)         │  │
│  │      • Mal passada    R$ 0       [esgotou]         │  │
│  │      • Ao ponto       R$ 0       [esgotou]         │  │
│  │      • Bem passada    R$ 0       [esgotou]         │  │
│  │      [+ adicionar opção]                           │  │
│  │                                                    │  │
│  │  ▼ Adicionais       (mín 0, máx 5)                 │  │
│  │      • Bacon         +R$ 4        [esgotou]        │  │
│  │      • Cheddar       +R$ 6        [esgotou]        │  │
│  │      • Cebola caram. +R$ 3        [esgotou]        │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ☐ Disponível    ☐ Esgotou hoje (volta amanhã)          │
└──────────────────────────────────────────────────────────┘
```

### Copy

| Elemento | Texto |
|----------|-------|
| Botão criar | "Adicionar item ao cardápio" |
| Vazio | "Seu cardápio está vazio. Cadastre seu primeiro prato." |
| Confirmação | "Item adicionado ao cardápio." |
| Erro modifier sem opção | "Cada grupo de modificador precisa ter pelo menos 1 opção." |

### Validação Zod específica

```ts
const foodProdutoSchema = produtoBaseSchema.extend({
  tempo_preparo_min: z.number().int().min(1).max(180).optional(),
  serve_pessoas: z.number().int().min(1).max(20).optional(),
  modifier_groups: z.array(z.object({
    nome: z.string().min(1),
    min_select: z.number().int().min(0),
    max_select: z.number().int().min(1),
    modifiers: z.array(z.object({
      nome: z.string().min(1),
      preco_extra: z.number().int().min(0),
    })).min(1, 'Cada grupo precisa de ao menos 1 opção'),
  }).refine(g => g.max_select >= g.min_select)).default([]),
});
```

---

## TEMPLATE 2 — `fashion`

### Objeto declarativo

```ts
// packages/lib/templates/fashion.ts
export const templateFashion: DashboardTemplate = {
  codigo: 'fashion',
  nome: 'Moda & Vestuário',
  descricao: 'Roupas, calçados, acessórios e lingerie. Suporta grade de tamanho × cor.',
  icone: '👗',
  categoriasGlobais: ['vestuario'],

  modulos: {
    pedidos: true,
    produtos: true,
    estoque: true,            // por SKU
    entregadores: true,
    agenda: false,
    relatorios: true,
    financeiro: true,
  },

  produto: {
    permiteVariacoes: 'sempre',
    permiteModificadores: false,
    camposExtras: [
      { codigo: 'colecao',        label: 'Coleção',        tipo: 'text',     obrigatorio: false },
      { codigo: 'genero',         label: 'Gênero',         tipo: 'select',
        opcoes: ['Feminino', 'Masculino', 'Unissex', 'Infantil'] },
      { codigo: 'tabela_medidas', label: 'Tabela de medidas (URL)', tipo: 'url', obrigatorio: false },
      { codigo: 'composicao',     label: 'Composição',     tipo: 'text',     obrigatorio: false },
      { codigo: 'cuidados',       label: 'Cuidados',       tipo: 'text',     obrigatorio: false },
    ],
    labels: {
      produtoSingular: 'Peça',
      produtoPlural:   'Catálogo',
      precoLabel:      'Preço',
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
      { tipo: 'multi-select', codigo: 'subnichos', label: 'O que você vende?',
        opcoes: ['Roupa feminina', 'Roupa masculina', 'Calçados', 'Acessórios', 'Lingerie', 'Infantil'] },
      { tipo: 'select', codigo: 'tem_loja_fisica', label: 'Possui loja física para troca?',
        opcoes: ['Sim', 'Não'] },
    ],
  },
};
```

### Sidebar para `fashion`

```
┌────────────────────────────────┐
│  🏠  Início                    │
│  📋  Pedidos                   │
│  👗  Catálogo                  │  ← era "Produtos"
│  📦  Estoque (por SKU)         │
│  💰  Financeiro                │
│  🏪  Minha Loja                │
│  🛵  Entregadores              │
│  📊  Relatórios                │
│  ⚙️  Configurações             │
└────────────────────────────────┘
```

### Form de produto para `fashion` — fluxo em 2 passos

**Passo 1: dados gerais**

```
┌─ Peça ──────────────────────────────────────────────────┐
│  Nome *           [Vestido Floral Verão 2026___________]│
│  Descrição        [_________________________________]   │
│  Categoria *      [Vestidos ▾]                          │
│  Coleção          [Verão 2026]   Gênero [Feminino ▾]    │
│  Composição       [70% algodão, 30% poliéster_______]   │
│  Cuidados         [Lavar a 30°, não passar___________]   │
│  Tabela medidas   [https://...]                          │
│                                                          │
│  Foto principal   [📸]                                   │
│  Galeria          [📸] [📸] [📸] [+]                    │
│                                                          │
│  Preço base *     [R$ 129,90]   Promoção [R$ 99,90]      │
└──────────────────────────────────────────────────────────┘
```

**Passo 2: variações (grade)**

```
┌─ Variações ─────────────────────────────────────────────┐
│                                                          │
│  Adicione os atributos da grade:                         │
│  ┌────────────────────────────────────────────────────┐  │
│  │ + Tamanho: PP, P, M, G, GG                          │ │
│  │ + Cor:     Verde 🟢, Preto ⚫, Azul 🔵              │ │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Grade gerada (15 SKUs):                                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │       │ Verde   │ Preto   │ Azul                 │   │
│  │ PP    │ R$ 129  │ R$ 129  │ R$ 129               │   │
│  │       │ 🖼️ 5un  │ 🖼️ 3un  │ 🖼️ 0un (esgotado)    │   │
│  │ P     │ R$ 129  │ R$ 129  │ R$ 129               │   │
│  │       │ 🖼️ 8un  │ 🖼️ 6un  │ 🖼️ 4un               │   │
│  │ M     │ R$ 129  │ R$ 129  │ R$ 129               │   │
│  │ G     │ ...                                        │   │
│  │ GG    │ R$ 139  │ R$ 139  │ R$ 139  ← preço >    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  [Bulk: aplicar preço a toda linha/coluna] [Editar SKU] │
│                                                          │
│  Cada SKU pode ter: preço próprio, foto, estoque,        │
│  toggle "esgotado".                                      │
└──────────────────────────────────────────────────────────┘
```

### Copy

| Elemento | Texto |
|----------|-------|
| Botão criar | "Cadastrar peça" |
| Vazio | "Comece cadastrando sua primeira peça com tamanhos e cores." |
| Aviso plano | "Cada combinação tamanho×cor conta como 1 SKU. Você está em 12/50 do seu plano Básico." |
| Erro grade incompleta | "Cada combinação precisa ter preço e estoque definidos." |

### Validação Zod específica

```ts
const fashionProdutoSchema = produtoBaseSchema.extend({
  variants: z.array(z.object({
    options: z.record(z.string(), z.string()),    // ex: {Tamanho: 'M', Cor: 'Preto'}
    preco: z.number().int().positive(),
    stock_quantity: z.number().int().min(0).optional(),
    foto_url: z.string().url().optional(),
    sku: z.string().optional(),
  })).min(1).refine(
    (variants) => {
      const keys = variants.map(v => JSON.stringify(v.options));
      return new Set(keys).size === keys.length;
    },
    'Cada combinação de opções deve ser única'
  ),
});
```

---

## TEMPLATE 3 — `pharmacy`

### Objeto declarativo

```ts
// packages/lib/templates/pharmacy.ts
export const templatePharmacy: DashboardTemplate = {
  codigo: 'pharmacy',
  nome: 'Farmácia & Saúde',
  descricao: 'Farmácias, drogarias, manipulação. Inclui controle de lote, validade e receita.',
  icone: '💊',
  categoriasGlobais: ['saude-e-beleza'],

  modulos: {
    pedidos: true,
    produtos: true,
    estoque: true,
    entregadores: true,
    agenda: false,
    relatorios: true,           // SNGPC só Premium
    financeiro: true,
  },

  produto: {
    permiteVariacoes: 'opcional',  // dosagem
    permiteModificadores: false,
    camposExtras: [
      { codigo: 'registro_anvisa',        label: 'Registro ANVISA',         tipo: 'text', obrigatorio: true,
        placeholder: '1.0123.0456.001-2', validacao: /^\d\.\d{4}\.\d{4}\.\d{3}-\d$/ },
      { codigo: 'principio_ativo',        label: 'Princípio ativo',         tipo: 'text', obrigatorio: true },
      { codigo: 'categoria_regulatoria',  label: 'Categoria',               tipo: 'select',
        opcoes: ['MIP', 'Lista A', 'Lista B', 'Lista C'] },
      { codigo: 'exige_receita',          label: 'Exige receita',           tipo: 'boolean', defaultValue: false },
      { codigo: 'bula_url',               label: 'Bula (PDF)',              tipo: 'url' },
      { codigo: 'tipo_medicamento',       label: 'Tipo',                    tipo: 'select',
        opcoes: ['Genérico', 'Similar', 'Referência'] },
    ],
    labels: {
      produtoSingular: 'Medicamento/Produto',
      produtoPlural:   'Catálogo',
      precoLabel:      'Preço',
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
      { tipo: 'text',   codigo: 'crf_responsavel', label: 'CRF do farmacêutico responsável', obrigatorio: true },
      { tipo: 'text',   codigo: 'alvara_anvisa',   label: 'Nº do alvará sanitário',          obrigatorio: true },
      { tipo: 'select', codigo: 'manipulacao',     label: 'Faz manipulação?', opcoes: ['Sim', 'Não'] },
    ],
  },
};
```

### Form de produto para `pharmacy` — seção extra

```
┌─ Medicamento ───────────────────────────────────────────┐
│  Nome *           [Dipirona 500mg 20cps_______________]│
│  Princípio ativo *[Dipirona Sódica____________________]│
│  Registro ANVISA *[1.0123.0456.001-2___________________]│
│  Categoria *      [MIP ▾]                                │
│  Tipo             [Genérico ▾]                           │
│  ☐ Exige receita médica                                  │
│  Bula             [https://bula.pdf]                      │
│                                                          │
│  Preço *          [R$ 12,50]                             │
│                                                          │
│  ┌─ Lotes em estoque ──────────────────────────────────┐│
│  │ Lote AB123 — Venc 12/2026 — 45 un  [editar][baixa]  ││
│  │ Lote AB124 — Venc 03/2027 — 80 un  [editar][baixa]  ││
│  │ [+ Adicionar lote]                                   ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  Estoque total (FEFO): 125 un                            │
│  ⚠️ Lote AB123 vence em 7 meses                          │
└──────────────────────────────────────────────────────────┘
```

---

## TEMPLATE 4 — `pet`

### Objeto declarativo

```ts
// packages/lib/templates/pet.ts
export const templatePet: DashboardTemplate = {
  codigo: 'pet',
  nome: 'Pet Shop',
  descricao: 'Pet shops com produtos por porte/peso e serviços de banho & tosa.',
  icone: '🐶',
  categoriasGlobais: ['pets'],

  modulos: {
    pedidos: true,
    produtos: true,
    estoque: true,
    entregadores: true,
    agenda: true,            // banho & tosa
    relatorios: true,
    financeiro: true,
  },

  produto: {
    permiteVariacoes: 'opcional',
    permiteModificadores: false,
    camposExtras: [
      { codigo: 'especie',           label: 'Espécie',           tipo: 'multi-select',
        opcoes: ['Cães', 'Gatos', 'Aves', 'Peixes', 'Roedores', 'Outros'] },
      { codigo: 'faixa_peso_kg',     label: 'Faixa de peso (kg)', tipo: 'range' },
      { codigo: 'tipo_oferta',       label: 'Tipo',              tipo: 'select',
        opcoes: ['Produto físico', 'Serviço (banho/tosa)'] },
    ],
    labels: {
      produtoSingular: 'Item',
      produtoPlural:   'Catálogo',
      precoLabel:      'Preço',
    },
    defaults: {
      trackStock: true,
      disponivel: true,
    },
  },

  consumer: {
    layoutPdp: 'variacao',     // se houver variant
  },

  onboarding: {
    wizardSteps: [
      { tipo: 'select', codigo: 'oferece_servicos', label: 'Oferece banho & tosa?', opcoes: ['Sim', 'Não'] },
    ],
  },
};
```

> Comportamento: quando o lojista marca "Tipo: Serviço", o form **esconde** os campos de estoque e mostra agendamento. O template `pet` é o único que mistura produto e serviço no mesmo dashboard.

---

## TEMPLATE 5 — `services`

### Objeto declarativo

```ts
// packages/lib/templates/services.ts
export const templateServices: DashboardTemplate = {
  codigo: 'services',
  nome: 'Serviços',
  descricao: 'Salões, estética, manicure, manutenção, aulas. Sem entrega, com agendamento.',
  icone: '✂️',
  categoriasGlobais: ['servicos'],

  modulos: {
    pedidos: true,                  // pedido de agendamento
    produtos: true,                 // catálogo de serviços
    estoque: false,
    entregadores: false,            // OCULTO
    agenda: true,
    relatorios: true,
    financeiro: true,
  },

  produto: {
    permiteVariacoes: 'nunca',
    permiteModificadores: false,
    camposExtras: [
      { codigo: 'duracao_min',           label: 'Duração (minutos)', tipo: 'number', obrigatorio: true },
      { codigo: 'profissionais_ids',     label: 'Profissionais aptos', tipo: 'multi-staff' },
      { codigo: 'local_atendimento',     label: 'Local',              tipo: 'select',
        opcoes: ['No estabelecimento', 'A domicílio', 'Ambos'] },
      { codigo: 'requer_pre_pagamento',  label: 'Pedir sinal',         tipo: 'boolean', defaultValue: false },
      { codigo: 'percentual_sinal',      label: '% de sinal',          tipo: 'number', condicional: 'requer_pre_pagamento' },
    ],
    labels: {
      produtoSingular: 'Serviço',
      produtoPlural:   'Serviços',
      precoLabel:      'Valor',
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
      { tipo: 'number', codigo: 'qtde_profissionais', label: 'Quantos profissionais atendem?', obrigatorio: true },
      { tipo: 'multi-select', codigo: 'dias_funcionamento', label: 'Dias de atendimento',
        opcoes: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] },
    ],
  },
};
```

### Sidebar para `services`

```
┌────────────────────────────────┐
│  🏠  Início                    │
│  📅  Agenda                    │  ← novo
│  📋  Pedidos (agendamentos)    │
│  ✂️  Serviços                  │
│  👥  Profissionais             │  ← novo
│  💰  Financeiro                │
│  🏪  Minha Loja                │
│  📊  Relatórios                │
│  ⚙️  Configurações             │
└────────────────────────────────┘
```

> **Entregadores** sumiu por completo. **Agenda** e **Profissionais** entram no lugar.

---

## TEMPLATE 6 — `generic`

### Objeto declarativo

```ts
// packages/lib/templates/generic.ts
export const templateGeneric: DashboardTemplate = {
  codigo: 'generic',
  nome: 'Outros / Casa & Diversos',
  descricao: 'Eletrônicos, casa, decoração, presentes — para nichos sem template específico.',
  icone: '📦',
  categoriasGlobais: ['eletronicos', 'casa-e-decoracao', 'outros'],

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
      { codigo: 'garantia_meses',    label: 'Garantia (meses)',  tipo: 'number',  obrigatorio: false },
      { codigo: 'marca',             label: 'Marca',              tipo: 'text',    obrigatorio: false },
      { codigo: 'modelo',            label: 'Modelo',             tipo: 'text',    obrigatorio: false },
      { codigo: 'peso_g',            label: 'Peso (g)',           tipo: 'number',  obrigatorio: false },
      { codigo: 'dimensoes_cm',      label: 'Dimensões (LxAxP cm)', tipo: 'text',  obrigatorio: false },
    ],
    labels: {
      produtoSingular: 'Produto',
      produtoPlural:   'Produtos',
      precoLabel:      'Preço',
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
      { tipo: 'multi-select', codigo: 'tipos_produto', label: 'O que você vende?',
        opcoes: ['Eletrônicos', 'Casa', 'Decoração', 'Brinquedos', 'Papelaria', 'Outros'] },
    ],
  },
};
```

---

## REGRAS DE COMPATIBILIDADE ENTRE TEMPLATES

| Trocar de... | ...para | Comportamento |
|--------------|---------|---------------|
| `food` | `fashion` | Modificadores ficam ocultos mas preservados; lojista precisa criar variants para os produtos antigos manualmente |
| `food` | `generic` | Modificadores ficam ocultos; produtos viram simples |
| `fashion` | `generic` | Variants persistem; podem ser editados na seção opcional |
| `generic` | `fashion` | Toggle de variação fica obrigatório; produtos sem variant continuam vendáveis |
| qualquer | `services` | ⚠️ Aviso: estoque e entregadores serão desabilitados; produtos atuais ficam ocultos do consumer (mas não apagados) até virarem "serviço" |
| `services` | qualquer | ⚠️ Aviso: agenda fica oculta; agendamentos pendentes são preservados como pedidos normais |

> **Implementação:** modal de troca lê esta tabela e mostra avisos relevantes. Sem auto-conversão — apenas oculta/exibe.

---

## CAMPOS EXTRAS — ARMAZENAMENTO

Há **duas** estratégias possíveis:

| Estratégia | Quando usar |
|------------|-------------|
| Coluna nova em `products` | Campo é universal-ish e indexável (ex: `registro_anvisa` para busca) |
| `products.metadata` JSONB | Campo é específico de 1 template e não vira filtro (ex: `tabela_medidas`, `cuidados`) |

```sql
ALTER TABLE products ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
CREATE INDEX idx_products_metadata_gin ON products USING GIN (metadata);
```

Decisão por campo está documentada no `03-modelo-dados-variacoes-modificadores.md`.

---

## I18N E COPY CENTRALIZADAS

Todas as strings de cada template ficam num arquivo `i18n/pt-BR.ts` por template, não inline:

```ts
export const foodCopy = {
  produto: {
    singular: 'Item do cardápio',
    plural: 'Cardápio',
    botaoCriar: 'Adicionar item ao cardápio',
    vazio: 'Seu cardápio está vazio. Cadastre seu primeiro prato.',
    confirmacao: 'Item adicionado ao cardápio.',
  },
  // ...
};
```

Permite trocar copy sem mexer em UI e prepara terreno para outras línguas (futuro).

---

## ANTI-PADRÕES A EVITAR

- ❌ Colocar `if (template.codigo === 'food')` no meio da UI. Use **flags do template** (`template.produto.permiteModificadores`).
- ❌ Criar componente `<ProdutoFormFood />` e `<ProdutoFormFashion />`. Use **um único form com seções condicionais**.
- ❌ Duplicar regras de validação cliente vs servidor. Use **schema Zod compartilhado** em `packages/lib/templates`.
- ❌ Hardcodar a lista de templates em UI. Importe **sempre** de `TEMPLATES` do registry.

---

> **Próximo:** `05-impacto-consumer-e-checkout.md` — como variações e modificadores aparecem no consumer e impactam pagamento.
