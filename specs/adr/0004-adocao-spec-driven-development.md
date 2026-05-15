# ADR 0004 — Adoção de Spec-Driven Development para a finalização do projeto

| Campo | Valor |
|---|---|
| **Status** | Aceito |
| **Data** | 2026-05-15 |
| **Decisor** | Tech Lead / Arquitetura |
| **Specs afetadas** | Todas a partir de agora |

## Contexto

O desenvolvimento vinha sendo conduzido por "prompts de fase" (`docs/29`) sem
contrato de aceite único. Resultado: features parcialmente implementadas
(stubs, mocks, TODO) que aparentam completude, escopo difuso e dificuldade de
saber objetivamente o que falta para o go-live. A base já é grande e merece
processo profissional para fechar.

## Decisão

Adotar Spec-Driven Development como processo único de finalização, com
artefatos versionados em `specs/`: metodologia (`00`), constituição (`01`),
Definition of Ready/Done (`02`), gap analysis (`03`), roadmap (`04`),
templates e ADRs. Nenhuma mudança de impacto arquitetural entra sem spec
aprovada (Definition of Ready) e nenhum PR mergeia sem Definition of Done
demonstrada.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Continuar com prompts de fase | Falta de critério de aceite verificável; gera retrabalho e features falsas-prontas. |
| Kanban informal de issues | Sem contrato técnico nem gate de qualidade consistente. |
| Spec pesada tipo waterfall | Burocratiza; SDD aqui é leve e dispensa spec para chore/bugfix sem contrato. |

## Consequências

**Positivas:** rastreabilidade visão → spec → código → verificação; estado do
projeto sempre objetivamente conhecido; qualidade consistente.

**Negativas / dívidas aceitas:** overhead de escrever spec antes de codar
mudança arquitetural. Mitigado pela isenção de spec para correções pontuais
(`00` §"O que NÃO exige spec formal").

**Impacto na constituição:** institui a precedência da §7.
