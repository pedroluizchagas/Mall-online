# 01 — Constituição de Engenharia

*Princípios inegociáveis. Toda spec e todo PR herdam destas regras. Uma
violação é motivo de bloqueio de merge, não de discussão caso a caso.*

## 1. Dinheiro

1.1. Todo valor monetário é `integer` em **centavos**. Float é proibido em
qualquer ponto que represente dinheiro (banco, edge function, UI state).

1.2. Cálculo financeiro (split, taxa de antecipação, repasse, comissão) vive
em função pura, isolada e **testada por unidade**. Nenhuma aritmética de
dinheiro inline em handler de UI ou em SQL ad-hoc.

1.3. Toda operação financeira externa (Pagar.me/Stripe) é **idempotente**:
chave de idempotência derivada de identificador estável do domínio
(`order_id`, `payout_id`). Webhook reprocessado não pode duplicar efeito.

1.4. Integridade conservada: em qualquer split/repasse, `soma das partes ==
total`. Há teste que prova isso.

## 2. Segurança e multi-tenant

2.1. RLS é a fronteira de segurança, não a aplicação. **Toda tabela com dado
de tenant/ator tem RLS habilitada e policies explícitas.** Tabela nova sem
RLS não passa de spec.

2.2. `service_role` só é usada dentro de Edge Functions / Server Actions
server-side, nunca exposta ao cliente. Chave secreta nunca chega ao bundle
do navegador ou do app.

2.3. Segredos nunca são commitados. `.env.example` documenta as variáveis;
valores reais ficam em Vercel/Supabase secrets.

2.4. Toda Edge Function valida origem: webhook verifica assinatura HMAC;
função autenticada valida JWT e o `role` esperado.

2.5. Isolamento entre atores (lojista/consumidor/entregador/admin) é provado
por teste de RLS antes de qualquer feature que crie tabela nova com dado
sensível.

## 3. Stack e padrões (conforme `docs/02`)

3.1. TypeScript `strict`. **`any` explícito é proibido**; use `unknown` +
narrowing ou tipos gerados.

3.2. Tipos do banco vêm de `packages/types` (gerados via `supabase gen
types`). Não se digita schema à mão.

3.3. Next.js: Server Components por padrão; Client Component só com
interatividade real. Mutations via Server Action — não criar rota API para
operação simples.

3.4. Domínio em português (`pedido`, `loja`, `entrega`, `repasse`).
Componentes PascalCase, arquivos kebab-case.

3.5. Nenhum ID de plano/tenant/usuário hardcoded — sempre via auth/contexto.

3.6. Mobile: tokens de design centralizados (sem hex literal espalhado, sem
mapa de status duplicado) — conforme `docs/system-design/consumer`.

## 4. Honestidade de implementação

4.1. **Proibido stub disfarçado de feature pronta.** Se um caminho não está
implementado, ele falha visível e explicitamente (erro claro, estado vazio
honesto) — nunca finge sucesso com dado mockado em produção.

4.2. Dado sintético/mock só é aceito atrás de flag explícita e documentada na
spec, com item no roadmap para substituí-lo por fonte real.

4.3. `TODO`/`FIXME` em código de caminho crítico (pagamento, pedido, auth,
RLS) bloqueia merge. Em outros lugares, exige issue/roadmap vinculado.

4.4. Sem error handling decorativo para cenário impossível, e sem
backward-compat shim para código que controlamos inteiro. Trate a fronteira
(input de usuário, API externa), confie no interno.

## 5. Mudança segura

5.1. Migration sempre tem `up` e estratégia de `down`/rollback descrita na
spec. Migration destrutiva (drop de coluna em uso, NOT NULL em tabela
populada) é faseada e documentada.

5.2. Mudança de contrato de Edge Function / Server Action consumida por app
mobile já publicado é **aditiva** ou versionada — clientes antigos não
quebram sem plano de transição na spec.

5.3. Ordem de deploy é parte da spec quando há acoplamento
(migration antes de código, edge function antes de UI que a chama).

5.4. Nada destrutivo em ambiente compartilhado sem aprovação explícita no PR.

## 6. Qualidade mínima por entrega

6.1. Lógica de negócio crítica tem teste de unidade (ver `docs/26`).

6.2. Build de produção passa (`pnpm build` web; `typecheck` mobile).

6.3. Lint/typecheck limpos nos arquivos tocados.

6.4. A Definition of Done (`02-definicao-de-pronto.md`) é demonstrada no PR,
não apenas afirmada.

## 7. Precedência

Em conflito: **Constituição > Spec aprovada > docs/ de visão > preferência
individual**. Mudar a constituição exige ADR.
