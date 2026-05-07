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
| **1** | Fundação: taxonomia (20 cat. + 9 pisos) + schema + registry | 4-6 dias | ⏳ |
| **2** | Onboarding novo + sidebar condicional + form base | 2-3 dias | ⏳ |
| **3** | Template `food` com modificadores (cardápio v2) | 5-7 dias | ⏳ |
| **4** | Template `fashion` com variações (grade SKU) | 7-10 dias | ⏳ |
| **5** | Templates `pet`, `services`, `pharmacy`, `generic` | 5-7 dias | ⏳ |
| **6** | Painel admin "Outros" + telemetria de adoção | 2 dias | ⏳ |

**Total estimado:** 25 a 35 dias úteis (~5-7 semanas com 1 dev full-time).

---

## FASE 1 — FUNDAÇÃO

### Entregáveis

- [ ] **Migration 014** (`categories.slug` + UNIQUE + RLS imutabilidade + `store_categoria_changes`)
- [ ] **Reescrever** `apps/web/seed-categories.js` com 20 categorias (slug, nome, ícone)
- [ ] Rodar seed em staging; validar dados
- [ ] **Migration 015** (variants + options)
- [ ] **Migration 016** (modifiers)
- [ ] **Migration 017** (`order_items.variant_id` + `modifiers` JSONB)
- [ ] **Migration 018** (estoque por variant + trigger)
- [ ] `packages/lib/templates/types.ts` — contrato
- [ ] `packages/lib/templates/registry.ts` — registry com 6 templates
- [ ] `packages/lib/templates/mapping.ts` — `CATEGORIA_SLUG_TO_TEMPLATE` + `getTemplateBySlug/Store`
- [ ] `packages/lib/templates/{food,fashion,pharmacy,pet,services,generic}.ts`
- [ ] `packages/lib/templates/helpers.ts` — utilidades
- [ ] `packages/lib/pisos.ts` — 9 pisos curatoriais
- [ ] `TemplateProvider` + `useTemplate()` hook
- [ ] Layout do dashboard busca store+categoria e deriva template
- [ ] Edge function de `criar-pedido` aceita `variant_id` e `modifiers` (opcionais)
- [ ] Lojistas existentes sem `categoria_id` recebem prompt no próximo login para escolher

### Critérios de aceite

- ✅ Aplicar migrations em staging não causa erro nem perda de dados
- ✅ Tabela `categories` tem 20 entradas globais com slugs únicos após seed
- ✅ Lojista existente com `categoria_id` válida abre dashboard normalmente; template correto é derivado
- ✅ Lojista existente **sem** `categoria_id` cai em template `generic` e vê banner pedindo para completar onboarding
- ✅ Tentativa de UPDATE em `categoria_id` por tenant_user é rejeitada pelo RLS
- ✅ Admin consegue trocar `categoria_id` e o evento aparece em `store_categoria_changes`
- ✅ Pedido é criado normalmente em loja food atual (sem variant_id, sem modifiers)
- ✅ Tests do registry e do mapping passam (`pnpm test packages/lib`)
- ✅ Type-check passa em todo monorepo

### Riscos

| Risco | Mitigação |
|-------|-----------|
| Seed muda categorias antigas e quebra lojas existentes | Seed é idempotente (`ON CONFLICT (slug) DO UPDATE`); categorias antigas sem slug ficam intactas até admin reclassificar |
| RLS bloqueia operação legítima do app | Auditar todo UPDATE em stores; rotas que precisam mudar categoria viram via admin |
| Trigger de estoque com bug crítico | Testar com 50+ pedidos sintéticos antes de promover; rollback ready |
| Edge function quebra com payload novo | Manter compat com payload antigo (variant_id e modifiers opcionais) |

---

## FASE 2 — ONBOARDING + SIDEBAR CONDICIONAL

### Entregáveis

- [ ] `apps/web/components/dashboard/sidebar.tsx` consulta `useTemplate()` e oculta itens
- [ ] Renomeia "Produtos" para `template.produto.labels.produtoPlural` na sidebar
- [ ] Wizard de onboarding (`apps/web/app/(auth)/onboarding/etapas/dados-loja.tsx`) reescrito:
  - Mostra **20 categorias** com busca textual + 4 mais comuns em destaque
  - Cada categoria mostra exemplos ("você vende roupa? clica aqui")
  - Tela de confirmação explica o que aquele template habilita ("você terá grade de SKU, estoque por variação...")
  - Aviso explícito: "Esta escolha define como sua loja funciona. Você pode trocar mais tarde via suporte."
- [ ] Em `apps/web/app/(dashboard)/configuracoes/`: tela "Tipo de loja" só **mostra** a categoria atual (read-only) com link "Pedir mudança via suporte" abrindo ticket
- [ ] Form de produto base lendo `template.produto.camposExtras` e renderizando seções condicionais (sem ainda implementar variants/modifiers — fica para fases 3 e 4)

### Critérios de aceite

- ✅ Lojista food existente vê sidebar idêntica à atual (nada ganhou ou perdeu)
- ✅ Lojista com categoria `vestuario-calcados` vê item "Estoque" na sidebar
- ✅ Lojista com categoria `saloes-estetica` não vê "Entregadores"
- ✅ Onboarding novo: escolher "Vestuário & Calçados" → tela de confirmação cita variações
- ✅ Lojista não consegue trocar categoria pelo dashboard (botão não existe ou está desabilitado)
- ✅ Busca no onboarding "hambúrguer" → primeiro resultado é "Alimentos & Bebidas"

### Riscos

| Risco | Mitigação |
|-------|-----------|
| Bug de cache faz sidebar antiga aparecer | Cache busting via `revalidatePath` |
| Onboarding com 20 itens fica overwhelming | UX com "4 mais comuns + busca + ver todas" mitigado já no design |
| Lojista não acha categoria certa e escolhe Outros | Aceitável — admin reclassifica na Fase 6 |

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

## FASE 6 — PAINEL ADMIN "OUTROS" + TELEMETRIA

### Entregáveis

- [ ] **Tela admin "Lojas em Outros"** (`apps/admin/app/lojas-outros/page.tsx`):
  - Lista de lojas com `categoria.slug = 'outros'`
  - Texto livre que o lojista escreveu no onboarding ("o que você vende?")
  - Botão "Reclassificar" abre seletor das outras 19 categorias com motivo obrigatório
  - Submit: `UPDATE stores SET categoria_id = ...` + INSERT em `store_categoria_changes`
  - Email automático para o lojista informando da reclassificação
- [ ] **Dashboard admin de adoção:**
  - Distribuição de lojas por categoria (barras)
  - Distribuição de lojas por template derivado (barras)
  - % de lojas em "Outros" ao longo do tempo (linha)
  - Alerta quando ≥3 lojas em Outros com texto similar nos últimos 30 dias
- [ ] **Eventos de analytics** (Mixpanel/PostHog ou equivalente):
  - `loja_categoria_escolhida` (slug, no onboarding)
  - `loja_categoria_reclassificada` (slug_antigo, slug_novo, admin_id, motivo)
  - `produto_criado_com_variant` (template, qtd_variants)
  - `produto_criado_com_modifier` (template, qtd_modifiers, qtd_groups)
- [ ] Tutorial in-app curto na primeira vez que o lojista entra em cada template
- [ ] **Documentação de operação para suporte:** runbook "como reclassificar uma loja"

### Critérios de aceite

- ✅ Painel admin lista corretamente todas as lojas em "Outros"
- ✅ Reclassificação atualiza categoria + grava em `store_categoria_changes` + dispara email
- ✅ Métricas de adoção por template estão visíveis e atualizadas em tempo real
- ✅ Alerta de "Outros lotado" dispara quando 3+ lojas com texto similar
- ✅ Runbook de suporte documentado para reclassificação manual

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

## QUESTÕES JÁ RESOLVIDAS

1. **Como o template é determinado?** Derivado da `categoria_id` da loja via mapeamento em `packages/lib/templates/mapping.ts`. Não há coluna `template_codigo` no banco. ✅
2. **Quantas categorias existem?** **20 categorias** exaustivas (ver `07-categorias-e-pisos.md`). ✅
3. **Lojista pode trocar categoria sozinho?** Não. RLS bloqueia UPDATE. Apenas super-admin troca, com motivo registrado. ✅
4. **Múltiplas lojas, múltiplos templates por mesmo tenant?** Sim, `categoria_id` é por loja, e plano Profissional+ permite múltiplas lojas. ✅
5. **Como cobrir lojista multi-nicho?** Cria nova loja para cada nicho. ✅

## QUESTÕES EM ABERTO (a decidir antes da Fase 1)

1. **Limite de variants no plano Básico:** mantém 50 totais ou cria slot separado de variants? **Sugestão:** mantém 50 totais (variants contam) — já é justo e simples.
2. **Permitir variants opcionais em food?** Ex: pizza com tamanho M/G/Família. **Sugestão:** sim, mas só se lojista solicitar (Fase 5+).
3. **Pharmacy é Fase 5 ou Fase 7?** Complexidade regulatória alta. **Sugestão:** Fase 5 entrega MVP funcional (ANVISA + receita); SNGPC e bloqueio de venda controlada vão para Fase 7.
4. **Como tratar lojistas existentes sem `categoria_id`?** **Sugestão:** banner persistente no dashboard pedindo para completar onboarding; até lá, template `generic`.
5. **Suporte recebe ticket de troca de categoria por self-service** ou só por contato direto? **Sugestão:** botão no app abre ticket pré-formatado, evita cobrar suporte humano para casos triviais.

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
| 1 | Reverter migrations 014-018 em ordem inversa. **Atenção:** RLS de `stores_update_self` da migration 014 substitui a anterior — guardar versão original para reverter. |
| 2 | `git revert` da PR; sidebar volta ao estado hardcoded; onboarding antigo de 8 categorias só volta se seed for re-rodado com versão antiga (não recomendado; `Outros` cobre o gap) |
| 3 | Esconder seção de modifiers no form via flag; modifiers ficam no banco |
| 4 | Idem fase 3; variants ficam no banco mas form/PDP volta ao simples |
| 5 | Ocultar templates específicos do registry (mapping retorna `generic` em vez do template removido) |
| 6 | Apenas operacional — sem código a reverter |

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
