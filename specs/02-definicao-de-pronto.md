# 02 — Definition of Ready, Definition of Done e Quality Gates

## Definition of Ready (DoR) — a spec pode entrar em implementação?

Uma spec só sai de `Em revisão` para `Aprovada` se **todos** abaixo forem
verdade:

- [ ] Problema e resultado esperado descritos em 1 parágrafo claro.
- [ ] Ator(es) impactado(s) identificados (lojista / consumidor / entregador / admin / plataforma).
- [ ] Escopo **e fora de escopo** explícitos.
- [ ] Contrato definido: modelo de dados (tabelas/colunas), RLS, APIs/Edge Functions/Server Actions afetadas, mudanças de UI.
- [ ] Critérios de aceite **verificáveis** (cada um testável por alguém que não escreveu o código).
- [ ] Plano de teste declarado (unidade / integração RLS / E2E / verificação manual).
- [ ] Dependências e ordem de deploy mapeadas.
- [ ] Riscos e plano de rollback descritos.
- [ ] Cabe em 1 PR revisável (senão, foi quebrada).
- [ ] Não viola a constituição (`01`).

## Definition of Done (DoD) — o PR pode sair de draft / mergear?

Aplica-se a **toda** entrega (com ou sem spec formal):

### Funcional
- [ ] Todos os critérios de aceite da spec atendidos e demonstrados no PR (print, log, ou comando colado).
- [ ] Caminho feliz **e** principais caminhos de erro testados manualmente quando há UI.
- [ ] Nenhum stub/mock em caminho crítico (pagamento, pedido, auth, RLS). Mock remanescente está atrás de flag + item no roadmap.

### Código
- [ ] `pnpm build` (web) e `typecheck` (mobile) passam para os apps tocados.
- [ ] Lint/typecheck limpos nos arquivos do diff. Sem `any` explícito novo.
- [ ] Sem `TODO`/`FIXME` novo em caminho crítico.
- [ ] Diff só contém o necessário para a spec (sem refactor oportunista não pedido).

### Dados e segurança
- [ ] Tabela nova com RLS habilitada e policies por ator.
- [ ] Migration com `up` e rollback descrito; ordem de deploy documentada no PR.
- [ ] Segredos fora do diff; `.env.example` atualizado se houve variável nova.
- [ ] Cálculo financeiro novo coberto por teste de unidade (integridade soma == total).

### Testes
- [ ] Lógica de negócio crítica nova tem teste de unidade.
- [ ] Mudança em RLS de tabela sensível tem teste de isolamento entre tenants.
- [ ] Suíte de testes existente continua verde.

### Rastreabilidade
- [ ] PR é draft até a DoD fechar; corpo do PR linka `features/NNN-slug/spec.md`.
- [ ] `03-estado-atual.md` e `04-roadmap.md` atualizados no mesmo PR ou em PR de follow-up imediato.
- [ ] ADR criado se houve decisão arquitetural.

## Quality Gates por área (checagens objetivas)

### Web (`apps/web`)
```bash
pnpm --filter web build
pnpm --filter web lint
```
- Server Action nova valida input com Zod.
- Nenhuma chave secreta referenciada em Client Component.

### Mobile (`apps/mobile-consumer`, `apps/mobile-courier`)
```bash
pnpm --filter <app> typecheck
```
- Sem hex literal de cor fora dos arquivos de tokens.
- Sem mapa de status de pedido duplicado fora de `lib/status-pedido.ts`.
- Contrato de Edge Function consumido permanece compatível.

### Backend (`supabase`)
- `supabase db reset` aplica todas as migrations do zero sem erro.
- Toda tabela nova aparece com `rowsecurity = true`.
- Edge Function de webhook rejeita payload com assinatura inválida.
- Edge Function financeira é idempotente sob reenvio do mesmo evento.

### Financeiro (transversal)
- Teste prova `soma(split) == total` e `bruto == líquido + taxa`.
- Reprocessar o mesmo webhook não duplica `payout`/`order`.

## Gate de release (go-live)

Além das DoD individuais, o go-live exige o checklist de
`docs/27-deploy-e-infraestrutura.md` (seção "Checklist completo de
lançamento") integralmente verde, rastreado como uma spec própria
(`features/` de release).
