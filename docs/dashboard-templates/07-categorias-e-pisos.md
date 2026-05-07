# 07 — Categorias do Lojista e Pisos do Consumer

### Taxonomia exaustiva, mapeamento para templates e curadoria de vitrine

*Versão 1.0 — 07/05/2026*

---

## OBJETIVO

Definir **dois sistemas de classificação independentes** que regem o Mallevo:

1. **Categoria do lojista** — operacional, exaustiva, imutável em auto-serviço. Define o template do dashboard.
2. **Piso do consumer** — curatorial, livre, editável a qualquer momento pela equipe. Organiza a vitrine do app.

São hierarquias **separadas**, conectadas por um mapeamento em código (não em DB). Editar piso não afeta lojista. Trocar categoria de um lojista é operação administrativa.

---

## PRINCÍPIOS

1. **Zero lacunas.** Todo negócio existente em Divinópolis deve caber em **uma** categoria — sem ambiguidade. "Outros" existe, mas é monitorado e gera alerta para criar categoria nova.
2. **Mapeamento 1:1 com template.** Cada categoria mapeia para exatamente 1 template. O lojista não escolhe template — escolhe categoria, e o template vem junto.
3. **Pisos são curatoriais.** Uma categoria pode aparecer em múltiplos pisos. Um piso pode agregar múltiplas categorias. Marketing e produto editam livremente.
4. **Imutabilidade da categoria.** Após onboarding, lojista não troca categoria sozinho. Mudança via super-admin ou criar nova loja (plano Profissional+ permite).

---

## CATEGORIAS DO LOJISTA (20)

Lista completa, com slug estável, ícone padrão e template derivado:

| # | Slug | Nome (UI) | Ícone | Template | Exemplos |
|:-:|------|-----------|:-:|:--------:|----------|
| 1 | `alimentos-bebidas` | Alimentos & Bebidas | 🍽️ | `food` | Restaurante, lanchonete, hambúrgueria, pizza, café, padaria, doceria, açaí, bar |
| 2 | `vestuario-calcados` | Vestuário & Calçados | 👗 | `fashion` | Roupa fem/masc/infantil, lingerie, moda praia/fitness, sapato |
| 3 | `acessorios-joias` | Acessórios & Joias | 👜 | `fashion` | Bolsa, óculos, cinto, joia, bijuteria, relógio |
| 4 | `farmacia-medicamentos` | Farmácia & Medicamentos | 💊 | `pharmacy` | Drogaria, manipulação, suplemento, ortopédico, material hospitalar |
| 5 | `beleza-cosmeticos` | Beleza & Cosméticos | 💄 | `generic` | Perfumaria, maquiagem, esmalte, cabelo (produto) |
| 6 | `saloes-estetica` | Salões & Estética | ✂️ | `services` | Cabeleireiro, barbearia, manicure, estética, spa, massagem, tatuagem |
| 7 | `saude-bem-estar` | Saúde & Bem-Estar | 🩺 | `services` | Clínica, fisio, nutricionista, psicólogo, terapeuta |
| 8 | `pet-shop` | Pet Shop | 🐶 | `pet` | Pet shop com produto e/ou banho & tosa |
| 9 | `veterinaria` | Veterinária | 🏥 | `services` | Clínica vet, consulta, vacinação |
| 10 | `eletronicos-tecnologia` | Eletrônicos & Tecnologia | 📱 | `generic` | Celular, computador, gadgets, periféricos, assistência |
| 11 | `casa-decoracao` | Casa & Decoração | 🛋️ | `generic` | Móveis, utensílios, eletrodomésticos, decoração |
| 12 | `construcao-ferramentas` | Construção & Ferramentas | 🔨 | `generic` | Material de construção, ferramentas, tintas |
| 13 | `papelaria-livraria` | Papelaria & Livraria | 📚 | `generic` | Papelaria, livro, material escolar |
| 14 | `brinquedos-presentes` | Brinquedos & Presentes | 🎁 | `generic` | Brinquedo, presente, festa, lembrancinha |
| 15 | `floricultura-plantas` | Floricultura & Plantas | 🌷 | `generic` | Flor, planta, jardinagem |
| 16 | `automotivo` | Automotivo | 🚗 | `generic` | Acessório automotivo, autopeça (loja, não oficina) |
| 17 | `mercado-conveniencia` | Mercado & Conveniência | 🛒 | `generic` | Mercearia, distribuidora, conveniência, tabacaria |
| 18 | `oficinas-manutencao` | Oficinas & Manutenção | 🛠️ | `services` | Mecânica, encanador, eletricista, pintor, montador |
| 19 | `aulas-cursos` | Aulas & Cursos | 🎓 | `services` | Aula particular, curso, instrutor, professor |
| 20 | `outros` | Outros | 📦 | `generic` | **Fallback rastreado** — admin é alertado |

**Distribuição por template:**

| Template | Qtde categorias | Slugs |
|----------|:---------------:|-------|
| `food` | 1 | alimentos-bebidas |
| `fashion` | 2 | vestuario-calcados, acessorios-joias |
| `pharmacy` | 1 | farmacia-medicamentos |
| `pet` | 1 | pet-shop |
| `services` | 5 | saloes-estetica, saude-bem-estar, veterinaria, oficinas-manutencao, aulas-cursos |
| `generic` | 10 | beleza-cosmeticos, eletronicos-tecnologia, casa-decoracao, construcao-ferramentas, papelaria-livraria, brinquedos-presentes, floricultura-plantas, automotivo, mercado-conveniencia, outros |

---

## DECISÕES DE LIMITE

Decisões já tomadas para evitar ambiguidade no momento do cadastro:

| Caso de borda | Categoria | Justificativa |
|---------------|-----------|---------------|
| Padaria (com forno próprio) | `alimentos-bebidas` (food) | Core é produção própria |
| Mercearia / distribuidora | `mercado-conveniencia` (generic) | Sem produção, varejo embalado |
| Suplemento esportivo / vitamina | `farmacia-medicamentos` (pharmacy) | Tem lote/validade regulamentada |
| Cosmético (não-medicamento) | `beleza-cosmeticos` (generic) | Não tem regulação ANVISA forte |
| Floricultura | `floricultura-plantas` (generic) | Buquês são produto, não serviço agendado |
| Pet shop com banho | `pet-shop` (pet) | Template pet já cobre produto + serviço |
| Clínica veterinária pura | `veterinaria` (services) | Agendamento é o core |
| Oficina mecânica | `oficinas-manutencao` (services) | Agendamento + serviço, não venda |
| Loja de autopeça | `automotivo` (generic) | Venda de produto físico |
| Tabacaria/conveniência | `mercado-conveniencia` (generic) | Varejo de produtos embalados |
| Tatuagem | `saloes-estetica` (services) | Agendamento + procedimento |
| Material de construção | `construcao-ferramentas` (generic) | Produto físico |
| Pet shop só produtos (sem banho) | `pet-shop` (pet) | Mesmo assim usa pet — toggle "tem serviço" fica desligado |
| Distribuidora de bebida | `mercado-conveniencia` (generic) | Não é praça de alimentação (não consome no local) |
| Aula online ao vivo | `aulas-cursos` (services) | Agendamento de horário |
| Curso gravado (assinatura) | ⚠️ fora do MVP | Não combina com modelo de pedido único |

---

## PISOS DO CONSUMER (9)

Curadoria editável da equipe. Define como o app organiza a vitrine. **Não é tabela em DB** — vive em `packages/lib/pisos.ts`.

| Slug | Nome (UI) | Ícone | Categorias agregadas |
|------|-----------|:-:|----------------------|
| `praca-alimentacao` | Praça de Alimentação | 🍽️ | alimentos-bebidas |
| `moda-estilo` | Moda & Estilo | 👗 | vestuario-calcados, acessorios-joias |
| `saude` | Saúde | ❤️ | farmacia-medicamentos, saude-bem-estar, veterinaria |
| `beleza` | Beleza | 💅 | saloes-estetica, beleza-cosmeticos |
| `pet` | Pet | 🐾 | pet-shop, veterinaria |
| `casa-vida` | Casa & Vida | 🏠 | casa-decoracao, construcao-ferramentas, eletronicos-tecnologia, floricultura-plantas, automotivo |
| `mercado` | Mercado | 🛒 | mercado-conveniencia |
| `servicos` | Serviços | 🛠️ | oficinas-manutencao, aulas-cursos, saloes-estetica, saude-bem-estar |
| `presentes-diversao` | Presentes & Diversão | 🎁 | brinquedos-presentes, papelaria-livraria, floricultura-plantas |

**Notas de design:**
- **Veterinária** aparece em **Saúde** e **Pet** — consumidor pensa nas duas formas, e ambos os pisos devem listar a clínica.
- **Salões** aparecem em **Beleza** e **Serviços** — quem busca corte de cabelo vai por Beleza; quem busca "agendar serviço" vai por Serviços.
- **Floricultura** aparece em **Casa & Vida** (planta para casa) e **Presentes** (buquê).
- **Brinquedos** ficam só em Presentes — não viram piso próprio porque volume não justifica no MVP.

---

## ESTRUTURA TÉCNICA

### Tabela `categories` (já existe)

Reaproveitar a tabela atual com tenant_id NULL (categorias globais). Recriar via seed:

```js
// apps/web/seed-categories.js (nova versão)
const categorias = [
  { slug: 'alimentos-bebidas',     nome: 'Alimentos & Bebidas',      icone: '🍽️', ordem: 1 },
  { slug: 'vestuario-calcados',    nome: 'Vestuário & Calçados',     icone: '👗', ordem: 2 },
  { slug: 'acessorios-joias',      nome: 'Acessórios & Joias',        icone: '👜', ordem: 3 },
  { slug: 'farmacia-medicamentos', nome: 'Farmácia & Medicamentos',   icone: '💊', ordem: 4 },
  { slug: 'beleza-cosmeticos',     nome: 'Beleza & Cosméticos',       icone: '💄', ordem: 5 },
  { slug: 'saloes-estetica',       nome: 'Salões & Estética',         icone: '✂️', ordem: 6 },
  { slug: 'saude-bem-estar',       nome: 'Saúde & Bem-Estar',         icone: '🩺', ordem: 7 },
  { slug: 'pet-shop',              nome: 'Pet Shop',                  icone: '🐶', ordem: 8 },
  { slug: 'veterinaria',           nome: 'Veterinária',                icone: '🏥', ordem: 9 },
  { slug: 'eletronicos-tecnologia',nome: 'Eletrônicos & Tecnologia',  icone: '📱', ordem: 10 },
  { slug: 'casa-decoracao',        nome: 'Casa & Decoração',          icone: '🛋️', ordem: 11 },
  { slug: 'construcao-ferramentas',nome: 'Construção & Ferramentas',  icone: '🔨', ordem: 12 },
  { slug: 'papelaria-livraria',    nome: 'Papelaria & Livraria',      icone: '📚', ordem: 13 },
  { slug: 'brinquedos-presentes',  nome: 'Brinquedos & Presentes',    icone: '🎁', ordem: 14 },
  { slug: 'floricultura-plantas',  nome: 'Floricultura & Plantas',    icone: '🌷', ordem: 15 },
  { slug: 'automotivo',            nome: 'Automotivo',                 icone: '🚗', ordem: 16 },
  { slug: 'mercado-conveniencia',  nome: 'Mercado & Conveniência',    icone: '🛒', ordem: 17 },
  { slug: 'oficinas-manutencao',   nome: 'Oficinas & Manutenção',     icone: '🛠️', ordem: 18 },
  { slug: 'aulas-cursos',          nome: 'Aulas & Cursos',            icone: '🎓', ordem: 19 },
  { slug: 'outros',                nome: 'Outros',                     icone: '📦', ordem: 20 },
];
```

> **Migração:** o seed atual de `apps/web/seed-categories.js` usa 8 categorias. A nova versão substitui o conteúdo. Categorias antigas ficam no banco como dado morto (não há lojista usando ainda em produção real). Se houver, super-admin re-classifica antes do seed novo.

### Coluna `categories.slug`

Hoje a tabela `categories` tem `nome` mas não `slug` estável (`docs/03-schema-completo-de-banco-de-dados.md` linha 223-238). Precisa adicionar:

```sql
-- supabase/migrations/20260507000007_migration_014_categories_slug.sql
ALTER TABLE categories ADD COLUMN slug TEXT;
CREATE UNIQUE INDEX uq_categories_global_slug
  ON categories(slug) WHERE tenant_id IS NULL;
```

> **Renumera a Migration 014 do plano original** (que era `stores.template_codigo`) para usar **`categories.slug`** em vez disso. A coluna `template_codigo` foi descartada — ver decisão em `02-arquitetura-templates.md`.

### Mapeamento categoria → template em código

```ts
// packages/lib/templates/mapping.ts
import type { TemplateCodigo } from './types';

export const CATEGORIA_SLUG_TO_TEMPLATE = {
  'alimentos-bebidas':       'food',
  'vestuario-calcados':      'fashion',
  'acessorios-joias':        'fashion',
  'farmacia-medicamentos':   'pharmacy',
  'beleza-cosmeticos':       'generic',
  'saloes-estetica':         'services',
  'saude-bem-estar':         'services',
  'pet-shop':                'pet',
  'veterinaria':             'services',
  'eletronicos-tecnologia':  'generic',
  'casa-decoracao':          'generic',
  'construcao-ferramentas':  'generic',
  'papelaria-livraria':      'generic',
  'brinquedos-presentes':    'generic',
  'floricultura-plantas':    'generic',
  'automotivo':              'generic',
  'mercado-conveniencia':    'generic',
  'oficinas-manutencao':     'services',
  'aulas-cursos':            'services',
  'outros':                  'generic',
} as const satisfies Record<string, TemplateCodigo>;

export function getTemplateBySlug(slug: string | null | undefined): TemplateCodigo {
  if (!slug) return 'generic';
  return CATEGORIA_SLUG_TO_TEMPLATE[slug] ?? 'generic';
}

export function getTemplateByStore(store: { categoria?: { slug?: string } | null }): TemplateCodigo {
  return getTemplateBySlug(store.categoria?.slug);
}
```

> **Não existe `stores.template_codigo`.** Sempre derivado de `stores.categoria_id → categories.slug → template`.

### Pisos em código

```ts
// packages/lib/pisos.ts
export interface Piso {
  slug: string;
  nome: string;
  icone: string;
  categoriasSlugs: readonly string[];
  ordem: number;
}

export const PISOS: readonly Piso[] = [
  { slug: 'praca-alimentacao', nome: 'Praça de Alimentação', icone: '🍽️', ordem: 1,
    categoriasSlugs: ['alimentos-bebidas'] },
  { slug: 'moda-estilo', nome: 'Moda & Estilo', icone: '👗', ordem: 2,
    categoriasSlugs: ['vestuario-calcados', 'acessorios-joias'] },
  { slug: 'saude', nome: 'Saúde', icone: '❤️', ordem: 3,
    categoriasSlugs: ['farmacia-medicamentos', 'saude-bem-estar', 'veterinaria'] },
  { slug: 'beleza', nome: 'Beleza', icone: '💅', ordem: 4,
    categoriasSlugs: ['saloes-estetica', 'beleza-cosmeticos'] },
  { slug: 'pet', nome: 'Pet', icone: '🐾', ordem: 5,
    categoriasSlugs: ['pet-shop', 'veterinaria'] },
  { slug: 'casa-vida', nome: 'Casa & Vida', icone: '🏠', ordem: 6,
    categoriasSlugs: ['casa-decoracao', 'construcao-ferramentas', 'eletronicos-tecnologia',
                      'floricultura-plantas', 'automotivo'] },
  { slug: 'mercado', nome: 'Mercado', icone: '🛒', ordem: 7,
    categoriasSlugs: ['mercado-conveniencia'] },
  { slug: 'servicos', nome: 'Serviços', icone: '🛠️', ordem: 8,
    categoriasSlugs: ['oficinas-manutencao', 'aulas-cursos', 'saloes-estetica', 'saude-bem-estar'] },
  { slug: 'presentes-diversao', nome: 'Presentes & Diversão', icone: '🎁', ordem: 9,
    categoriasSlugs: ['brinquedos-presentes', 'papelaria-livraria', 'floricultura-plantas'] },
] as const;

export function getPisosByCategoria(categoriaSlug: string): Piso[] {
  return PISOS.filter(p => p.categoriasSlugs.includes(categoriaSlug));
}
```

---

## ONBOARDING DA LOJA — UX

A escolha de categoria é **a decisão crítica** do onboarding agora. UX recomendada:

```
┌─ Que tipo de negócio você tem? ───────────────────────────┐
│                                                            │
│  [🔍 Buscar...                                          ]   │
│                                                            │
│  Mais comuns:                                              │
│   ┌──────────────────┐ ┌──────────────────┐               │
│   │ 🍽️ Alimentos &   │ │ 👗 Vestuário &   │               │
│   │    Bebidas       │ │    Calçados      │               │
│   └──────────────────┘ └──────────────────┘               │
│   ┌──────────────────┐ ┌──────────────────┐               │
│   │ 💊 Farmácia &    │ │ 🐶 Pet Shop      │               │
│   │    Medicamentos  │ │                  │               │
│   └──────────────────┘ └──────────────────┘               │
│                                                            │
│  Ver todas (16 outras) ▼                                   │
│                                                            │
│  Não encontrou? Clique aqui — vamos te ajudar.             │
└────────────────────────────────────────────────────────────┘
```

**Após selecionar:**

```
┌─ Você selecionou: Vestuário & Calçados ───────────────────┐
│                                                            │
│  Ótimo! Sua loja vai aparecer na vitrine "Moda & Estilo". │
│                                                            │
│  O Mallevo vai te dar um dashboard otimizado para vender:  │
│   ✓ Variações de tamanho × cor (grade de SKU)              │
│   ✓ Estoque por SKU                                         │
│   ✓ Foto por cor                                            │
│   ✓ Coleções e tags                                         │
│                                                            │
│  Esta escolha define como sua loja funciona. Você pode     │
│  trocar mais tarde via suporte se for necessário.          │
│                                                            │
│  [Voltar]                              [Confirmar e seguir]│
└────────────────────────────────────────────────────────────┘
```

**Comportamento:**
- Lojista vê **as 4 categorias mais comuns** primeiro (curadoria), com link para ver todas.
- Busca textual cobre nome + exemplos (ex: "hambúrguer" → match em Alimentos & Bebidas).
- Confirmação explícita com explicação do que vai habilitar.
- Mensagem clara: **trocar é via suporte**.

---

## TROCA DE CATEGORIA — POLÍTICA

| Quem | Pode? | Como |
|------|-------|------|
| Lojista (auto-serviço) | ❌ Não | Restrição UI + restrição RLS |
| Super-admin | ✅ Sim | Painel admin com motivo obrigatório registrado |
| Pelo lojista, com ajuda | ⚠️ Indireto | Abre ticket de suporte; admin avalia |

**RLS impede UPDATE:**

```sql
-- supabase/migrations/20260507000008_rls_categoria_imutavel.sql
DROP POLICY IF EXISTS stores_update_categoria ON stores;

CREATE POLICY stores_update_self ON stores FOR UPDATE
  USING (tenant_id = current_tenant_id())
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND categoria_id = (SELECT categoria_id FROM stores WHERE id = stores.id)
  );

-- Admin tem policy separada já em migration 008
```

> O `WITH CHECK` impede que o lojista mude `categoria_id` em qualquer UPDATE. Só admin (com policy separada) consegue.

**Auditoria:**

```sql
CREATE TABLE store_categoria_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  categoria_anterior UUID,
  categoria_nova UUID NOT NULL,
  motivo TEXT NOT NULL,
  changed_by UUID NOT NULL,            -- admin user
  changed_at TIMESTAMPTZ DEFAULT now()
);
```

Trigger preenche essa tabela toda vez que admin trocar a categoria. Histórico fica sempre disponível.

---

## TRATAMENTO DE "OUTROS"

Quando lojista escolhe `outros`:

1. Cadastro segue normal com template `generic`.
2. Evento `categoria_outros_selecionada` é disparado para super-admin.
3. Lojista preenche um campo livre **"O que você vende?"** (text único, opcional mas estimulado).
4. Super-admin vê dashboard "Lojas em Outros" com:
   - Lista de lojas
   - Texto livre que escreveram
   - Botão "Reclassificar para [categoria sugerida]"
5. Quando ≥3 lojistas em 30 dias caem em "Outros" com texto similar (clustering manual ou automático), abrir issue para criar nova categoria.

**Meta:** menos de 5% das lojas em "Outros" após 6 meses.

---

## EVOLUÇÃO DE CATEGORIAS NO TEMPO

Adicionar categoria nova:

1. Adicionar entrada no `seed-categories.js` (com slug novo, único).
2. Adicionar mapeamento em `CATEGORIA_SLUG_TO_TEMPLATE`.
3. Atualizar `PISOS` se a categoria entra em algum piso.
4. Rodar seed (idempotente).
5. Lojistas existentes em "Outros" podem ser reclassificados pelo admin.

Renomear categoria:

- Trocar **nome** sem trocar slug é seguro (UI muda, código não).
- Trocar **slug** quebra mapeamento — proibido em produção. Se inevitável, criar nova e depreciar antiga.

Deletar categoria:

- Só se não houver loja usando.
- Senão, super-admin migra as lojas primeiro.

---

## CHECKLIST DE IMPLEMENTAÇÃO (Fase 1 e 2)

- [ ] Migration: `categories.slug` com unique partial index
- [ ] Reescrever `apps/web/seed-categories.js` com 20 entradas
- [ ] Rodar seed em staging e verificar
- [ ] Criar `packages/lib/templates/mapping.ts` com `CATEGORIA_SLUG_TO_TEMPLATE`
- [ ] Criar `packages/lib/pisos.ts` com 9 pisos
- [ ] Atualizar `helpers.ts` para `getTemplateByStore(store)` em vez de `getTemplate(codigo)`
- [ ] Atualizar onboarding (`apps/web/app/(auth)/onboarding/etapas/dados-loja.tsx`) com novo UX de seleção
- [ ] Atualizar layout do dashboard para resolver template via store.categoria
- [ ] RLS impedindo lojista de trocar categoria
- [ ] Tabela `store_categoria_changes` para auditoria
- [ ] Painel admin: lista de lojas em "Outros" + botão reclassificar
- [ ] Atualizar consumer mobile: navegar por piso, dentro de cada piso filtra lojas pelas categorias agregadas
- [ ] Telemetria: contar lojas por categoria, alertar quando "Outros" cresce

---

## RESUMO

- **20 categorias-lojista** exaustivas, cada uma mapeia para 1 template, sem ambiguidade.
- **9 pisos-consumer** curatoriais, agregam categorias livremente, vivem em código.
- **Categoria é imutável em auto-serviço** — RLS bloqueia, super-admin tem poder.
- **Template é derivado**, nunca armazenado na tabela stores.
- **"Outros" é honesto e rastreado**, gera melhoria contínua na taxonomia.

---

> **Este documento é a fonte da verdade da taxonomia.** Toda mudança em categorias ou pisos passa por aqui antes de virar código.
