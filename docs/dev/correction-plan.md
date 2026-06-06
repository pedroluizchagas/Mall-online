# Plano de Correção — Mall-online / Mallora

> Tracker das correções acordadas após análise profissional do estado do
> projeto em **14/05/2026**. Documento vivo: o status de cada fase é
> atualizado conforme os PRs são mergeados.

---

## Contexto

Análise inicial identificou três blocos de débito:

1. **Higiene/visibilidade** — branch default desatualizada (`claude/marketplace-app-proposal-vZJZp`,
   63 commits atrás de `main`), `.env.example` sem variáveis Pagar.me,
   artefato HTML de 1,5 MB na raiz, ~40 branches `claude/*` órfãs.
2. **Débito da migração Stripe Connect → Pagar.me** — migration 007
   (drop das colunas Connect) prevista nos docs mas não criada;
   `apps/web/app/(auth)/onboarding/stripe/retry/page.tsx` ainda existe.
3. **Escalabilidade para 5k lojistas / 100k usuários** — mapeado em PR
   #1 (não mergeado): zero caching, ausência de paginação real, sem
   rate limiting, sem connection pooling, busca ILIKE sem trigram,
   notificações síncronas, spike no cron de payouts, sem
   monitoramento.

Stack permanece: monorepo pnpm + Turborepo, Next.js 14 (web/admin),
Expo SDK 54 (mobile-consumer/courier), Supabase, Pagar.me (pedidos) +
Stripe Billing (assinatura).

---

## Princípios de execução

1. Toda branch nova parte de `origin/main`.
2. Uma fase = um ou mais PRs pequenos, em draft, em sequência.
3. Validação obrigatória entre fases — o Tech Lead aprova cada
   relatório antes de emitir o próximo prompt.
4. Stripe Billing (assinatura do lojista) **não é tocado** — só Stripe
   Connect (pedidos) sai.
5. Mudanças destrutivas (drop columns, cron, default branch) exigem
   checkpoint explícito.

---

## Mapa de dependências

```
FASE 0 (higiene + visibilidade) ──────────────┐
                                              ▼
FASE 1 (encerrar débito Stripe Connect) ─────►┤
                                              ▼
FASE 2 (limpeza dos PRs abertos #1, #44) ────►┤
                                              ▼
FASE 3 (performance crítica — 4 sub-PRs) ────►┤
                                              ▼
FASE 4 (resiliência: rate-limit, fila, obs) ─►┤
                                              ▼
FASE 5 (pré-deploy / Fase 8 do roadmap)
```

Fases 0, 1 e 2 podem rodar em paralelo. Fase 3 abre após 0+1
mergeadas. 4 e 5 dependem de 3.

---

## FASE 0 — Higiene e visibilidade

| ID | Item | Risco | Status |
|---|---|---|---|
| 0.1 | Trocar default branch para `main` | Baixo | ✅ Concluído em 2026-06-06 (havia revertido para `marketplace`; refeito via `gh repo edit --default-branch main`) |
| 0.2 | Atualizar `.env.example` com Pagar.me | Nulo | ✅ PR #53 mergeado (commit `4d467a4`) |
| 0.3 | Remover `Mallevo Lojista _standalone_(1).html` | Baixo | ✅ PR #54 mergeado (commit `dd37fc8`) |
| 0.4 | Podar branches mergeadas (ahead=0 e >7d) | Médio | ✅ Concluído em 2026-06-06 — 50 branches remotas + 5 locais apagadas; repo reduzido a `main` (default) + este tracker (mergeado neste commit) |

## FASE 1 — Encerrar débito Stripe Connect

| ID | Item | Risco | Status |
|---|---|---|---|
| 1.1 | Auditar resíduos Stripe Connect (inclui artefatos mobile abaixo) | Nulo | ✅ Concluída — relatório validado |
| 1.2a | Refator do gate `stripe_onboarding_ok` → `pagarme_onboarding_status` em `create-subscription` | Baixo | ✅ PR #55 mergeado (commit `e172f80`) |
| 1.2b | Migration 007 + cleanup completo (web + mobile + docs + tipos) | Médio | ✅ PR #56 mergeado (commit `5eed1e6`) — aplicar migration em staging antes de prod |

**Achado crítico do 1.1:** `supabase/functions/create-subscription/index.ts:24,28` usa `stripe_onboarding_ok` (coluna Connect) como gate da assinatura Stripe Billing. Dropar a coluna sem refatorar quebra a função em produção. Solução: migrar gate para `pagarme_onboarding_status = 'active'` antes da migration 007.

**Inventário completo do cleanup (1.2b):**

Colunas a dropar (6) + índices (3):
- `tenants.stripe_account_id`, `tenants.stripe_onboarding_ok` (+ índice)
- `orders.stripe_payment_intent_id` (+ índice)
- `couriers.stripe_account_id`, `couriers.stripe_onboarding_ok` (+ índice `idx_couriers_stripe`)
- `payouts.stripe_transfer_id`

Arquivos a deletar:
- `apps/web/app/(auth)/onboarding/stripe/retry/page.tsx` (+ diretórios pai vazios)
- `apps/mobile-consumer/lib/stripe.ts`

Refatorar:
- `packages/types/src/supabase.ts` — remover entradas Row/Insert/Update para as 6 colunas
- `apps/web/components/dashboard/banner-status.tsx:10` — remover `'stripe_pendente'` do union
- `apps/mobile-consumer/package.json` — remover dependência `@stripe/stripe-react-native`
- `apps/mobile-consumer/app.json` — remover plugin `"@stripe/stripe-react-native"`
- `apps/mobile-consumer/app/_layout.tsx` (se houver) — remover `StripeProvider`
- `turbo.json:25` — remover `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` do `globalEnv`
- `.env.example` e `docs/09-variaveis-de-ambiente-e-secret.md` — remover linha DEPRECATED de `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `docs/15-consumer-app-auth-estrutura.md:1061` — remover checklist da variável
- `docs/27-deploy-e-infraestrutura.md:252,262,271` — remover variável dos 3 environments

## FASE 2 — Limpeza dos PRs abertos

| ID | Item | Risco | Status |
|---|---|---|---|
| 2.1 | Triagem PR #1 (docs blueprint/escalabilidade) | Nulo | ✅ Fechado sem merge — diff inflado (115 commits atrás); valor já no `correction-plan.md` |
| 2.1 | Triagem PR #44 (foundation Fase 2) | Nulo | ✅ Fechado sem merge — 5 tabelas já em main via migrations `pr_2_*`; conflito de timestamp |

## FASE 3 — Performance crítica

| ID | Item | Risco | Status |
|---|---|---|---|
| 3.1 | Paginação real + índices de FK | Baixo | ✅ Já feito (verificado 2026-06-06) — pedidos `.limit(100)`, relatórios `.limit+range de data`, avaliações/mensagens paginação `.range(PAGE_SIZE)`, busca `.limit(5/10)`; FKs já indexadas (orders/order_items/assignments/couriers/messages/reviews via `idx_*`/`idx_ss_*`/`idx_sb_*`). Sem gap real |
| 3.2 | Estratégia de cache (substituir `force-dynamic`) | Médio | ⚪ N/A prática — só 1 `force-dynamic` (home); demais páginas são per-user (leem cookie de auth) → dinâmicas por natureza. Dedup de tenant via `cache()` = ganho marginal, adiado |
| 3.3 | Trigram index para busca | Baixo | ✅ 2026-06-06 — migration `20260606120000_perf_trigram_search`: `pg_trgm` + GIN trigram em `stores.nome` e `products.nome` (ILIKE `%termo%` do consumer). Aplicada no remoto |
| 3.4 | Connection pooling (pooler URL) | Médio | ⚪ N/A — zero acesso Postgres direto; tudo via supabase-js (REST/PostgREST), que faz pool server-side. Pooler só importaria com driver PG direto (Prisma/postgres.js) |

## FASE 4 — Resiliência e observabilidade

| ID | Item | Risco | Status |
|---|---|---|---|
| 4.1 | Rate limiting (edge functions + APIs) | Médio | ☐ |
| 4.2 | Fila de notificações (notification_queue + cron) | Médio | ☐ |
| 4.3 | Batch do cron de payouts | Médio | ☐ |
| 4.4 | Observabilidade (Sentry + logs estruturados + alerts) | Baixo | ☐ |

## FASE 5 — Pré-deploy

| ID | Item | Risco | Status |
|---|---|---|---|
| 5.1 | Checklist deploy consolidado em `docs/dev/deploy-checklist.md` | Nulo | ☐ |

## FASE 6 — Blueprint v2 (pós-deploy)

| ID | Item | Risco | Status |
|---|---|---|---|
| 6.1 | Escrever blueprint atualizado da plataforma (arquitetura Pagar.me + Stripe Billing, dashboard pós Fases 1/2, templates por nicho) | Nulo | ☐ Fora do caminho crítico — só após Fase 5 e estabilização em produção |

Motivo: o blueprint do PR #1 fechado era da era Stripe Connect. Documentar um sistema que ainda muda (Fases 3/4) gera doc que envelhece rápido. Blueprint só vale escrito sobre estado estável de produção.

---

## Prompts (cada um é autocontido para o agente executor)

### Prompt 0.2 — Atualizar `.env.example`

Branch: `chore/env-example-pagarme` a partir de `origin/main`.

Atualize `/home/user/Mall-online/.env.example` para refletir a migração
de Stripe Connect → Pagar.me. Hoje ele só contém Supabase + Stripe.

1. Leia `.env.example` atual e os arquivos
   `supabase/functions/helpers/pagarme.ts`,
   `supabase/functions/create-pagarme-order/index.ts`,
   `supabase/functions/pagarme-webhook/index.ts`,
   `supabase/functions/onboard-tenant/index.ts` para identificar todas
   as variáveis Pagar.me usadas.
2. Liste também variáveis usadas nos mobile apps
   (`apps/mobile-consumer/app.json`, `apps/mobile-courier/app.json`)
   com prefixo `EXPO_PUBLIC_`.
3. Reescreva `.env.example` agrupando em seções: `# Supabase`,
   `# Pagar.me (pedidos)`, `# Stripe Billing (assinatura do lojista)`,
   `# Apps`, `# Expo`. Inclua placeholder e comentário curto para cada
   chave.
4. NÃO commitar valores reais — só placeholders.
5. Atualize `docs/09-variaveis-de-ambiente-e-secret.md` se houver
   divergência.

Commit, push, abra PR draft contra `main` com título
`chore: atualizar .env.example com variáveis Pagar.me`.

Retorne: lista de variáveis adicionadas, lista de removidas, URL do PR.

---

### Prompt 0.3 — Remover artefato HTML

Branch: `chore/remove-standalone-html` a partir de `origin/main`.

Existe um arquivo `Mallevo Lojista _standalone_(1).html` (1,5 MB) na
raiz. Já foi removido na branch `claude/add-reports-endpoint-ksrtI`
(commit `482b705`), mas não chegou a `main`.

`git rm "Mallevo Lojista _standalone_(1).html"`, commit
`chore: remove HTML standalone de prototipagem`, push, abra PR draft.

Retorne: confirmação do remove, URL do PR, tamanho do `.git` antes/depois.

---

### Prompt 0.4 — Podar branches mergeadas

Tarefa: listar e deletar (remoto) as branches `origin/claude/*` e
`origin/feat/*` que satisfazem **ambas** as condições:

- `git rev-list --count origin/main..origin/<branch>` == 0
  (conteúdo já em main via squash)
- último commit há mais de 7 dias

Não deletar:
- `origin/main`
- `origin/HEAD`
- `origin/claude/marketplace-app-proposal-vZJZp` (default branch atual
  — só será removível depois do item 0.1)
- branches com ahead > 0 (têm trabalho pendente)
- branches em PR aberto (#1, #44 hoje — checar via API)

Passos:
1. Gere a lista de candidatos com as colunas: nome, ahead, behind,
   dias_desde_ultimo_commit.
2. Apresente a lista no relatório final ANTES de deletar.
3. Para cada candidato confirmado, `git push origin --delete <branch>`.
4. NÃO deletar a branch local — só a remota.

Retorne: tabela das branches deletadas + lista das mantidas (com
motivo: PR aberto, ahead>0, recente).

---

### Prompt 1.1 — Auditoria de resíduos Stripe Connect

Tarefa só de pesquisa — nenhuma alteração de código.

A migração Stripe Connect → Pagar.me para **pedidos** foi concluída.
**Stripe Billing (assinatura do lojista) permanece e NÃO deve ser
tocado.**

Identifique todos os resíduos de Stripe **Connect** em `main`:

1. Colunas a remover do schema: `stripe_account_id`,
   `stripe_onboarding_ok`, `stripe_payment_intent_id`,
   `stripe_transfer_id` e qualquer outra `stripe_*` que **não** seja
   de Billing.
   - **Ficam:** `stripe_customer_id`, `stripe_subscription_id`,
     `stripe_price_id`, `stripe_product_id`.
2. Páginas/rotas: `apps/web/app/(auth)/onboarding/stripe/retry/page.tsx`
   e similares.
3. Edge Functions ainda referenciando colunas Connect.
4. Tipos em `packages/types/src/supabase.ts`.
5. Componentes/UI mencionando "Stripe Connect" ou "Express Dashboard".

Retorne 3 listas:
- **(A) colunas a dropar** (nome da coluna, tabela, migration que
  criou)
- **(B) arquivos a deletar** (caminho absoluto)
- **(C) referências a refatorar** (`file:linha` + sugestão curta)

Nenhuma alteração — só relatório.

---

### Prompts 1.2 e em diante

Emitidos pelo Tech Lead após validação dos relatórios da Fase 0+1.1.
Ver versionamento deste documento no histórico do PR.

---

## Histórico

| Data | Evento |
|---|---|
| 2026-05-14 | Análise inicial concluída; plano aprovado pelo product owner |
| 2026-05-14 | PR #53 (0.2) mergeado — `.env.example` reagrupado em 5 seções, 17 variáveis (incluindo `EXPO_PUBLIC_STRIPE` com nota DEPRECATED) |
| 2026-05-14 | Débito mobile Stripe registrado em Fase 1 após review do PR #53 |
| 2026-05-14 | PR #54 (0.3) mergeado — HTML standalone removido da raiz (182 linhas / ~1,5 MB) |
| 2026-05-14 | Default branch trocada para `main` no GitHub (item 0.1) — antiga `claude/marketplace-app-proposal-vZJZp` agora deletável pelo Prompt 0.4 |
| 2026-05-14 | Análise 0.4 concluída — 10 branches elegíveis para deleção; sandbox bloqueia `push --delete` (HTTP 403) e GitHub MCP não expõe `delete_branch`; deleção pendente para execução local pelo owner |
| 2026-05-14 | Auditoria 1.1 concluída — 6 colunas, 3 índices, 1 página, 9 ref de tipos, 1 dead value em UI; achado crítico: `create-subscription` usa `stripe_onboarding_ok` como gate. Fase 1.2 dividida em 1.2a (refator do gate) + 1.2b (migration + cleanup) |
| 2026-05-14 | PR #55 (1.2a) mergeado — gate migrado para `pagarme_onboarding_status = 'active'`; testes ampliados para cobrir `registration` e `affiliation`. Liberado o caminho para 1.2b |
| 2026-05-14 | PR #56 (1.2b) mergeado — migration 007 dropou 6 colunas + 3 índices; deletados retry page, lib/stripe.ts, plugin RN; cleanup em 4 docs. Fase 1 completa. **Pendente:** aplicar migration em staging antes do deploy de produção |
| 2026-05-14 | Migration 007 aplicada no banco remoto (`supabase db push`) — sem erros. Smoke test pendente |
| 2026-05-14 | Fase 2 concluída — PR #44 e PR #1 fechados sem merge (comentários explicativos publicados). Blueprint v2 registrado como Fase 6 (pós-deploy). Branches `claude/dashboard-phase-2-foundation-zr5do` e `claude/scalability-analysis-vjf6K` liberadas para poda |
