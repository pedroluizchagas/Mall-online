# 02 — Arquitetura de Templates

### Como o sistema de templates é estruturado tecnicamente

*Versão 1.0 — 07/05/2026*

---

## OBJETIVO

Definir o **mecanismo central** que faz o dashboard se comportar de maneiras diferentes para cada lojista, sem fork de páginas, sem `if/else` espalhados e sem perder retrocompatibilidade. O resultado é um sistema **declarativo, testável e fácil de estender**: para adicionar um novo nicho, basta criar um objeto e registrá-lo.

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

## REGISTRY CENTRALIZADO

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

export function getTemplate(codigo: TemplateCodigo | null): DashboardTemplate {
  return TEMPLATES[codigo ?? 'food'];   // food é o fallback histórico
}
```

Cada arquivo (`food.ts`, `fashion.ts`, ...) exporta um objeto seguindo o contrato. Esse é o **único lugar** que descreve diferenças por nicho — toda UI consulta o registry.

---

## ONDE MORA O CÓDIGO

```
packages/lib/templates/
  ├── types.ts                # Contratos TypeScript
  ├── registry.ts             # Registry central
  ├── helpers.ts              # getTemplate(), isModuloHabilitado(), getCampoExtra()
  ├── food.ts                 # Template food
  ├── fashion.ts              # Template fashion
  ├── pharmacy.ts             # Template pharmacy
  ├── pet.ts                  # Template pet
  ├── services.ts             # Template services
  └── generic.ts              # Template generic
```

Por que `packages/lib`? Porque tanto o dashboard (web) quanto o app consumer (mobile) precisam ler o template (consumer renderiza PDP de forma diferente). Mantém uma fonte única.

---

## COMO O TEMPLATE É RESOLVIDO EM RUNTIME

### 1. No dashboard (lojista)

```
[lojista loga]
  ↓
layout.tsx faz SELECT na stores do tenant
  ↓
pega stores.template_codigo (default 'food')
  ↓
chama getTemplate(codigo) → retorna DashboardTemplate
  ↓
injeta via Context (TemplateProvider)
  ↓
todo componente filho usa useTemplate()
```

```tsx
// apps/web/app/(dashboard)/layout.tsx (sketch)
import { TemplateProvider } from '@mallevo/lib/templates';
import { getTemplate } from '@mallevo/lib/templates';

export default async function DashboardLayout({ children }) {
  const store = await getActiveStore();   // já existe
  const template = getTemplate(store.template_codigo);
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
loja vem com store.template_codigo no payload
  ↓
PDP escolhe layout: simples | variacao | cardapio | agendamento
```

### 3. Onboarding

Quando o lojista cria a loja, o wizard sugere o template com base na `categoria_id` escolhida (mapeamento `categoriasGlobais` no template). Lojista pode aceitar ou trocar.

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
| `stores.template_codigo IS NULL` (lojistas existentes) | Migration faz backfill `'food'` para todos |
| Template removido do registry (ex: deprecação futura) | Default volta a `'generic'` com warning logado |
| Plano não comporta a feature do template (ex: lojista Básico em `fashion` cria 5 SKUs) | Plano vence: limite `max_produtos` se aplica ao total de variantes; UI explica e oferece upgrade |
| Lojista troca de template (`food` → `fashion`) | Dados antigos preservados; campos sem uso ficam ocultos; products sem variant continuam vendáveis |

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

## TROCA DE TEMPLATE

Ações disponíveis:
- **Onboarding inicial:** lojista escolhe o template no wizard.
- **Migração assistida:** botão em `Configurações > Loja > Tipo de loja` permite trocar.
- **Sugestão automática (Fase 6):** sistema detecta padrão de produtos cadastrados e sugere troca (ex: lojista em `generic` que cadastrou 20 produtos com variação 2D → "que tal virar `fashion`?").

Ao trocar:

1. Confirmação modal: "Vamos trocar de `food` para `fashion`. Isso vai habilitar variações e mostrar novos campos. Seus produtos atuais continuam, e você pode adicionar variações depois."
2. Update em `stores.template_codigo`.
3. Sidebar e form atualizam imediatamente.
4. Email de confirmação para o lojista.

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
│  Onboarding  │  Wizard sugere template baseado em categoria_id
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│  stores.template_codigo = 'fashion'         │
│  stores.categoria_id = 'vestuario'          │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│ Lojista entra no dashboard                   │
│ layout.tsx → getTemplate('fashion')          │
│ → TemplateProvider injeta no contexto        │
└──────┬───────────────────────────────────────┘
       │
       ├─► Sidebar: mostra/oculta menus
       ├─► Form produto: renderiza seções
       ├─► Validação: schema dinâmico
       └─► Copy: "Peça" em vez de "Produto"

       ▼
┌─────────────────────────────────────────────┐
│ Consumer abre loja no app mobile             │
│ recebe store.template_codigo no payload      │
│ PDP escolhe layout 'variacao'                │
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

- [ ] Criar `packages/lib/templates/` com `types.ts` e `registry.ts`
- [ ] Implementar 6 templates (`food`, `fashion`, `pharmacy`, `pet`, `services`, `generic`)
- [ ] Criar `TemplateProvider` (React Context) em `packages/lib`
- [ ] Adicionar `useTemplate()` hook
- [ ] Adicionar coluna `stores.template_codigo` (ver `03`)
- [ ] Backfill `template_codigo='food'` para lojistas existentes
- [ ] Sidebar consultando template
- [ ] Form de produto consultando template (com seções condicionais)
- [ ] Wizard de onboarding com sugestão de template
- [ ] Página de troca de template em Configurações
- [ ] Tests do registry e do form
- [ ] Atualizar `docs/03` apontando para `dashboard-templates/`

---

> **Próximo:** `03-modelo-dados-variacoes-modificadores.md` detalha o schema SQL.
