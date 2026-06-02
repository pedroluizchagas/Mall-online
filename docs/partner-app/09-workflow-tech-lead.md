# 09 — Workflow Tech Lead

Ciclo de execução supervisionada, idêntico ao do storefront
(`docs/storefront/08-workflow-tech-lead.md`). O tech lead é dono do design;
o executor implementa um stage por vez.

## Ciclo por stage

```
Tech lead entrega o prompt do stage (08-prompts-execucao.md)
        │
        ▼
Executor implementa → commita na branch → produz RESUMO
        │
        ▼
Usuário devolve o RESUMO ao tech lead
        │
        ▼
Tech lead valida RESUMO contra os critérios de aceite do doc do stage
        │
        ├─ Conforme   → atualiza status em 00-INDEX.md → próximo stage
        ├─ Ajuste     → prompt de correção (escopo cirúrgico) → repete
        └─ Stage 5 ok → decide merge para main
```

## Ordem obrigatória

`0 → 1 → 2 → 3 → 4 → 5`. O Stage 0 é **bloqueante**: sem `store_videos` /
bucket / view não há onde publicar nem o que consumir. O Stage 5 é o último
(depende de tudo) e é o único que toca `apps/mobile-consumer` — coordenar com a
Fase 9 do redesign consumer (`docs/system-design/consumer/08-roadmap.md`) se
estiver ativa, para não conflitar no mesmo arquivo.

## Formato obrigatório do RESUMO (executor → tech lead)

```
## RESUMO — Stage <N>

### Feito
- <arquivo:linha> — o que foi implementado e por quê

### Migrations / schema (se houver)
- <arquivo> — o que muda, idempotência, rollback

### Decisões tomadas
- <decisão> — alternativa descartada e motivo

### Pendências para o tech lead
- <ambiguidade não resolvida> (NÃO chutada)

### Como validei
- typecheck/lint/teste manual executados e resultado
```

## Decisões que só o tech lead fecha (não o executor)

| Decisão | Onde | Default sugerido |
|---|---|---|
| `moderacao` default `approved` vs fila `pending` | Stage 0 §1 | `approved` (praticidade) |
| Predicado exato de `tenantPodePublicar` | Stage 2 | copiar do gate `pagarme_onboarding_status` atual |
| Teto de vídeos por plano (`plans.max_videos`) | Stage 0 §3 | `NULL` (ilimitado) no MVP |
| Like/comentário real vs visual local no consumer | Stage 5 | só `views` real no MVP |
| `eas.projectId` do novo app | Stage 1 | criar projeto EAS novo |
| Pipeline de vídeo B/C (transcode/Mux) | `01` §5 | manter A (client) até escala exigir |

Cada uma fechada deve ser registrada na tabela de status do `00-INDEX.md` ou
no campo correspondente da migration/código, para o executor seguinte não
reabrir.

## Definition of Done do MVP

- [ ] Lojista loga, grava no celular, publica em < 1 min de interação efetiva.
- [ ] Vídeo aparece no Explorar do consumer e toca em iOS e Android.
- [ ] Lojista vê, edita e remove os próprios vídeos; remoção some do feed na
      hora.
- [ ] `views` dá sinal de retorno real ao lojista.
- [ ] Zero regressão em `apps/web`, `apps/mobile-courier`,
      `apps/mobile-consumer` (fora a troca controlada do Stage 5).
- [ ] Nenhuma regra de negócio (gate, limite, ownership) duplicada no cliente —
      tudo em RLS / `packages/lib`.

## Atualização de status

Ao fim de cada stage aprovado, o tech lead atualiza a tabela "Status dos
stages" em `00-INDEX.md` (⬜ → ✅) e anota decisões fechadas. Esse arquivo é o
índice de verdade do progresso — mesma disciplina do storefront.
