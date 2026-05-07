# Templates de Dashboard por Nicho — Mallevo

### Proposta técnica e plano de implementação

*Versão 1.0 — 07/05/2026*

---

## CONTEXTO

O Mallevo nasceu como marketplace de delivery focado em comida e bebida, mas foi concebido como **shopping digital regional de Divinópolis MG** — abrangendo da praça de alimentação ao piso de casa e vida. À medida que lojistas de nichos heterogêneos começam a entrar no app, ficou evidente que **um único dashboard genérico não atende bem a nenhum deles**:

- Uma hamburgueria precisa de **modificadores** (ponto da carne, retirar cebola, adicionais), **horário de funcionamento por dia**, **tempo de preparo** e **fila em tempo real**.
- Uma loja de roupas precisa de **grade de variações** (tamanho × cor), **estoque por SKU**, **fotos por variação** e **gestão de coleções/temporadas**.
- Uma farmácia precisa de **bula/registro ANVISA**, **lote e validade** e **prescrição obrigatória**.
- Uma loja de eletrônicos precisa de **garantia**, **número de série** e **compatibilidade**.
- Um pet shop combina os dois mundos: alimentação (sem variação) e produtos (com variação por porte/peso).

A documentação atual (`docs/03`, `docs/11`, `docs/24`) foi pensada para o caso simples (produto único, preço único, estoque único). Esta proposta **estende** o sistema sem quebrar o que já está em produção, introduzindo o conceito de **Templates de Dashboard por Nicho** — um modo declarativo de configurar quais campos, módulos e fluxos cada lojista vê com base na categoria escolhida no onboarding.

---

## DECISÕES FECHADAS

| Tema | Decisão |
|------|---------|
| **Mecanismo central** | Template é **derivado da categoria do lojista**. Não há coluna `template_codigo` — o mapeamento `categoria → template` vive em `packages/lib/templates/mapping.ts`. |
| **Templates** | `food` · `fashion` · `pharmacy` · `pet` · `services` · `generic` |
| **Categorias-lojista** | **20 categorias exaustivas** (ver `07-categorias-e-pisos.md`), cada uma mapeia 1:1 para um template. Imutáveis em auto-serviço. |
| **Pisos-consumer** | **9 pisos curatoriais** (Praça de Alimentação, Moda, Saúde, Beleza, Pet, Casa & Vida, Mercado, Serviços, Presentes) — independentes da categoria-lojista. |
| **Troca de categoria** | Bloqueada pelo lojista (RLS impede `UPDATE`). Apenas super-admin troca, com motivo registrado em `store_categoria_changes`. |
| **Variações de produto** | Nova tabela `product_variants` (SKU real) + `product_option_groups` + `product_options` |
| **Modificadores (food)** | Nova tabela `product_modifier_groups` + `product_modifiers` (sem virar SKU) |
| **Estoque** | Migração para nível **variant** quando aplicável; produtos sem variação mantêm estoque no produto (compatível) |
| **Plano** | Templates desbloqueiam features já cobradas pelo plano (variações entram no Profissional+) |
| **Sem breaking changes** | Migrations são aditivas; lojistas atuais não precisam reconfigurar nada |
| **UI** | Sidebar e formulário de produto **renderizam condicionalmente** com base no template derivado; nada de fork de páginas |

---

## ESTRUTURA DESTA DOCUMENTAÇÃO

| Arquivo | Conteúdo | Quem lê |
|---------|----------|---------|
| **`00-INDEX.md`** *(este arquivo)* | Sumário executivo, decisões e roteiro | Todos |
| **`01-analise-de-nichos.md`** | Mapeamento de cada nicho: jornada, dores, requisitos funcionais | Produto, Design, Negócio |
| **`02-arquitetura-templates.md`** | Modelo de templates declarativos, contrato, registry, render condicional | Engenharia |
| **`03-modelo-dados-variacoes-modificadores.md`** | Schema SQL completo: `product_variants`, `product_option_groups`, `product_modifier_groups`, migração de estoque | Engenharia, DBA |
| **`04-templates-por-nicho.md`** | Especificação detalhada de cada template (food, fashion, pharmacy, pet, services, generic): campos, módulos, validações, copy | Engenharia, Design |
| **`05-impacto-consumer-e-checkout.md`** | Como variações e modificadores aparecem no app do consumidor, no carrinho, na order e no split Pagar.me | Engenharia consumer + pagamentos |
| **`06-roadmap-implementacao.md`** | Fases (1 a 6), critérios de aceite, riscos, métricas de sucesso | Pedro / Squad |
| **`07-categorias-e-pisos.md`** | **Taxonomia oficial:** 20 categorias-lojista (com slug, ícone e mapeamento para template) + 9 pisos-consumer + UX de onboarding + política de troca | Todos — fonte da verdade |

---

## OS 6 TEMPLATES E AS CATEGORIAS QUE OS DERIVAM

> A lista completa, com slugs e exemplos, está em **`07-categorias-e-pisos.md`**.

```
┌─────────────────────────────────────────────────────────────────────┐
│  TEMPLATE food (1 categoria)                                        │
│  ▸ Alimentos & Bebidas                                              │
│  → Modificadores · Tempo de preparo · Horário por dia               │
└─────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────┐
│  TEMPLATE fashion (2 categorias)                                    │
│  ▸ Vestuário & Calçados ▸ Acessórios & Joias                        │
│  → Grade tamanho × cor · SKU · Fotos por variação · Coleções        │
└─────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────┐
│  TEMPLATE pharmacy (1 categoria)                                    │
│  ▸ Farmácia & Medicamentos                                          │
│  → ANVISA · Lote · Validade · Receita obrigatória                   │
└─────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────┐
│  TEMPLATE pet (1 categoria)                                         │
│  ▸ Pet Shop                                                         │
│  → Variação por porte/peso · Toggle produto físico vs serviço       │
└─────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────┐
│  TEMPLATE services (5 categorias)                                   │
│  ▸ Salões & Estética ▸ Saúde & Bem-Estar ▸ Veterinária              │
│  ▸ Oficinas & Manutenção ▸ Aulas & Cursos                           │
│  → Agendamento · Duração · Profissional · Sem entregador            │
└─────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────┐
│  TEMPLATE generic (10 categorias)                                   │
│  ▸ Beleza & Cosméticos ▸ Eletrônicos & Tecnologia                   │
│  ▸ Casa & Decoração ▸ Construção & Ferramentas                      │
│  ▸ Papelaria & Livraria ▸ Brinquedos & Presentes                    │
│  ▸ Floricultura & Plantas ▸ Automotivo                              │
│  ▸ Mercado & Conveniência ▸ Outros (fallback rastreado)             │
│  → Variação opcional · Garantia · Marca/Modelo                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Pisos do consumer (curadoria de vitrine — 9 pisos)

🍽️ Praça de Alimentação · 👗 Moda & Estilo · ❤️ Saúde · 💅 Beleza · 🐾 Pet · 🏠 Casa & Vida · 🛒 Mercado · 🛠️ Serviços · 🎁 Presentes & Diversão

> Pisos são curatoriais: agregam livremente as categorias acima. Uma categoria pode aparecer em mais de um piso (ex: Veterinária aparece em Saúde **e** Pet).

---

## ROTEIRO DE 6 FASES (resumo)

| Fase | Entrega | Esforço | Bloqueia? |
|------|---------|---------|-----------|
| **1. Fundação de schema + taxonomia** | Migrations: `categories.slug`, `product_variants`, `option_groups`, `modifier_groups`, RLS de imutabilidade. Seed com 20 categorias. `mapping.ts` e `pisos.ts` em `packages/lib`. | 3-5 dias | Sim — tudo depende |
| **2. Onboarding novo + sidebar condicional** | Wizard com 20 categorias, busca, exemplos. Sidebar e form lendo template derivado. | 2-3 dias | — |
| **3. Template `food` (modificadores)** | Form de produto com grupos de modificadores; consumer renderiza opções no carrinho | 5-7 dias | — |
| **4. Template `fashion` (variações)** | Form com grade SKU; consumer escolhe variação; estoque por variant | 7-10 dias | — |
| **5. Templates `pharmacy`, `pet`, `services`, `generic`** | Reutilizam Fase 3 e 4; campos extras específicos | 5-7 dias | — |
| **6. Painel de "Outros" + telemetria** | Admin reclassifica lojas em "Outros"; dashboards de adoção por categoria/template | 2 dias | Apenas após Fase 5 |

**Tempo total estimado:** 24 a 34 dias úteis (~5-6 semanas com 1 dev full-time + 1 designer parcial).

---

## PRINCÍPIOS DE DESIGN

1. **Aditivo, nunca destrutivo.** Toda migration e mudança de UI mantém os lojistas atuais funcionando sem precisar fazer nada.
2. **Declarativo, não imperativo.** Cada template é descrito por um objeto TypeScript no registry — não por `if/else` espalhados.
3. **Plano governa feature, template governa UX.** O plano (Básico/Pro/Premium) continua sendo a fronteira comercial; o template apenas escolhe **como apresentar** as features que o plano libera.
4. **Consumer único.** O app do consumidor renderiza qualquer template com a mesma estrutura — quem muda é o lojista. Isso protege o investimento mobile.
5. **Categoria é decisão "para a vida" da loja.** Não há troca em auto-serviço — RLS impede UPDATE. Mudança via super-admin com motivo registrado. Lojista que precisar de outro nicho cria nova loja (planos Profissional+ permitem múltiplas).
6. **Categoria-lojista ≠ piso-consumer.** Categoria é técnica/operacional (define template). Piso é curatorial (define vitrine). São hierarquias independentes — editar piso não toca lojista.
7. **Zero lacunas.** As 20 categorias cobrem todo negócio plausível. "Outros" existe, mas é monitorado: ≥3 lojistas = sinal para criar categoria nova.

---

## DEPENDÊNCIAS DESTE TRABALHO

- Schema base: `docs/03-schema-completo-de-banco-de-dados.md` ✅
- Tabela `categories` com seed atual de 8 itens: `apps/web/seed-categories.js` ⚠️ **será reescrita com 20 categorias**
- Coluna `stores.categoria_id`: `migration_20260425000001` ✅ *é a única ligação entre loja e template*
- Plano com `tem_estoque`: `seed-plans.js` ✅
- Edge functions de pagamento (split Pagar.me): `docs/07-edge-functions-de-pagamento.md` ⚠️ *precisa entender preço de variação no momento do split — coberto em `05`*

---

## COMO USAR ESTA DOCUMENTAÇÃO

- **Pedro / decisão de produto:** leia `00`, `01`, `07` e `06`. Entenda o quê, como categorizamos, o porquê e quando.
- **Engenharia (implementação):** leia `02`, `03`, `04`, `05` e `07` na ordem. São os contratos.
- **Design / UX:** leia `01`, `04` e `07`. Tem copy, fluxos e wireframes textuais.
- **Marketing / Curadoria:** leia `07`. Pisos do consumer são editáveis livremente — qualquer ajuste lá não afeta lojistas.
- **Onboarding de novo dev no projeto:** leia tudo nesta pasta antes de tocar nas pastas `produtos/` e `categorias/` do dashboard.

---

## PRÓXIMOS PASSOS

1. Revisão desta proposta por Pedro.
2. Aprovação do escopo da **Fase 1** (schema).
3. Abertura da PR com migrations e início da implementação.

> **Status:** proposta aguardando validação. Nada implementado ainda.
