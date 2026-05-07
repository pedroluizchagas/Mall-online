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
| **Mecanismo central** | Coluna `stores.template_codigo` (enum) determina o template ativo. Padrão: `food` para retrocompatibilidade. |
| **Templates iniciais** | `food` · `fashion` · `pharmacy` · `pet` · `services` · `generic` |
| **Variações de produto** | Nova tabela `product_variants` (SKU real) + `product_option_groups` + `product_options` |
| **Modificadores (food)** | Nova tabela `product_modifier_groups` + `product_modifiers` (sem virar SKU) |
| **Estoque** | Migração para nível **variant** quando aplicável; produtos sem variação mantêm estoque no produto (compatível) |
| **Plano** | Templates desbloqueiam features já cobradas pelo plano (variações entram no Profissional+) |
| **Sem breaking changes** | Migrations são aditivas; lojistas atuais não precisam reconfigurar nada |
| **UI** | Sidebar e formulário de produto **renderizam condicionalmente** com base no template; nada de fork de páginas |

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

---

## OS NICHOS PRIORITÁRIOS

```
┌─────────────────────────────────────────────────────────────────┐
│  PISO PRAÇA DE ALIMENTAÇÃO (food)                               │
│  Restaurantes · Lanchonetes · Cafeterias · Bares · Açaí · Doces │
│  → Modificadores · Tempo de preparo · Horário por dia           │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  PISO MODA & VESTUÁRIO (fashion)                                │
│  Roupas · Calçados · Acessórios · Lingerie                      │
│  → Grade tamanho × cor · SKU · Fotos por variação · Coleções    │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  PISO SAÚDE & FARMÁCIA (pharmacy)                               │
│  Farmácias · Manipulação · Suplementos                          │
│  → ANVISA · Lote · Validade · Receita obrigatória               │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  PISO PET (pet)                                                 │
│  Pet shops · Petiscos · Acessórios · Banho & tosa (serviço)     │
│  → Variação por porte (P/M/G/GG) e peso · Misto produto+serviço │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  PISO SERVIÇOS (services)                                       │
│  Salões · Estética · Manutenção · Aulas particulares            │
│  → Agendamento · Duração · Profissional · Não tem estoque       │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  PISO CASA & DIVERSOS (generic)                                 │
│  Eletrônicos · Casa · Decoração · Papelaria · Outros            │
│  → Variação opcional · SKU opcional · Garantia                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## ROTEIRO DE 6 FASES (resumo)

| Fase | Entrega | Esforço | Bloqueia? |
|------|---------|---------|-----------|
| **1. Fundação de schema** | Migrations: `template_codigo`, `product_variants`, `option_groups`, `modifier_groups`. Backfill `template_codigo='food'`. | 3-5 dias | Sim — tudo depende |
| **2. Registry de templates + sidebar condicional** | `packages/lib/templates/`, sidebar e onboarding renderizando por template | 3 dias | — |
| **3. Template `food` (modificadores)** | Form de produto com grupos de modificadores; consumer renderiza opções no carrinho | 5-7 dias | — |
| **4. Template `fashion` (variações)** | Form com grade SKU; consumer escolhe variação; estoque por variant | 7-10 dias | — |
| **5. Templates `pharmacy`, `pet`, `services`, `generic`** | Reutilizam Fase 3 e 4; campos extras específicos | 5-7 dias | — |
| **6. Migração assistida de lojistas existentes** | Wizard que detecta template adequado e oferece troca opt-in | 2-3 dias | Apenas após Fase 5 |

**Tempo total estimado:** 25 a 35 dias úteis (~6 semanas com 1 dev full-time + 1 designer parcial).

---

## PRINCÍPIOS DE DESIGN

1. **Aditivo, nunca destrutivo.** Toda migration e mudança de UI mantém os lojistas atuais funcionando sem precisar fazer nada.
2. **Declarativo, não imperativo.** Cada template é descrito por um objeto TypeScript no registry — não por `if/else` espalhados.
3. **Plano governa feature, template governa UX.** O plano (Básico/Pro/Premium) continua sendo a fronteira comercial; o template apenas escolhe **como apresentar** as features que o plano libera.
4. **Consumer único.** O app do consumidor renderiza qualquer template com a mesma estrutura — quem muda é o lojista. Isso protege o investimento mobile.
5. **Trocar template é seguro.** O lojista pode trocar (ex: virar de `generic` para `fashion`) e os dados persistem; campos não usados ficam ocultos, não são apagados.
6. **Defaults inteligentes.** O wizard de onboarding sugere o template com base na categoria escolhida, mas o lojista pode confirmar/alterar.

---

## DEPENDÊNCIAS DESTE TRABALHO

- Schema base: `docs/03-schema-completo-de-banco-de-dados.md` ✅
- Categorias globais já existem: `apps/web/seed-categories.js` ✅
- Coluna `stores.categoria_id`: `migration_20260425000001` ✅
- Plano com `tem_estoque`: `seed-plans.js` ✅
- Edge functions de pagamento (split Pagar.me): `docs/07-edge-functions-de-pagamento.md` ⚠️ *precisa entender preço de variação no momento do split — coberto no `05`*

---

## COMO USAR ESTA DOCUMENTAÇÃO

- **Pedro / decisão de produto:** leia `00`, `01` e `06`. Entenda o quê, o porquê e quando.
- **Engenharia (implementação):** leia `02`, `03`, `04` e `05` na ordem. São os contratos.
- **Design / UX:** leia `01` e `04`. Tem copy, fluxos e wireframes textuais.
- **Onboarding de novo dev no projeto:** leia tudo nesta pasta antes de tocar nas pastas `produtos/` e `categorias/` do dashboard.

---

## PRÓXIMOS PASSOS

1. Revisão desta proposta por Pedro.
2. Aprovação do escopo da **Fase 1** (schema).
3. Abertura da PR com migrations e início da implementação.

> **Status:** proposta aguardando validação. Nada implementado ainda.
