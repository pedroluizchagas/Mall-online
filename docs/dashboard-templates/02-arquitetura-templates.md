# 02 — Arquitetura de Templates

### Como o sistema de templates é estruturado tecnicamente

*Versão 1.0 — 07/05/2026*

---

## OBJETIVO

Definir o **mecanismo central** que faz o dashboard se comportar de maneiras diferentes para cada lojista, sem fork de páginas, sem `if/else` espalhados e sem perder retrocompatibilidade. O resultado é um sistema **declarativo, testável e fácil de estender**: para adicionar um novo nicho, basta criar um objeto e registrá-lo.

## PRINCÍPIO FUNDAMENTAL

**O template não é armazenado no banco.** Ele é **derivado** da `categoria_id` da loja, via mapeamento estático em código (`packages/lib/templates/mapping.ts`). Isso significa:

- Não existe coluna `stores.template_codigo`. Não existe migração para criá-la.
- A `categoria_id` é a **única fonte da verdade** sobre que tipo de loja é.
- Categoria é imutável em auto-serviço (RLS bloqueia UPDATE — ver `07-categorias-e-pisos.md`). Logo, template também é.
- Trocar categoria de um lojista é operação de super-admin (ticket), não de auto-serviço.

> Lojista que precise vender em outro nicho **cria nova loja** — planos Profissional+ permitem múltiplas lojas por tenant.

---

## DECISÃO PRINCIPAL: TEMPLATE DECLARATIVO

Um **template** é um objeto TypeScript que descreve, por nicho:

- Quais **módulos** (rotas/menus) ficam visíveis no dashboard
- Quais **campos** o formulário de produto exibe
- Quais **regras de validação** se aplicam
- Quais **labels/copy** são usados (ex: "Produto" vs "Serviço" vs "Medicamento")
- Quais **defaults** são aplicados (ex: food já vem com `track_stock=false`)
- Quais **wizards de onboarding** rodam

```ts
// packages/lib/templates/types.ts
export type TemplateCodigo =
  | 'food'
  | 'fashion'
  | 'pharmacy'
  | 'pet'
  | 'services'
  | 'generic';

export interface DashboardTemplate {
  codigo: TemplateCodigo;
  nome: string;                        // exibido no onboarding
  descricao: string;                   // 1 frase
  icone: string;                       // emoji ou nome de ícone
  categoriasGlobais: string[];         // slugs de categories que sugerem esse template

  modulos: {
    pedidos: boolean;
    produtos: boolean;
    estoque: boolean;
    entregadores: boolean;
    agenda: boolean;                   // novo, só services
    relatorios: boolean;
    financeiro: boolean;
  };

  produto: {
    permiteVariacoes: 'sempre' | 'opcional' | 'nunca';
    permiteModificadores: boolean;
    camposExtras: CampoExtraDef[];     // ANVISA, lote, garantia, ...
    labels: {
      produtoSingular: string;         // "Produto" / "Prato" / "Peça" / "Medicamento" / "Serviço"
      produtoPlural: string;
      precoLabel: string;              // "Preço" / "Valor da consulta"
    };
    defaults: {
      trackStock: boolean;
      disponivel: boolean;
    };
  };

  consumer: {
    layoutPdp: 'simples' | 'variacao' | 'cardapio' | 'agendamento';
  };

  onboarding: {
    wizardSteps: WizardStepDef[];      // perguntas extras na criação da loja
  };
}
```

> O contrato completo (com `CampoExtraDef`, `WizardStepDef` etc.) fica em `packages/lib/templates/types.ts` quando for implementado.

---

## REGISTRY CENTRALIZADO + MAPEAMENTO DE CATEGORIA

Todos os templates ficam num **registry imutável**, indexado por código:

```ts
// packages/lib/templates/registry.ts
import { templateFood } from './food';
import { templateFashion } from './fashion';
import { templatePharmacy } from './pharmacy';
import { templatePet } from './pet';
import { templateServices } from './services';
import { templateGeneric } from './generic';

export const TEMPLATES = {
  food:     templateFood,
  fashion:  templateFashion,
  pharmacy: templatePharmacy,
  pet:      templatePet,
  services: templateServices,
  generic:  templateGeneric,
} satisfies Record<TemplateCodigo, DashboardTemplate>;
```

E o **mapeamento categoria → template** (fonte da verdade em `07-categorias-e-pisos.md`):

```ts
// packages/lib/templates/mapping.ts
export const CATEGORIA_SLUG_TO_TEMPLATE = {
  'alimentos-bebidas':       'food',
  'vestuario-calcados':      'fashion',
  'acessorios-joias':        'fashion',
  'farmacia-medicamentos':   'pharmacy',
  'pet-shop':                'pet',
  'saloes-estetica':         'services',
  'saude-bem-estar':         'services',
  'veterinaria':             'services',
  'oficinas-manutencao':     'services',
  'aulas-cursos':            'services',
  // todas as outras 10 → 'generic'
  'beleza-cosmeticos':       'generic',
  'eletronicos-tecnologia':  'generic',
  'casa-decoracao':          'generic',
  'construcao-ferramentas':  'generic',
  'papelaria-livraria':      'generic',
  'brinquedos-presentes':    'generic',
  'floricultura-plantas':    'generic',
  'automotivo':              'generic',
  'mercado-conveniencia':    'generic',
  'outros':                  'generic',
} as const satisfies Record<string, TemplateCodigo>;

export function getTemplateBySlug(slug: string | null | undefined): DashboardTemplate {
  const codigo = slug ? CATEGORIA_SLUG_TO_TEMPLATE[slug] : undefined;
  return TEMPLATES[codigo ?? 'generic'];
}

export function getTemplateByStore(
  store: { categoria?: { slug?: string } | null }
): DashboardTemplate {
  return getTemplateBySlug(store.categoria?.slug);
}
```

Cada arquivo (`food.ts`, `fashion.ts`, ...) exporta um objeto seguindo o contrato. Esse é o **único lugar** que descreve diferenças por nicho — toda UI consulta o registry via `getTemplateByStore()`.

---

## ONDE MORA O CÓDIGO

```
packages/lib/templates/
  ├── types.ts                # Contratos TypeScript (TemplateCodigo, DashboardTemplate)
  ├── registry.ts             # Registry central (TEMPLATES)
  ├── mapping.ts              # CATEGORIA_SLUG_TO_TEMPLATE + getTemplateBySlug/Store
  ├── helpers.ts              # isModuloHabilitado(), getCampoExtra()
  ├── food.ts                 # Template food
  ├── fashion.ts              # Template fashion
  ├── pharmacy.ts             # Template pharmacy
  ├── pet.ts                  # Template pet
  ├── services.ts             # Template services
  └── generic.ts              # Template generic

packages/lib/
  └── pisos.ts                # Pisos curatoriais do consumer (9 itens, ver 07)
```

Por que `packages/lib`? Porque tanto o dashboard (web) quanto o app consumer (mobile) precisam ler o template (consumer renderiza PDP de forma diferente). Mantém uma fonte única.

---

## COMO O TEMPLATE É RESOLVIDO EM RUNTIME

### 1. No dashboard (lojista)

```
[lojista loga]
  ↓
layout.tsx faz SELECT na stores do tenant (com JOIN em categories)
  ↓
store.categoria.slug
  ↓
getTemplateByStore(store) → mapping → registry → DashboardTemplate
  ↓
injeta via Context (TemplateProvider)
  ↓
todo componente filho usa useTemplate()
```

```tsx
// apps/web/app/(dashboard)/layout.tsx (sketch)
import { TemplateProvider, getTemplateByStore } from '@mallevo/lib/templates';

export default async function DashboardLayout({ children }) {
  const store = await getActiveStore();   // já existe; agora com JOIN categories(slug)
  const template = getTemplateByStore(store);
  return (
    <TemplateProvider value={template}>
      <Sidebar />
      {children}
    </TemplateProvider>
  );
}
```

### 2. No consumer (mobile)

```
[consumer abre PDP da loja X]
  ↓
loja vem com store.categoria.slug no payload
  ↓
getTemplateByStore(store) → DashboardTemplate
  ↓
PDP escolhe layout: simples | variacao | cardapio | agendamento
```

### 3. Onboarding

Quando o lojista cria a loja, o wizard apresenta as **20 categorias** (com busca, ícone e exemplos — ver `07-categorias-e-pisos.md`). A escolha **define a categoria e, por consequência, o template**. O lojista é avisado de que **trocar é via suporte**.

---

## RENDER CONDICIONAL — PADRÕES

Há **3 padrões** principais de uso, e o time deve seguir esses para manter consistência.

### Padrão A — Sidebar / menu

```tsx
// components/dashboard/sidebar.tsx
const template = useTemplate();

const itens = [
  { label: 'Início',       href: '/' },
  { label: 'Pedidos',      href: '/pedidos',      mostrar: template.modulos.pedidos },
  { label: 'Produtos',     href: '/produtos',     mostrar: template.modulos.produtos,
    label2: template.produto.labels.produtoPlural },
  { label: 'Agenda',       href: '/agenda',       mostrar: template.modulos.agenda },
  { label: 'Estoque',      href: '/estoque',      mostrar: template.modulos.estoque },
  { label: 'Entregadores', href: '/entregadores', mostrar: template.modulos.entregadores },
];

return itens.filter(i => i.mostrar !== false).map(...);
```

### Padrão B — Form de produto

O form é **único arquivo** (`produto-form.tsx`) que renderiza seções condicionalmente. Não criamos `produto-form-fashion.tsx` e `produto-form-food.tsx`.

```tsx
const template = useTemplate();

return (
  <form>
    <CamposBasicos />
    {template.produto.permiteVariacoes !== 'nunca' && (
      <SecaoVariacoes opcional={template.produto.permiteVariacoes === 'opcional'} />
    )}
    {template.produto.permiteModificadores && <SecaoModificadores />}
    {template.produto.camposExtras.map(c => <CampoExtra key={c.codigo} def={c} />)}
  </form>
);
```

### Padrão C — Validação

Cada template carrega seu **schema Zod** (ou um construtor `getProdutoSchema(template)` que monta dinamicamente). A validação roda no servidor (server actions) e no cliente (form).

```ts
export function getProdutoSchema(template: DashboardTemplate) {
  let schema = produtoBaseSchema;
  if (template.produto.permiteVariacoes === 'sempre') {
    schema = schema.extend({ variants: z.array(variantSchema).min(1) });
  }
  for (const campo of template.produto.camposExtras) {
    schema = schema.extend({ [campo.codigo]: campoToZod(campo) });
  }
  return schema;
}
```

---

## FALLBACKS E RETROCOMPATIBILIDADE

| Cenário | Comportamento |
|---------|--------------|
| `stores.categoria_id IS NULL` (loja antiga sem categoria) | `getTemplateByStore` retorna `generic` automaticamente. Onboarding é re-aberto na próxima sessão para forçar escolha. |
| Categoria com slug não mapeado | Fallback para `generic` + log de warning (defesa em profundidade) |
| Plano não comporta a feature do template (ex: lojista Básico em `fashion` cria 5 SKUs) | Plano vence: limite `max_produtos` se aplica ao total de variantes; UI explica e oferece upgrade |
| Super-admin troca categoria do lojista | Dashboard reflete mudança no próximo refresh; produtos legados ficam visíveis (campos não usados ocultos, dados preservados); evento gravado em `store_categoria_changes` |

---

## INTERAÇÃO COM PLANO DE ASSINATURA

O template **não substitui** o plano. Eles são ortogonais:

| | Básico | Profissional | Premium |
|---|:---:|:---:|:---:|
| `food` (sem variação) | ✅ | ✅ | ✅ |
| `fashion` (com variação) | limite 50 SKUs (variants contam!) | limite 500 SKUs | limite 5000 SKUs |
| Modificadores | ✅ | ✅ | ✅ |
| Estoque por variant | ✅ (já tem `tem_estoque`) | ✅ | ✅ |
| Receita médica (pharmacy) | ✅ | ✅ | ✅ |
| Relatório SNGPC | — | — | ✅ |
| Agenda multi-profissional | 1 profissional | até 3 | ilimitado |

**Regra:** o template define **o que pode aparecer**, o plano define **quanto/quanta vez**.

---

## TROCA DE CATEGORIA (= TROCA DE TEMPLATE)

**Política:** lojista **não troca** em auto-serviço. Garantido por RLS:

```sql
-- Detalhe completo em 07-categorias-e-pisos.md (seção "Troca de Categoria — Política")
CREATE POLICY stores_update_self ON stores FOR UPDATE
  USING (tenant_id = current_tenant_id())
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND categoria_id = (SELECT categoria_id FROM stores WHERE id = stores.id)
  );
```

**Como o lojista muda de nicho:**
- **Opção 1 (recomendada):** cria nova loja (planos Profissional+ permitem múltiplas lojas).
- **Opção 2:** abre ticket de suporte → super-admin avalia → executa update (com motivo registrado em `store_categoria_changes`).

**Auditoria:** toda mudança de categoria é gravada em `store_categoria_changes` com `motivo`, `changed_by` (admin), `categoria_anterior`, `categoria_nova`. Histórico permanente.

**Por que essa restrição:**
- Elimina classe inteira de bugs (lojista troca, produtos somem do app, agendamentos órfãos).
- Garante que loja categorizada como "Vestuário" sempre tenha as features de fashion.
- Reduz suporte: lojista não fica perdido escolhendo template.
- Padroniza experiência do consumer (todas as lojas de moda funcionam igual).

---

## TESTABILIDADE

- **Unit tests** para o registry: validar que todos os 6 templates têm campos obrigatórios preenchidos.
- **Snapshot tests** do form e da sidebar com cada template.
- **E2E (Playwright)** com 3 cenários: criar produto food com modificador, criar produto fashion com variação 3×3, criar serviço.

```ts
// packages/lib/templates/registry.test.ts
test.each(Object.values(TEMPLATES))('template $codigo é válido', (template) => {
  expect(templateContractSchema.parse(template)).toEqual(template);
  expect(template.codigo).toBeOneOf([...]);
});
```

---

## DIAGRAMA — FLUXO COMPLETO

```
┌──────────────┐
│  Onboarding  │  Wizard mostra 20 categorias com busca/exemplos
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  stores.categoria_id = (id de Vestuário)    │
│   → categories.slug = 'vestuario-calcados'  │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│ Lojista entra no dashboard                           │
│ layout.tsx busca store + categoria.slug              │
│ getTemplateByStore(store)                            │
│   → mapping: vestuario-calcados → 'fashion'          │
│   → registry: TEMPLATES['fashion']                    │
│ TemplateProvider injeta no contexto                  │
└──────┬───────────────────────────────────────────────┘
       │
       ├─► Sidebar: mostra/oculta menus
       ├─► Form produto: renderiza seções
       ├─► Validação: schema dinâmico
       └─► Copy: "Peça" em vez de "Produto"

       ▼
┌─────────────────────────────────────────────┐
│ Consumer abre loja no app mobile             │
│ recebe store.categoria.slug no payload       │
│ getTemplateByStore() → layout 'variacao'     │
└──────────────────────────────────────────────┘
```

---

## ALTERNATIVAS CONSIDERADAS E DESCARTADAS

| Alternativa | Por que não |
|-------------|-------------|
| **Fork de páginas** (`/produtos-food`, `/produtos-fashion`) | Multiplica código, dificulta manutenção, divergência rápida |
| **Feature flags por loja** | Vira sopa de flags; falta semântica de "tipo de loja" |
| **Sub-domínio por nicho** (`food.mallevo.app`) | Resolve consumer mas não dashboard; complexidade de infra alta |
| **Cada lojista escolhe campo a campo** | UX terrível ("o que é variação?"); paralisia de decisão |
| **Apps separados por nicho** | Ridículo no MVP; mata economia de escala da plataforma |

A escolha pelo **template declarativo registrado em `packages/lib`** dá:
- Uma fonte única da verdade
- Reuso entre dashboard e consumer
- Type-safety
- Onboarding fácil para novo dev (lê o registry e entende o app inteiro)
- Caminho claro para adicionar template novo (1 arquivo + entry no registry)

---

## CHECKLIST DE IMPLEMENTAÇÃO TÉCNICA

- [ ] Criar `packages/lib/templates/` com `types.ts`, `registry.ts` e `mapping.ts`
- [ ] Criar `packages/lib/pisos.ts` com 9 pisos (ver `07`)
- [ ] Implementar 6 templates (`food`, `fashion`, `pharmacy`, `pet`, `services`, `generic`)
- [ ] Criar `TemplateProvider` (React Context) em `packages/lib`
- [ ] Adicionar `useTemplate()` hook
- [ ] Adicionar coluna `categories.slug` + UNIQUE index (ver `03`)
- [ ] Reescrever `apps/web/seed-categories.js` com 20 categorias
- [ ] Sidebar consultando template via `getTemplateByStore()`
- [ ] Form de produto consultando template (com seções condicionais)
- [ ] Wizard de onboarding com 20 categorias, busca e exemplos
- [ ] RLS impedindo lojista de trocar `categoria_id`
- [ ] Tabela `store_categoria_changes` para auditoria de troca via admin
- [ ] Painel admin: lista de lojas em "Outros" com botão reclassificar
- [ ] Tests do registry, do mapping e do form
- [ ] Atualizar `docs/03` apontando para `dashboard-templates/`

---

> **Próximo:** `03-modelo-dados-variacoes-modificadores.md` detalha o schema SQL.
