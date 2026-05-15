# 00 — Metodologia: Spec-Driven Development

*Tech Lead / Arquitetura — Mallora*

## Por que SDD aqui

O projeto tem visão extensa (`docs/` com 31 documentos + redesigns) e uma base
de código já avançada, mas o desenvolvimento vinha sendo conduzido por "prompts
de fase" soltos. Isso gera três riscos: escopo difuso, retrabalho e features
"meio prontas" (stubs, mocks, TODO) que parecem completas. O SDD ataca os três:
toda entrega passa a ter contrato explícito, critério de aceite verificável e
Definition of Done única.

## O ciclo

```
ROADMAP  →  SPEC  →  PLANO  →  TAREFAS  →  IMPLEMENTAÇÃO  →  VERIFICAÇÃO  →  FECHAMENTO
 (04)      (feature)  (na spec)  (na spec)    (código + PR)    (quality gate)  (estado/roadmap)
```

### 1. Roadmap (`04-roadmap.md`)
Lista priorizada de entregas até o go-live. Cada item tem ID (`NNN`), título,
ator impactado, dependências e fase. É a única fila de trabalho oficial.

### 2. Spec (`features/NNN-slug/spec.md`)
Uma entrega = uma pasta = uma spec, criada a partir de
`_templates/spec-template.md`. A spec descreve **o quê** e **por quê**, define
o contrato (dados, APIs, RLS, UI) e os **critérios de aceite verificáveis**.
Não descreve **como** implementar linha a linha — isso é o plano.

Granularidade: uma spec deve ser mergeável em **1 PR revisável** (idealmente
< 600 linhas de diff de produto). Se for maior, quebre em sub-specs
(`NNN-slug/spec.md` + `NNN-slug/parte-2.md`) ou em múltiplos itens de roadmap.

### 3. Plano (seção dentro da spec)
Lista ordenada de passos técnicos: arquivos a tocar, migrations, edge functions,
ordem segura de deploy. É onde a decisão de implementação é registrada antes de
escrever código.

### 4. Tarefas (seção dentro da spec)
Checklist atômico derivado do plano. Cada tarefa é verificável e cabe em um
commit lógico.

### 5. Implementação
Branch a partir da branch de desenvolvimento designada. Commits pequenos
referenciando o ID da spec. PR aberto como **draft** já no primeiro commit,
com link para `features/NNN-slug/spec.md` no corpo.

### 6. Verificação
O PR só sai de draft quando **todos** os critérios de aceite da spec e a
Definition of Done (`02-definicao-de-pronto.md`) estão satisfeitos e
demonstrados (logs, prints, comandos colados no PR).

### 7. Fechamento
- Marcar critérios de aceite como atendidos na spec.
- Atualizar `03-estado-atual.md` (mover a feature para "implementado").
- Marcar o item em `04-roadmap.md`.
- Se houve decisão arquitetural nova, registrar ADR em `adr/`.
- Atualizar a `docs/` correspondente se a visão mudou.

## Papéis

| Papel | Responsabilidade |
|---|---|
| **Tech Lead / Arquiteto** | Mantém constituição, roadmap e ADRs. Aprova specs (Definition of Ready). Garante coerência entre entregas. |
| **Implementador** | Escreve a spec a partir do template, implementa, abre PR, demonstra a Definition of Done. |
| **Revisor** | Verifica spec ↔ código ↔ critérios de aceite. Bloqueia merge se a DoD não foi demonstrada. |

Em sessões assistidas por IA, o agente acumula os três papéis em sequência,
mas **nunca pula a etapa de spec aprovada antes de codar** algo com impacto
arquitetural (schema, RLS, pagamento, contrato de API, novo fluxo de ator).

## O que NÃO exige spec formal

Para não burocratizar, dispensam spec (mas seguem a constituição e a DoD):

- Correção de bug pontual sem mudança de contrato.
- Ajuste de copy, estilo ou a11y localizado.
- Refactor interno sem mudança de comportamento observável.
- Chore (deps, lint, config) sem efeito em runtime de domínio.

Tudo que mexe em **schema, RLS, dinheiro, autenticação, contrato de
Edge Function/Server Action, ou fluxo entre atores** exige spec aprovada,
sem exceção.

## Versionamento das specs

- A spec é viva **até o PR mergear**. Depois, vira registro histórico:
  alterações posteriores criam uma **nova** spec que referencia a anterior.
- Specs nunca são apagadas. Uma spec abandonada recebe status
  `Cancelada` com justificativa no cabeçalho.

## Status de uma spec

`Rascunho` → `Em revisão` → `Aprovada` → `Em implementação` → `Concluída`
(ou `Cancelada`). O status fica no cabeçalho da spec e no `04-roadmap.md`.
