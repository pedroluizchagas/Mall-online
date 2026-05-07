# 06 — Roadmap de Implementação

### Fases, critérios de aceite, riscos e métricas

*Versão 1.0 — 07/05/2026*

---

## OBJETIVO

Quebrar a entrega dos templates em **fases incrementais**, cada uma entregando valor sozinha e desbloqueando a próxima. O roadmap prioriza:

1. **Não quebrar lojistas atuais** (food simples) em nenhuma fase.
2. **Soltar valor cedo** — fashion (variações) é a maior alavancagem comercial.
3. **Testar cada fase em produção** antes de avançar.

---

## VISÃO GERAL — 6 FASES

| Fase | Foco | Duração | Status |
|:-:|---|:-:|:-:|
| **1** | Fundação: schema + registry + propagação | 3-5 dias | ⏳ |
| **2** | Sidebar + onboarding condicional + página de troca | 3 dias | ⏳ |
| **3** | Template `food` com modificadores (cardápio v2) | 5-7 dias | ⏳ |
| **4** | Template `fashion` com variações (grade SKU) | 7-10 dias | ⏳ |
| **5** | Templates `pet`, `services`, `pharmacy`, `generic` | 5-7 dias | ⏳ |
| **6** | Migração assistida + telemetria + ajustes | 2-3 dias | ⏳ |

**Total estimado:** 25 a 35 dias úteis (~5-7 semanas com 1 dev full-time).

---

## FASE 1 — FUNDAÇÃO

### Entregáveis

- [ ] **Migration 014** (`stores.template_codigo`)
- [ ] **Migration 015** (variants + options)
- [ ] **Migration 016** (modifiers)
- [ ] **Migration 017** (`order_items.variant_id` + `modifiers` JSONB)
- [ ] **Migration 018** (estoque por variant + trigger)
- [ ] `packages/lib/templates/types.ts` — contrato
- [ ] `packages/lib/templates/registry.ts` — registry com 6 templates
- [ ] `packages/lib/templates/{food,fashion,pharmacy,pet,services,generic}.ts`
- [ ] `packages/lib/templates/helpers.ts` — `getTemplate()`, `useTemplate()`
- [ ] `TemplateProvider` + `useTemplate()` hook
- [ ] Layout do dashboard busca template e injeta no contexto
- [ ] Backfill: todos os lojistas atuais com `template_codigo='food'`
- [ ] Edge function de `criar-pedido` aceita `variant_id` e `modifiers`

### Critérios de aceite

- ✅ Aplicar migrations em staging não causa erro nem perda de dados
- ✅ Lojista existente abre dashboard e tudo funciona como antes (template food, sem variant, sem modifier)
- ✅ Pedido é criado normalmente em loja food atual (sem variant_id, sem modifiers)
- ✅ Tests do registry passam (`pnpm test packages/lib`)
- ✅ Type-check passa em todo monorepo

### Riscos

| Risco | Mitigação |
|-------|-----------|
| Trigger de estoque com bug crítico | Testar com 50+ pedidos sintéticos antes de promover; rollback ready |
| Backfill quebra | Backfill é UPDATE simples com WHERE, fácil reverter |
| Edge function quebra com payload novo | Manter compat com payload antigo (variant_id e modifiers opcionais) |

---

## FASE 2 — SIDEBAR + ONBOARDING + TROCA

### Entregáveis

- [ ] `apps/web/components/dashboard/sidebar.tsx` consulta `useTemplate()` e oculta itens
- [ ] Renomeia "Produtos" para `template.produto.labels.produtoPlural` na sidebar
- [ ] Wizard de onboarding (dados-loja.tsx) sugere template baseado em `categoria_id` selecionada
- [ ] Lojista pode confirmar ou trocar a sugestão
- [ ] Página `Configurações > Loja > Tipo de loja` permite trocar template
  - Modal com aviso de impacto (lê tabela do `04`)
  - Confirma → `UPDATE stores SET template_codigo`
- [ ] Email de notificação quando lojista troca template

### Critérios de aceite

- ✅ Lojista food vê sidebar idêntica à atual (nada ganhou ou perdeu)
- ✅ Lojista fashion (manualmente trocado em DB) vê item "Estoque" na sidebar
- ✅ Lojista services não vê "Entregadores"
- ✅ Onboarding novo lojista escolhendo categoria "Vestuário" → wizard sugere template fashion
- ✅ Troca de template propaga em <1s (sem precisar relogar)

### Riscos

| Risco | Mitigação |
|-------|-----------|
| Lojista troca template e perde acesso a dado importante | Dados nunca são apagados — só ocultos. Modal explicita |
| Bug de cache faz sidebar antiga aparecer | Cache busting via revalidatePath |

---

## FASE 3 — `food` COM MODIFICADORES

### Entregáveis

- [ ] Form de produto (`produto-form.tsx`) ganha seção "Modificadores" condicional
- [ ] CRUD completo de `product_modifier_groups` e `product_modifiers`
- [ ] Reordenação por drag-and-drop dos grupos e modifiers
- [ ] Toggle "esgotou hoje" com retorno automático às 00h00 do dia seguinte (cron)
- [ ] Campos extras: tempo de preparo, serve pessoas, tags
- [ ] Server action `salvarProdutoFood()` valida com Zod food
- [ ] Consumer mobile: PDP layout `cardapio` renderiza modifiers
- [ ] Carrinho mobile: estrutura nova com `modifiers[]`
- [ ] Edge function `criar-pedido` valida modifiers e calcula preço
- [ ] Pedido (lojista e consumer) mostra modifiers selecionados

### Critérios de aceite

- ✅ Lojista food consegue adicionar 2 grupos de modificadores ("ponto", "adicionais")
- ✅ Consumer escolhe ponto + 2 adicionais → preço atualiza dinamicamente
- ✅ Validação impede pedido sem ponto da carne (grupo obrigatório)
- ✅ Pedido criado mostra "Hambúrguer (Ao ponto, Bacon, Cheddar) — R$ 48"
- ✅ Lojista vê na fila de pedidos os modifiers escolhidos
- ✅ Tempo de preparo aparece no PDP mobile

### Riscos

| Risco | Mitigação |
|-------|-----------|
| Recálculo de preço cliente vs servidor diverge | Servidor é source of truth — cliente recalcula só para preview |
| Grupos com regras inconsistentes (min > max) | Validação Zod e CHECK constraint no banco |

---

## FASE 4 — `fashion` COM VARIAÇÕES

### Entregáveis

- [ ] Form de produto fashion: passo 1 (gerais) + passo 2 (grade)
- [ ] UI de definir atributos (Tamanho × Cor) com preview de grade
- [ ] CRUD completo de `product_variants`, `product_option_groups`, `product_options`
- [ ] Bulk edit: aplicar preço/estoque a linha/coluna inteira da grade
- [ ] Upload de foto por variant (ou por grupo de variants — ex: foto da cor)
- [ ] Server action `salvarProdutoFashion()` com validação de unicidade da combinação
- [ ] Página de **estoque por SKU**: tabela ordenável, filtro por mínimo, ações em massa
- [ ] Consumer mobile: PDP layout `variacao` com seletores
- [ ] Foto principal alterna ao trocar cor (se foto por variant existir)
- [ ] Estoque por variant decrementa via trigger (já em Fase 1)
- [ ] Realtime: channel notifica quando variant esgota
- [ ] Pedido mostra variant ("Vestido — M Preto") em todos os lugares

### Critérios de aceite

- ✅ Lojista cria produto com 5 tamanhos × 3 cores em <3 minutos
- ✅ Bulk edit aplica preço a coluna "GG" (todos os 3 GG ficam R$ 139)
- ✅ Esgotar 1 variant não esgota o produto inteiro
- ✅ Consumer não consegue adicionar variant esgotado
- ✅ Trocar cor no PDP atualiza foto principal
- ✅ Pedido criado tem `variant_id` correto e `nome_snapshot` legível
- ✅ Plano Básico bloqueia ao atingir 50 SKUs (variants contam)

### Riscos

| Risco | Mitigação |
|-------|-----------|
| Lojista cria 200 SKUs por engano e estoura plano | UI mostra contador ao vivo: "12/50 SKUs do plano Básico" |
| Foto por variant inflar storage | Quotas por plano + compressão automática |
| Race condition: dois compradores no último estoque | Trigger PostgreSQL pega lock; pedido falha se estoque <0 |

---

## FASE 5 — `pet`, `services`, `pharmacy`, `generic`

### Entregáveis

- [ ] Template `pet` reusa lógica de `fashion` para variações de porte/peso
- [ ] Toggle "este item é serviço?" no form pet → habilita campos de duração
- [ ] Template `services`: módulo Agenda novo
  - Tabela `staff` (profissionais)
  - Tabela `service_slots` ou regra dinâmica de disponibilidade
  - Calendário no PDP consumer (Layout 4)
  - Bloqueio manual de horários
- [ ] Template `pharmacy`:
  - Migration 019 (lotes + campos ANVISA)
  - UI de gestão de lotes com FEFO
  - Tela de upload de receita no checkout consumer
  - Validação ANVISA via regex
- [ ] Template `generic`: campos opcionais (garantia, peso, dimensões, marca)

### Critérios de aceite

- ✅ Pet shop cadastra coleira em 4 portes com 4 estoques separados
- ✅ Pet shop cadastra "Banho M" como serviço sem virar produto físico
- ✅ Salão cadastra serviço "corte 60 min" e disponibiliza horários
- ✅ Consumer agenda corte 14h sex e recebe pedido confirmado
- ✅ Farmácia cadastra dipirona com 2 lotes; sistema vende do lote mais próximo do venc (FEFO)
- ✅ Receita exigida: consumer não fecha pedido sem foto

### Riscos

| Risco | Mitigação |
|-------|-----------|
| Agenda do `services` é complexa (slots, conflitos) | MVP: lojista define slots manualmente, sem otimização auto |
| Lote/validade de pharmacy quebra estoque | Em pharmacy, estoque agregado vira Σ de lotes; trigger atualiza |
| Pet shop misto fica confuso | Documentação clara; tutorial in-app na primeira vez |

---

## FASE 6 — MIGRAÇÃO ASSISTIDA + TELEMETRIA

### Entregáveis

- [ ] Tela de "Sugestão inteligente": sistema analisa produtos do lojista e sugere template ideal
  - Lojista food com >5 produtos sem modificador → sugere `generic`
  - Lojista generic com produtos similares cadastrados em massa → sugere `fashion`
- [ ] Painel super-admin: distribuição de templates, taxa de adoção
- [ ] Eventos de analytics: troca de template, criação de produto com variant, criação de modifier
- [ ] Comunicação outbound aos lojistas existentes via email convidando a re-onboarding
- [ ] Tutorial in-app para cada template novo

### Critérios de aceite

- ✅ Pelo menos 70% dos lojistas com `template_codigo='food'` que **não** vendem comida foram alertados
- ✅ Métrica de "template trocado nos últimos 30 dias" disponível no super-admin
- ✅ Tutorial cobre os 3 templates principais (food, fashion, generic)

---

## CRITÉRIOS DE LANÇAMENTO POR FASE

Antes de marcar uma fase como "concluída em produção":

- ✅ Todos os critérios de aceite da fase verdes
- ✅ Cobertura de testes ≥70% nos arquivos novos
- ✅ E2E Playwright com ≥1 cenário por template afetado
- ✅ Aprovação manual em staging por Pedro
- ✅ Plano de rollback documentado (qual migration reverter, qual flag desligar)

---

## MÉTRICAS DE SUCESSO

### Métricas de adoção (3 meses pós-Fase 5)

- **% de novos lojistas que escolhem template ≠ food**: meta ≥40%
- **# de lojistas fashion ativos**: meta ≥10
- **% de pedidos com variant_id preenchido**: meta ≥30% (indica fashion/pet/generic ativos)
- **% de pedidos com pelo menos 1 modifier**: meta ≥60% dos pedidos food

### Métricas de qualidade

- **Taxa de erro em criação de pedido com variant/modifier**: <0.5%
- **Tempo médio para cadastrar 1 produto fashion com 9 SKUs**: ≤4 minutos (medido por lojistas-piloto)
- **NPS dos lojistas após troca de template**: melhora de ≥10 pontos vs baseline

### Métricas de negócio

- **Aumento de GMV mensal nos pisos não-food**: meta +30% após Fase 5
- **Lojistas convertidos do plano Básico → Profissional por estourar 50 SKUs**: indicador positivo de upsell

---

## DEPENDÊNCIAS EXTERNAS

| Dependência | Bloqueia | Status |
|-------------|----------|:-:|
| Pagar.me — split atual | Nada (split não muda) | ✅ |
| Stripe Billing — limites de plano | Fase 4 (variants contar como produtos) | ⚠️ verificar `tenant_subscriptions` lê count_skus |
| Supabase Realtime | Fase 4 (channel de variant) | ✅ já configurado |
| Storage Supabase | Fase 4 (foto por variant) | ✅ bucket `product-images` ativo |
| Edge functions deploy | Todas | ✅ |

---

## QUESTÕES EM ABERTO (a decidir antes da Fase 1)

1. **Limite de variants no plano Básico:** mantém 50 totais ou cria slot separado de variants? **Sugestão:** mantém 50 totais (variants contam) — já é justo e simples.
2. **Permitir variants opcionais em food?** Ex: pizza com tamanho M/G/Família. **Sugestão:** sim, mas só se lojista solicitar (Fase 5+).
3. **Múltiplas lojas, múltiplos templates por mesmo tenant?** Lojista do plano Profissional tem 3 lojas — pode ter 1 food, 1 fashion. **Sugestão:** sim, `template_codigo` é por loja, não por tenant. ✅ já modelado assim.
4. **Migrar lojistas existentes automaticamente?** **Sugestão:** não. Apenas notificar e oferecer (Fase 6). Quem está vendendo bem em food não precisa mexer.
5. **Pharmacy é Fase 5 ou Fase 7?** Complexidade regulatória alta. **Sugestão:** Fase 5 entrega MVP funcional (ANVISA + receita); SNGPC e bloqueio de venda controlada vão para Fase 7.

---

## CRONOGRAMA REFERENCIAL (1 dev full-time)

```
Sem 1: ████████████░░░░  Fase 1 (3-5d)
Sem 2: ░░░░░░░░░░░░████  Fase 1 termina + Fase 2 começa
Sem 3: ████████████████  Fase 2 termina + Fase 3 começa
Sem 4: ████████████████  Fase 3 (modificadores end-to-end)
Sem 5: ████████████████  Fase 4 começa (variations)
Sem 6: ████████████████  Fase 4 termina + Fase 5 começa
Sem 7: ████████████████  Fase 5 (pet, services, pharmacy, generic)
Sem 8: ████████░░░░░░░░  Fase 6 + buffer
```

> Adicionar 30% de buffer para imprevistos típicos: total realista ~8-9 semanas.

---

## ROLLBACK STRATEGY POR FASE

| Fase | Rollback |
|:-:|---|
| 1 | Reverter migrations 014-018 em ordem inversa; sem dados perdidos |
| 2 | `git revert` da PR; sidebar volta ao estado hardcoded |
| 3 | Esconder seção de modifiers no form via flag; modifiers ficam no banco |
| 4 | Idem fase 3; variants ficam no banco mas form/PDP volta ao simples |
| 5 | Ocultar templates específicos do registry (`if codigo in ['pharmacy','services'] return null`) |
| 6 | Apenas comunicação — sem código a reverter |

---

## OBSERVAÇÕES FINAIS

- **Todas as fases podem ir para produção independentes.** Fase 4 não precisa esperar Fase 3 terminar 100% — só precisam não conflitar.
- **A trinca crítica é Fase 1 → Fase 4.** Se rodarem bem, o resto é incremental fácil.
- **Pharmacy é o único nicho que pode ser totalmente postponed** se o time for pequeno; não bloqueia nada.
- **Documentar tudo na hora de implementar:** atualizar `docs/03`, `docs/11`, `docs/24` com referências a `dashboard-templates/`.

---

## CHECKLIST FINAL DE PRONTIDÃO

Antes de iniciar a Fase 1, garantir:

- [ ] Pedro aprovou esta documentação
- [ ] Decisões em aberto (questões 1-5) resolvidas
- [ ] PR de proposta mergeada (ou comments processados)
- [ ] Branch técnica criada (`feat/dashboard-templates-fase-1`)
- [ ] Issue #X aberto no GitHub linkando esta doc
- [ ] Time alinhado em call de kickoff

---

> **Ponto final desta documentação.** A partir daqui, o trabalho é executar e aprender. Atualizar este arquivo com lições, riscos confirmados e mudanças de plano.
