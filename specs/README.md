# Spec-Driven Development — Mallora

Este diretório é a **fonte da verdade** para finalizar a plataforma Mallora de
forma profissional, organizada e funcional. Aqui a especificação vem **antes**
do código: nada de relevância arquitetural entra no produto sem uma spec
aprovada.

> `docs/` descreve a **visão** do produto (o que queremos construir, em prosa).
> `specs/` descreve o **contrato de execução** (o que será construído agora,
> com critérios de aceite verificáveis e Definition of Done). Quando os dois
> divergirem, `specs/` vence para o trabalho em andamento e a `docs/` é
> atualizada.

## Estrutura

| Caminho | Função |
|---|---|
| `00-metodologia.md` | Como trabalhamos: ciclo spec → plano → tarefas → código → verificação. |
| `01-constituicao.md` | Princípios de engenharia inegociáveis. Toda spec herda deles. |
| `02-definicao-de-pronto.md` | Definition of Ready, Definition of Done e quality gates. |
| `03-estado-atual.md` | Gap analysis: o que está implementado vs. documentado vs. faltando. |
| `04-roadmap.md` | Roadmap faseado priorizado até o go-live (MVP de produção). |
| `_templates/spec-template.md` | Template obrigatório para toda nova spec de feature. |
| `_templates/adr-template.md` | Template de Architecture Decision Record. |
| `adr/` | Decisões arquiteturais registradas (uma por arquivo, imutáveis). |
| `features/` | Specs de feature, uma pasta por entrega. Nome: `NNN-slug/`. |

## Fluxo rápido

1. Pegue o próximo item priorizado em `04-roadmap.md`.
2. Crie `features/NNN-slug/spec.md` a partir de `_templates/spec-template.md`.
3. Spec revisada e aprovada (Definition of Ready em `02`).
4. Implemente seguindo a spec; abra PR draft vinculado à spec.
5. PR só fecha quando a Definition of Done (`02`) é satisfeita.
6. Atualize `03-estado-atual.md` e marque o item no `04-roadmap.md`.

## Princípio central

> Se não está na spec, não está no escopo. Se está na spec, tem critério de
> aceite verificável. Se não tem critério verificável, a spec não está pronta.
