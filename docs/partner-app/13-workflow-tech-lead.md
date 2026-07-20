# 13 — Workflow Tech Lead

Ciclo de execução supervisionada, idêntico ao do storefront
(`docs/storefront/08-workflow-tech-lead.md`). O tech lead é dono do design;
o executor implementa um stage por vez.

## Ciclo por stage

```
Tech lead entrega o prompt do stage (12-prompts-execucao.md)
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
        └─ Stage 9 ok → decide merge para main (ou merges por marco)
```

## Ordem obrigatória

Duas trilhas (ver diagrama no `00-INDEX`):

- **Base**: `1 → 2` (scaffold, auth). O Stage 0 (backend do Conteúdo) roda a
  qualquer momento antes do 7 — recomendado primeiro (puro SQL, destrava
  decisões).
- **Gestão**: `3 → 4 → 5 → 6`, após o 2.
- **Conteúdo**: `7 → 8 → 9`, após 0 e 2. O Stage 9 é o último do programa
  (depende de tudo) e é o único que toca `apps/mobile-consumer` — coordenar
  com a Fase 9 do redesign consumer
  (`docs/system-design/consumer/08-roadmap.md`) se estiver ativa, para não
  conflitar no mesmo arquivo.

O tech lead pode antecipar a trilha Conteúdo (7–9 antes de 4–6) sem custo
estrutural — registrar a decisão no `00-INDEX`.

## Marcos de merge (decisão do tech lead)

| Marco | Conteúdo | Valor entregue |
|---|---|---|
| M1 | Stages 1–3 | lojista opera pedidos pelo celular (killer feature) |
| M2 | + Stages 4–6 | paridade de gestão completa |
| M3 | + Stages 0, 7–9 | Reels ponta a ponta (publica → aparece no consumer) |

Merges intermediários por marco são permitidos (a branch volta a nascer de
`main` a cada marco); o padrão conservador é um merge único pós-Stage 9.

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
| Predicados exatos de `tenantPodeOperar`/`tenantPodePublicar` | Stage 2 | copiar do gate `pagarme_onboarding_status` atual |
| Teto de posts por plano (`plans.max_posts`) | Stage 0 §3 | `NULL` (ilimitado) no MVP |
| Mini-mapa nativo vs última posição + deep link | Stage 3 | decidir pelo custo de `react-native-maps` no app |
| Lista final de módulos web-only | `01` §3 | staff, tipo-de-loja, editor de modificadores, billing nativo |
| Like/comentário real vs visual local no consumer | Stage 9 | só `views` real no MVP |
| `eas.projectId` do novo app | Stage 1 | criar projeto EAS novo |
| Pipeline de mídia B/C (transcode/Mux) | `01` §7 | manter A (client) até escala exigir |
| Ordem Gestão×Conteúdo e marcos de merge | `00-INDEX` | Gestão primeiro; merge por marco M1 |

Cada uma fechada deve ser registrada na tabela de status do `00-INDEX.md` ou
no campo correspondente da migration/código, para o executor seguinte não
reabrir.

## Definition of Done do MVP

**Gestão**
- [ ] Pedido novo chega com push+som; lojista aceita, prepara, atribui
      entregador e conclui — tudo pelo app, com estado idêntico ao Dashboard.
- [ ] Produto criado/pausado no app reflete no consumer/storefront na hora.
- [ ] KPIs financeiros batem com o Dashboard centavo a centavo.
- [ ] Loja editada (dados/horários/pausa) reflete nas superfícies públicas.

**Conteúdo**
- [ ] Lojista loga, captura (foto ou vídeo), publica em < 1 min de interação
      efetiva.
- [ ] Post aparece no Explorar do consumer; vídeo toca em iOS e Android.
- [ ] Lojista vê, edita e remove os próprios posts; remoção some do feed na
      hora.
- [ ] `views` dá sinal de retorno real ao lojista.

**Transversal**
- [ ] Zero regressão em `apps/web`, `apps/mobile-courier`,
      `apps/mobile-consumer` (fora a troca controlada do Stage 9).
- [ ] Nenhuma regra de negócio (gate, limite, transição, ownership) duplicada
      no cliente — tudo em RLS / triggers / Edge Functions / `packages/lib`.
- [ ] Design 100% nos tokens compartilhados (nenhum hex fora de
      `partner-design.ts`).

## Atualização de status

Ao fim de cada stage aprovado, o tech lead atualiza a tabela "Status dos
stages" em `00-INDEX.md` (⬜ → ✅) e anota decisões fechadas. Esse arquivo é o
índice de verdade do progresso — mesma disciplina do storefront.
