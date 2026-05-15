<!--
Copie este arquivo para specs/features/NNN-slug/spec.md
NNN = próximo número livre. slug = curto, kebab-case.
Não apague seções; se não se aplica, escreva "N/A — motivo".
-->

# Spec NNN — <Título da entrega>

| Campo | Valor |
|---|---|
| **ID** | NNN |
| **Status** | Rascunho |
| **Ator(es)** | lojista / consumidor / entregador / admin / plataforma |
| **Fase do roadmap** | F? |
| **Depende de** | (IDs de specs ou "nenhuma") |
| **Autor** | |
| **Aprovador (Tech Lead)** | |

## 1. Problema e objetivo

Um parágrafo: qual dor real, de qual ator, e qual o resultado esperado.
Por que agora.

## 2. Escopo

**Inclui:**
- ...

**NÃO inclui (fora de escopo):**
- ...

## 3. Estado atual

O que existe hoje no código relacionado a isto (arquivos/paths reais).
Stubs/mocks/TODO relevantes que esta spec resolve ou contorna.

## 4. Contrato

### 4.1 Modelo de dados
Tabelas/colunas novas ou alteradas, tipos, constraints, índices. Valores
monetários em centavos (`integer`).

### 4.2 RLS
Policies por ator para cada tabela tocada. Isolamento multi-tenant.

### 4.3 APIs / Edge Functions / Server Actions
Assinatura, input (schema Zod), output, erros, idempotência.
Compatibilidade com clientes mobile já publicados.

### 4.4 UI / UX
Telas/rotas afetadas, estados (carregando, vazio, erro, sucesso),
referência ao `docs/` de design quando aplicável.

## 5. Critérios de aceite (verificáveis)

Cada item deve ser checável por terceiro. Evite "funciona bem"; use
"dado X, quando Y, então Z".

- [ ] AC1 — ...
- [ ] AC2 — ...
- [ ] AC3 — ...

## 6. Plano de implementação

Passos técnicos ordenados. Arquivos a tocar. Ordem de deploy
(migration → edge function → UI) quando há acoplamento.

1. ...
2. ...

## 7. Tarefas

Checklist atômico (1 commit lógico por item).

- [ ] T1 — ...
- [ ] T2 — ...

## 8. Plano de teste

- Unidade: ...
- Integração / RLS: ...
- E2E: ...
- Verificação manual: ...

## 9. Riscos e rollback

| Risco | Probabilidade | Mitigação |
|---|---|---|
| | | |

Rollback: como reverter migration e código com segurança.

## 10. Definition of Done específica

Itens extras além de `specs/02-definicao-de-pronto.md` (se houver).

## 11. Decisões e referências

ADRs relacionados, docs de visão, links de PR.
