# 04 — Novas Páginas

*Versão 1.0 — 09/05/2026*

Especifica as 5 páginas referenciadas na sidebar atual mas inexistentes:
**Entregadores**, **Relatórios**, **Mensagens**, **Avaliações**,
**Central de Ajuda**.

Cada uma traz: escopo, layout, dados, server actions, eventos,
tabelas envolvidas e pontos de integração com o restante da
plataforma.

---

## 4.1 Entregadores (`/entregadores`)

### Escopo
Onde o lojista vê e gerencia os entregadores que atendem sua loja.
**Suporta os dois modelos** previstos em
`docs/19-entregador-modelo-auth-e-cadastro.md`:

- **Pool da plataforma** (autônomos): o lojista *visualiza* quem está
  ativo no momento, vê estatísticas e taxa de aceite, mas não cadastra
  ninguém.
- **Próprios do lojista**: o lojista convida, aprova, ativa/desativa,
  define remuneração combinada e visualiza histórico de entregas.

### Layout

```
┌────────────────────────────────────────────────────────────┐
│  HEADER  "Entregadores"                                    │
│  Subtítulo: "Modelo atual: {Pool da plataforma | Próprios}"│
│                                       [Convidar entregador]│
│  [Ativos · Pendentes · Inativos · Todos]                   │
│  [ Buscar nome / telefone... ]                             │
├────────────────────────────────────────────────────────────┤
│  KPI · Em entrega agora     KPI · Aceite (7d)              │
│  KPI · Tempo médio          KPI · Avaliação média          │
├────────────────────────────────────────────────────────────┤
│  Tabela:                                                   │
│  Foto | Nome | Status | Em entrega? | Tx aceite |          │
│        Avaliação | Última entrega | →                     │
└────────────────────────────────────────────────────────────┘
```

Linha → `/entregadores/[id]`.

### Detalhe `/entregadores/[id]`

Tabs internas:
1. **Perfil**: foto, nome, CPF (mascarado), telefone, CNH (status),
   método de pagamento, vínculo com loja.
2. **Histórico**: entregas concluídas, valor pago, ratings.
3. **Localização** (se em entrega ativa): mini-mapa em tempo real
   reusando `mapa-entregador-mini.tsx`.
4. **Documentos**: visualizar uploads de CNH, foto, comprovante de
   endereço.

Para entregadores **próprios**, o detalhe inclui ações:
- Aprovar / Reprovar (se `pendente`).
- Ativar / Desativar.
- Remover vínculo.

Para entregadores **do pool**, somente leitura.

### Subrota: convite (`/entregadores/convidar`)

Formulário simples (nome, telefone, e-mail) que gera um **link de
convite** com token. O convidado abre, completa cadastro
(`docs/19-...`) e fica como `pendente` para aprovação do lojista.

### Server Actions

```ts
// lib/actions/entregadores.ts
'use server'

export async function getEntregadores(filtros: {
  status?: 'ativo' | 'pendente' | 'inativo' | 'todos'
  busca?: string
}): Promise<{ proprios: Courier[]; pool: PoolStats }>

export async function aprovarEntregador(courierId: string)
export async function reprovarEntregador(courierId: string, motivo: string)
export async function alternarAtivoEntregador(courierId: string)
export async function gerarConviteEntregador(input: {
  nome: string
  telefone: string
  email?: string
}): Promise<{ link: string; token: string; expiraEm: string }>

export async function getKpisEntregadores(periodo: '7d'|'30d')
export async function getLocalizacaoCourier(courierId: string)
```

### Tabelas envolvidas
- `couriers` (já em `migration_003`)
- `delivery_assignments`
- `courier_locations`
- (nova, opcional) `courier_invites` — `(token, tenant_id, telefone,
  expira_em, usado_em)`.

### Eventos / Realtime
- Subscribe em `couriers` (status changes) e em
  `delivery_assignments` (novas entregas) para refletir KPIs.

---

## 4.2 Relatórios (`/relatorios`)

### Escopo
Análises agregadas que respondem perguntas estratégicas do lojista:
"Quando vendo mais?", "Que produto está crescendo?", "Que bairro
converte?", "Qual meu ticket médio por dia da semana?".

`/financeiro` é **transacional** (cada repasse, cada pedido).
`/relatorios` é **analítico** (recortes, tendências, comparações).

### Layout

```
┌────────────────────────────────────────────────────────────┐
│  HEADER  "Relatórios"                                      │
│  [ Período: 30 dias ▾ ]    [ Comparar com: período anterior ▾ ]│
│  [ Categorias · Produtos · Pedidos · Clientes · Bairros ]  │
├────────────────────────────────────────────────────────────┤
│  conteúdo da aba ativa                                     │
└────────────────────────────────────────────────────────────┘
```

### Abas / relatórios

1. **Visão geral**
   - Gráfico de faturamento + comparação.
   - Heatmap dia × hora (pedidos).
   - KPIs vs período anterior (Δ %).

2. **Produtos**
   - Top 20 mais vendidos.
   - Produtos com queda de venda.
   - Produtos com estoque baixo.
   - Margem (se houver custo cadastrado — pré-requisito de migração).

3. **Pedidos**
   - Status × período.
   - Tempo médio por etapa (novo → preparo → entrega → concluído).
   - Taxa de cancelamento e principais motivos.

4. **Clientes**
   - Novos × recorrentes.
   - Frequência média.
   - Ticket médio por cliente.

5. **Bairros**
   - Pedidos × bairro.
   - Ticket médio × bairro.
   - Reaproveita o `InsightBar` do home.

### Exportação
Botão "Exportar (CSV / XLSX / PDF)" no header. Edge Function
`build-report` agrega e devolve URL temporária.

### Server Actions

```ts
// lib/actions/relatorios.ts
'use server'

export async function getRelatorioVisaoGeral(periodo: Periodo, comparar: boolean)
export async function getRelatorioProdutos(periodo: Periodo)
export async function getRelatorioPedidos(periodo: Periodo)
export async function getRelatorioClientes(periodo: Periodo)
export async function getRelatorioBairros(periodo: Periodo)

export async function exportarRelatorio(opts: {
  tipo: 'visao_geral' | 'produtos' | 'pedidos' | 'clientes' | 'bairros'
  periodo: Periodo
  formato: 'csv' | 'xlsx' | 'pdf'
}): Promise<{ url: string }>
```

### Performance
- Queries com `group by` em `orders` e `order_items` consultando
  apenas `tenant_id` do logado (RLS já garante).
- Cachear resultados em `unstable_cache` por (tenantId, periodo) por
  5 minutos.
- Períodos > 365d caem para granularidade semanal/mensal.

---

## 4.3 Mensagens (`/mensagens`)

### Escopo
Caixa de mensagens entre lojista, plataforma e cliente. Cobre:

1. **Avisos da plataforma** (anúncios, mudanças, manutenção).
2. **Conversas com cliente** ligadas a um pedido específico —
   substitui o WhatsApp manual mencionado em
   `docs/18-consumer-app-pedido-e-perfil.md` (deeplink WhatsApp).
3. **Broadcast** do lojista para clientes recorrentes (push +
   in-app), respeitando opt-in.

### Layout

```
┌─────────────────────┬──────────────────────────────────────┐
│  Caixa de entrada   │  Conversa selecionada                │
│  [Todas · Cliente · │  ─ Header: cliente + pedido #123     │
│   Plataforma · Não  │  ─ Mensagens (chat)                  │
│   lidas]            │  ─ Input com sugestões rápidas:      │
│                     │      "Saiu para entrega",            │
│  • João — pedido    │      "Atrasou 10 min", etc.          │
│    Cadê meu pedido? │                                       │
│  • Plataforma —     │                                       │
│    Manutenção dia 7 │                                       │
└─────────────────────┴──────────────────────────────────────┘
```

### Tabelas novas

```sql
-- migration_006_messaging.sql (sugestão)
create table message_threads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  consumer_id uuid references consumers(id),
  order_id uuid references orders(id),
  origem text not null check (origem in ('cliente','plataforma','broadcast')),
  ultima_em timestamptz default now(),
  nao_lidas_lojista int default 0,
  nao_lidas_consumer int default 0,
  arquivada bool default false,
  criada_em timestamptz default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references message_threads(id) on delete cascade,
  autor_tipo text not null check (autor_tipo in ('lojista','consumer','sistema')),
  autor_id uuid,
  corpo text not null,
  metadados jsonb,
  criada_em timestamptz default now()
);
```

RLS: `tenant_id = my_tenant_id()` para ambas. Realtime habilitado em
`messages`.

### Server Actions

```ts
// lib/actions/mensagens.ts
'use server'

export async function getThreads(filtro: 'todas'|'cliente'|'plataforma'|'nao_lidas')
export async function getMensagensThread(threadId: string)
export async function enviarMensagem(threadId: string, corpo: string)
export async function marcarLido(threadId: string)
export async function arquivarThread(threadId: string)
export async function broadcast(input: {
  publico: 'recorrentes' | 'todos' | 'tag:fideliza'
  corpo: string
}): Promise<{ enviadas: number }>
```

### Notificações
- Cada nova mensagem do consumer dispara push no app do lojista
  (reusa infra de `docs/23-push-notifications.md`).
- Badge `[n]` no item da sidebar reflete `nao_lidas_lojista` total.

---

## 4.4 Avaliações (`/avaliacoes`)

### Escopo
Lojista lê o que o cliente avaliou (loja e entregador), responde,
solicita remoção quando aplicável.

### Layout

```
┌────────────────────────────────────────────────────────────┐
│  HEADER  "Avaliações"                                      │
│  KPI · Média geral 4.6 ★    KPI · Total 128                │
│  Distribuição: ★★★★★ 80%   ★★★★ 12%   ...                  │
│  Filtros: [ 30 dias ▾ ] [ Estrelas ▾ ] [ Sem resposta ☐ ]  │
├────────────────────────────────────────────────────────────┤
│  Lista cronológica:                                        │
│  ★★★★★  João — pedido #123                                  │
│    "Pão fresquinho!"                                       │
│    [Responder]                                             │
│                                                            │
│  ★★☆☆☆  Maria — pedido #115                                 │
│    "Demorou demais."                                       │
│    [Responder] [Sinalizar]                                 │
└────────────────────────────────────────────────────────────┘
```

### Tabelas
Reaproveita as avaliações do `docs/18-consumer-app-pedido-e-perfil.md`.
Sugerimos:

```sql
create table store_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  order_id uuid not null references orders(id) unique,
  consumer_id uuid not null references consumers(id),
  estrelas_loja int check (estrelas_loja between 1 and 5),
  estrelas_entrega int check (estrelas_entrega between 1 and 5),
  comentario text,
  resposta_lojista text,
  respondida_em timestamptz,
  sinalizada bool default false,
  criada_em timestamptz default now()
);
```

### Server Actions

```ts
// lib/actions/avaliacoes.ts
'use server'

export async function getAvaliacoes(filtros: {
  periodo?: Periodo
  estrelas?: number
  semResposta?: boolean
})
export async function responderAvaliacao(id: string, texto: string)
export async function sinalizarAvaliacao(id: string, motivo: string)
export async function getKpiAvaliacoes(periodo: Periodo)
```

### Notificações
- Avaliação ≤ 2 dispara push para o lojista e gera item em "Saúde da
  loja" da home.

---

## 4.5 Central de Ajuda (`/ajuda`)

### Escopo
Lojista busca como fazer algo, lê FAQ, abre chamado.

### Layout

```
┌────────────────────────────────────────────────────────────┐
│  HEADER  "Como podemos ajudar?"                            │
│  [ Buscar... ]                                             │
├────────────────────────────────────────────────────────────┤
│  Categorias rápidas (cards):                               │
│  [ Pedidos ] [ Pagamentos ] [ Entregadores ]               │
│  [ Vitrine ] [ Plano e faturas ]                           │
├────────────────────────────────────────────────────────────┤
│  Artigos populares                                         │
│  • Como configurar entregadores próprios                   │
│  • Como funciona a antecipação                             │
│  • O que fazer se um cliente não recebeu o pedido          │
├────────────────────────────────────────────────────────────┤
│  Suporte                                                   │
│  [Abrir chamado]  [WhatsApp]                               │
│  Tempo médio de resposta: 1h em horário comercial.         │
└────────────────────────────────────────────────────────────┘
```

### Conteúdo
- **Modelo simples no MVP**: artigos em arquivos `.mdx` em
  `apps/web/content/ajuda/*.mdx`, listados por frontmatter.
- **Busca**: client-side em uma estrutura indexada do build (FlexSearch
  ou Lunr).
- **Abrir chamado**: form que cria registro em tabela `support_tickets`
  e envia e-mail para o suporte.

### Tabela

```sql
create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  autor_id uuid not null references auth.users(id),
  assunto text not null,
  mensagem text not null,
  prioridade text default 'normal' check (prioridade in ('baixa','normal','alta','critica')),
  status text default 'aberto' check (status in ('aberto','em_andamento','resolvido','fechado')),
  criada_em timestamptz default now()
);
```

### Server Actions

```ts
// lib/actions/ajuda.ts
'use server'

export async function abrirChamado(input: {
  assunto: string
  mensagem: string
  prioridade?: 'baixa'|'normal'|'alta'|'critica'
}): Promise<{ ticketId: string }>

export async function listarMeusChamados()
```

### Mantém o "?" na sidebar como atalho permanente
O ícone `HelpCircle` permanece, mas leva para `/ajuda` (página real,
não 404).

---

## 4.6 RESUMO

Estas 5 páginas são pré-requisito para a sidebar não ter mais 404 e
para que o lojista tenha **um único lugar canônico** para cada
necessidade (operar entregas, analisar resultados, falar com cliente,
acompanhar reputação, pedir ajuda). As tabelas novas
(`message_threads`, `messages`, `store_reviews`, `support_tickets`,
opcionalmente `courier_invites`) podem entrar em uma única migration
`migration_006_dashboard_redesign.sql`.
