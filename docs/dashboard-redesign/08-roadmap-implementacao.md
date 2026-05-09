# 08 — Roadmap de Implementação

*Versão 1.0 — 09/05/2026*

5 fases. Cada fase é mergeável de forma independente; as 5 podem ser
entregues em sequência sem quebrar o produto entre uma e outra.

---

## FASE 1 — Saneamento da IA (sem novas tabelas)

**Objetivo:** sidebar sem 404, sem duplicações de identidade visual,
páginas existentes reorganizadas.

### Branches sugeridas
- `claude/improve-merchant-dashboard-b9sMl` (esta — documentação)
- `feat/dashboard-ia-fase-1` para as mudanças de código

### Escopo
1. **Sidebar nova** (`02-arquitetura-de-informacao.md §2`):
   - Grupos: Operar / Analisar / Minha Loja / Conta.
   - Subitens de Catálogo (Produtos, Categorias, Estoque).
   - Remoção dos links 404 (substituídos por *placeholders* "Em breve")
     em **uma única passagem** ou já apontando para as novas rotas
     stub criadas em fase 2/3 — ver §"Estratégia de transição".
   - Badge de Pedidos via Realtime (`use-realtime-count`).
2. **Consolidação `/minha-loja`**:
   - Server Action `publicarVitrine` que persiste em `stores`.
   - Upload real para Supabase Storage.
   - Remover persistência em `localStorage`.
3. **Limpeza de `/configuracoes/loja > Dados gerais`**:
   - Tira logo, banner, descrição (saem para `/minha-loja`).
   - Mantém nome interno, telefone, slug — vai para nova aba
     "Identificação" do hub `/configuracoes`.
4. **Hub `/configuracoes`** com abas: Identificação, Localização,
   Horários, Entrega, Pagamentos, Recebimentos, Notificações.
   - "Localização" passa a abrigar endereço (sai de "Entrega").
   - "Recebimentos" entra aqui (sai de Minha Conta).
5. **`/minha-conta`**: criar rota top-level com abas Pessoa,
   Segurança, Assinatura, Faturas, Privacidade. `/configuracoes/conta`
   vira redirect.
6. **Header padrão `<PageHeader />`** em todas as páginas existentes.
7. **Toggle de status da loja** vai para o header de `/minha-loja`.

### Critérios de aceite
- Nenhum item da sidebar leva a 404.
- Logo/banner persistem após reload.
- `/configuracoes` tem 7 abas funcionais.
- `/minha-conta` carrega; aba Recebimentos não existe mais lá.

---

## FASE 2 — Páginas estruturais novas (mocks → reais)

**Objetivo:** criar as 5 páginas faltantes em modo MVP, mesmo que
parcialmente alimentadas por dados sintéticos. Sai a sensação de
"meia plataforma".

### Ordem sugerida (priorização por impacto)
1. **`/entregadores`** — tabela vazia + estado vazio + botão
   "Convidar".
2. **`/avaliacoes`** — lista vazia + cards de estatística + filtros.
3. **`/relatorios`** — visão geral (KPIs comparativos com período
   anterior) + abas mockadas com 1 dado real cada.
4. **`/mensagens`** — caixa de entrada + 1 thread mock + envio
   funcional dentro de uma thread.
5. **`/ajuda`** — FAQ estática (.mdx) + form "Abrir chamado".

### Migração SQL única
`migration_006_dashboard_redesign.sql`:
```sql
-- Mensagens
create table message_threads (...);
create table messages (...);

-- Avaliações
create table store_reviews (...);

-- Suporte
create table support_tickets (...);

-- Entregadores (convites opcional)
create table courier_invites (
  token uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  nome text not null,
  telefone text not null,
  email text,
  expira_em timestamptz not null default (now() + interval '7 days'),
  usado_em timestamptz,
  criada_em timestamptz default now()
);
```
+ RLS apropriadas (`tenant_id = my_tenant_id()`).

### Critérios de aceite
- 5 páginas acessíveis pela sidebar, sem 404.
- Cada uma com header padronizado e empty state util.
- Server Actions de leitura funcionando.

---

## FASE 3 — Comportamento avançado

**Objetivo:** tornar as páginas vivas (Realtime, filtros persistentes,
ações em massa, exportações).

### Escopo
1. **Pedidos**:
   - Busca textual (número, telefone, bairro).
   - Filtros persistentes em `searchParams`.
   - Imprimir comanda (Edge Function `build-comanda-pdf`).
   - Notificação sonora respeita opt-in.
2. **Produtos**:
   - Ações em massa.
   - Importar/Exportar CSV.
3. **Financeiro**:
   - Seletor de período padronizado.
   - Exportar extrato.
4. **Relatórios**:
   - Implementação real das 5 abas (Visão geral, Produtos, Pedidos,
     Clientes, Bairros).
   - Exportação CSV/XLSX/PDF.
5. **Mensagens**:
   - Realtime em `messages`.
   - Sugestões rápidas e templates.
   - Broadcast.
6. **Avaliações**:
   - Resposta inline com toast e atualização da loja pública.
   - Sinalizar avaliação para moderação.

### Critérios de aceite
- Filtros sobrevivem a reload e podem ser compartilhados via URL.
- Pedidos novos atualizam badge sem refresh.
- Relatórios respondem em < 2s para período de até 12 meses.

---

## FASE 4 — Fluxos premium e domínio personalizado

**Objetivo:** experiências que fidelizam o lojista.

### Escopo
1. **Domínio personalizado** em `/minha-loja > Domínio` consumindo
   `/api/stores/provision-domain`.
2. **Antecipação de repasse** com modal completo e seleção de
   pedidos.
3. **Convite de entregador** com QR + link compartilhável.
4. **Approve/Reject de entregador** + notificação push para o app
   entregador.
5. **Saúde da loja** permanente na home, com warnings clicáveis.

### Critérios de aceite
- Domínio próprio responde após DNS verificado.
- Entregador convidado completa cadastro pelo link e aparece em
  "Pendentes".
- Antecipação cria registro idempotente em
  `payout_advance_requests`.

---

## FASE 5 — Polimento e a11y

**Objetivo:** entregar uma versão pronta para apresentação a lojistas.

### Escopo
1. **Command palette `⌘K`** com busca de pedidos, produtos e
   clientes.
2. **Atalhos de teclado** em todas as páginas (`g i`, `g p`, etc.).
3. **Modo escuro** com toggle manual.
4. **Mobile drawer** para sidebar.
5. **A11y completa** conforme `07-acessibilidade-responsividade.md`.
6. **Skeletons** em todas as páginas com I/O.
7. **Refator de componentes deprecated** (apagar
   `configuracoes-abas-loja.tsx`, etc., usando o `<Abas />`
   genérico).

### Critérios de aceite
- Lighthouse a11y ≥ 95 em Início, Pedidos, Catálogo, Financeiro,
  Minha Loja.
- Navegação 100% por teclado em todas as páginas operacionais.
- Mobile usável em iPhone SE (375×667).

---

## ESTRATÉGIA DE TRANSIÇÃO

Para evitar quebras durante a migração:

1. **Aliases de rota**: `/configuracoes/conta` segue funcionando
   (redirect 308 → `/minha-conta`) por 30 dias.
2. **Aliases de Server Action**: `atualizarDadosGerais` continua
   exportada e chamada internamente por `publicarVitrine` enquanto
   migramos os formulários, com `console.warn` informando depreciação.
3. **Feature flags**: variáveis de ambiente ou flag em
   `tenant_subscriptions.features` para liberar a sidebar nova
   gradualmente — `?nav=v2` durante validação interna.
4. **Telemetria**: registrar acessos a rotas antigas vs. novas para
   ajustar a comunicação (banner "novidade").

---

## ESTIMATIVA

| Fase | Esforço (dev-dia) | Risco |
|------|-------------------|-------|
| 1 | 8–12 | Médio (precisa migrar persistência da Vitrine sem perder dados) |
| 2 | 12–18 | Baixo (a maior parte é UI sobre tabelas novas) |
| 3 | 14–20 | Médio (Edge Functions de export, performance) |
| 4 | 8–12 | Médio (DNS, push) |
| 5 | 8–12 | Baixo (polimento) |

Total: 50–74 dev-dias (≈ 10–15 semanas a 5d/semana com 1 dev).
Paralelizando UI e migrações dá para reduzir.

---

## CHECKPOINTS

- **Após Fase 1**: revisar com 2–3 lojistas piloto a nova IA.
- **Após Fase 2**: validar empty states e nomes das páginas.
- **Após Fase 3**: medir tempo de resposta dos Relatórios e fazer
  ajuste de cache.
- **Após Fase 4**: roda end-to-end Setup → Pedido → Antecipação →
  Avaliação → Resposta.
- **Após Fase 5**: rodar Lighthouse, axe-core e teste com leitor de
  tela.
