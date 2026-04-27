# 31 — Análise de Escalabilidade

### Mallora — 5.000 Lojistas · 100.000 Usuários

*Versão 1.0 — 27/04/2026*

---

## CONTEXTO

Divinópolis tem aproximadamente 200 mil habitantes. A meta da plataforma é atingir **5.000 lojistas ativos** e **100.000 usuários consumidores** no auge. Este documento mapeia os gargalos da arquitetura atual e propõe um roadmap de ações por prioridade.

---

## RESUMO EXECUTIVO

| Categoria | Estado atual | Risco na meta |
|-----------|-------------|---------------|
| Caching de páginas | ❌ Zero — todas `force-dynamic` | 🔴 Crítico |
| Paginação | ❌ Limites fixos sem offset | 🔴 Crítico |
| Rate limiting | ❌ Apenas debounce client-side | 🔴 Crítico |
| Connection pooling | ⚠️ Config local desabilitada | 🔴 Crítico |
| Busca full-text | ❌ ILIKE sem índice | 🟠 Alto |
| Realtime em escala | ⚠️ Limite de conexões Supabase Pro | 🟠 Alto |
| Notificações assíncronas | ⚠️ Síncrono sem fila | 🟠 Alto |
| Cron de payouts (spike) | ⚠️ Batch único sem throttle | 🟠 Alto |
| Monitoramento e alertas | ❌ Apenas `console.error` | 🟠 Alto |
| CI/CD automatizado | ❌ Não existe | 🟡 Médio |
| CDN de imagens | ⚠️ Supabase single-region | 🟡 Médio |
| Timeout de sessão | ⚠️ Sem inactivity timeout | 🟡 Médio |
| Testes de carga | ❌ Não existe | 🟡 Médio |

**O que já funciona bem:** JWT stateless (escala horizontal), RLS multi-tenant (seguro e correto), Vercel (CDN automático para assets estáticos), Edge Functions serverless (auto-scale), WebSocket realtime (não polling).

---

## 🔴 GARGALOS CRÍTICOS

### 1. Zero caching nas páginas do dashboard

**Onde:** `apps/web/app/(dashboard)/*/page.tsx`

Todas as páginas do dashboard do lojista usam:
```typescript
export const dynamic = 'force-dynamic'
```

Isso desabilita qualquer cache no Next.js — cada page view dispara queries diretas ao banco de dados.

**Impacto estimado:**
- 5.000 lojistas com sessão ativa × 10 page views/hora = **50.000 queries/hora** só de leituras de página
- Sem ISR, sem `unstable_cache`, sem `revalidateTag` — o banco absorve 100% das leituras

**Solução:**
```typescript
// Páginas de listagem — cache com revalidação periódica
export const revalidate = 60 // revalida a cada 60 segundos

// Após mutations — invalida só a rota afetada
import { revalidatePath } from 'next/cache'
revalidatePath('/dashboard/pedidos')

// Para dados por lojista — cache com tag
import { unstable_cache } from 'next/cache'
const getProdutos = unstable_cache(
  async (tenantId) => { /* query */ },
  ['produtos'],
  { tags: [`produtos-${tenantId}`], revalidate: 120 }
)
```

---

### 2. Ausência de paginação real

**Onde:** `apps/web/app/(dashboard)/pedidos/page.tsx`, `produtos/page.tsx`, `apps/mobile-consumer/app/(tabs)/buscar.tsx`

**Padrão atual:** Limites fixos sem offset:
```typescript
.limit(8)   // pedidos — retorna apenas os 8 primeiros, para sempre
.limit(10)  // busca — sem cursor, sem next page
```

**Dashboard de produtos — filtragem client-side em memória:**
```typescript
// lista-produtos.tsx
const shown = produtos.filter((p) =>
  p.nome.toLowerCase().includes(search.toLowerCase())
)
// Carrega TODOS os produtos do lojista na memória do browser
```

**Impacto estimado:**
- Um lojista no plano Premium com 500 produtos = 500 nós DOM renderizados simultaneamente
- Com 5.000 lojistas cada um com catálogos extensos, o browser trava

**Solução — paginação cursor-based:**
```typescript
// Server Action ou page.tsx
const { data } = await supabase
  .from('products')
  .select('*')
  .eq('tenant_id', tenantId)
  .order('criado_em', { ascending: false })
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

// Para listas longas — virtualização com react-window ou @tanstack/virtual
```

---

### 3. Sem rate limiting server-side

**Onde:** `apps/web/middleware.ts` (sem lógica de throttle), `supabase/config.toml` (sem config de limite de auth)

**Estado atual:** Apenas debounce de 400ms no `buscar.tsx` — proteção exclusivamente client-side, trivialmente contornável.

**Impacto:** Com 100.000 usuários:
- Brute-force em auth: Supabase tem limite hardcoded de 5 tentativas/5min — insuficiente sem proteção adicional
- Flood de queries: qualquer script pode fazer centenas de chamadas/segundo sem restrição
- Abuso de Edge Functions (pagamentos, notificações): sem defesa contra automação

**Solução — middleware Vercel com Upstash Redis:**
```typescript
// apps/web/middleware.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(60, '1 m'), // 60 req/min por IP
})

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1'
  const { success } = await ratelimit.limit(ip)
  if (!success) return new Response('Too Many Requests', { status: 429 })
  // ...resto do middleware
}
```

---

### 4. Connection pooling desabilitado

**Onde:** `supabase/config.toml`

```toml
[db.pooler]
enabled = false          # ← desabilitado (config de desenvolvimento)
pool_mode = "transaction"
default_pool_size = 20
max_client_conn = 100    # apenas 100 conexões simultâneas
```

**Impacto:** Em produção, o Supabase Pro usa PgBouncer internamente, mas sem usar a porta do pooler (6543), cada conexão é direta ao PostgreSQL — que tem limite físico de conexões simultâneas.

**Solução:**
- Usar a connection string de pooling do Supabase (porta 6543) no Vercel em vez da porta direta (5432)
- Garantir que as Edge Functions usam `SUPABASE_DB_URL` com pooler habilitado
- Para Supabase Pro: habilitar `[db.pooler]` e usar `pool_mode = "transaction"` (ideal para serverless)

---

## 🟠 ALTA PRIORIDADE

### 5. Busca via ILIKE sem índice full-text

**Onde:** `apps/mobile-consumer/app/(tabs)/buscar.tsx`

```typescript
supabase
  .from('products')
  .ilike('nome', `%${texto}%`)  // sequential scan na tabela inteira
  .limit(10)
```

**Impacto:** Com 5.000 lojistas × média 100 produtos = **500.000 linhas** na tabela `products`. ILIKE com wildcard inicial (`%termo%`) não usa índice B-tree — faz full sequential scan.

**Solução — índice trigram:**
```sql
-- Nova migration
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_products_nome_trgm
  ON products USING GIN (nome gin_trgm_ops);

CREATE INDEX idx_stores_nome_trgm
  ON stores USING GIN (nome gin_trgm_ops);
```
Com este índice, ILIKE passa a usar GIN e fica ~100x mais rápido. Para escala maior, considerar PostgreSQL Full-Text Search ou Typesense.

---

### 6. Realtime sem controle de conexões

**Onde:** `apps/web/components/dashboard/painel-pedidos-realtime.tsx`

Cada lojista com dashboard aberto cria um canal WebSocket:
```typescript
canal = supabase.channel(`pedidos-${tenant.id}`)
  .on('postgres_changes', { event: '*', table: 'orders', filter: `tenant_id=eq.${tenant.id}` }, ...)
  .subscribe()
```

**Impacto:** 5.000 lojistas simultâneos = 5.000 conexões WebSocket. O Supabase Pro suporta ~500–1.000 conexões Realtime simultâneas. Acima disso, conexões começam a falhar silenciosamente.

**Agravante:** A cada INSERT de pedido novo, o handler faz uma query adicional ao banco:
```typescript
// Busca o pedido completo a cada evento — query extra desnecessária
const { data } = await supabase.from('orders').select(`...`).eq('id', payload.new.id).single()
```

**Solução:**
1. Para UPDATEs, usar `payload.new` diretamente em vez de re-buscar
2. Para INSERTs que precisam de dados relacionais (consumer, items), manter a query mas com `select` mínimo
3. Planejar upgrade para Supabase Team quando conexões Realtime ultrapassarem 1.000 simultâneas

---

### 7. Push notifications síncronas sem fila

**Onde:** `supabase/functions/notify-order-update/index.ts`

A Edge Function é chamada via webhook do banco de dados. Ela executa de forma síncrona: busca tokens, formata mensagens, chama Expo API — tudo numa única chamada HTTP bloqueante.

**Impacto:**
- Se a Expo API estiver lenta ou fora do ar, o webhook trava e pode causar timeout
- Sem retry automático: se falhar, a notificação é perdida
- Em horário de pico (hora do almoço), muitos pedidos simultâneos = muitas chamadas síncronas à Expo API

**Solução de curto prazo:** Adicionar try/catch robusto com log de falhas e não lançar erro para o webhook (retornar 200 sempre — o webhook não deve falhar por causa de push).

**Solução ideal:** Desacoplar via tabela de fila:
```sql
CREATE TABLE notification_queue (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payload    JSONB NOT NULL,
  tentativas INTEGER DEFAULT 0,
  criado_em  TIMESTAMPTZ DEFAULT now(),
  processado_em TIMESTAMPTZ
);
```
Um segundo cron processa a fila em lotes, com retry exponencial.

---

### 8. Cron de payouts gera spike de carga

**Onde:** `supabase/functions/daily-payouts/index.ts`

O cron roda às 03:00 UTC e processa **todos** os repasses de uma vez — potencialmente milhares de Stripe Transfers em sequência num único invocation da Edge Function.

**Impacto:**
- Stripe API tem rate limit de 100 requests/segundo por conta — 5.000 lojistas podem estourar isso
- Edge Function tem timeout máximo de 150s no Supabase Pro — com volume alto, pode expirar antes de terminar
- Single point of failure: se a Edge Function falhar a meio, parte dos repasses não é processada

**Solução — processamento em micro-lotes:**
```typescript
const LOTE_SIZE = 50
const DELAY_MS = 200

for (let i = 0; i < lojistas.length; i += LOTE_SIZE) {
  const lote = lojistas.slice(i, i + LOTE_SIZE)
  await Promise.all(lote.map(processarRepasse))
  if (i + LOTE_SIZE < lojistas.length) {
    await new Promise(r => setTimeout(r, DELAY_MS))
  }
}
```

---

### 9. Sem monitoramento e alertas

**Estado atual:** Único log encontrado em todo o projeto:
```typescript
// stripe-webhook/index.ts
console.error('Erro ao processar webhook:', error)
```

**Impacto:** Com 100.000 usuários em produção, qualquer incidente (falha de pagamento, Edge Function falhando, spike de erros RLS) é invisível até que um usuário reclame.

**Solução — stack de observabilidade:**

| Ferramenta | Finalidade | Custo |
|------------|-----------|-------|
| **Sentry** | Error tracking (Next.js + Edge Functions) | Free tier suficiente no início |
| **Vercel Analytics** | Web Vitals, latência por rota | Incluído no Vercel Pro |
| **Supabase Log Drain** | Exporta logs do banco/auth para qualquer destino | Supabase Pro |
| **Logtail / Axiom** | Centralização de logs + alertas | ~$25/mês |

**Implementação mínima imediata (Sentry em Edge Functions):**
```typescript
// supabase/functions/helpers/sentry.ts
import * as Sentry from 'https://esm.sh/@sentry/deno'
Sentry.init({ dsn: Deno.env.get('SENTRY_DSN') })

export function capturarErro(erro: unknown, contexto?: object) {
  Sentry.captureException(erro, { extra: contexto })
}
```

---

## 🟡 MÉDIO PRAZO

### 10. Ausência de CI/CD automatizado

**Estado atual:** Sem `.github/workflows`, sem pipeline de testes automáticos.

**Risco:** A cada deploy manual, não há validação de:
- Regressões em RLS policies (pode vazar dados entre tenants)
- Migrations quebradas em produção
- Build errors nos 4 apps

**Solução — GitHub Actions mínimo:**
```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  validate:
    steps:
      - run: supabase db diff --local  # verifica migrations
      - run: pnpm typecheck            # TypeScript em todos os apps
      - run: pnpm -r build             # build de todos os apps
      - run: node scripts/test-rls-isolation.mjs  # RLS tests
```

---

### 11. Imagens sem CDN de borda

**Onde:** `apps/web/next.config.mjs`

```javascript
remotePatterns: [
  { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' }
]
```

Imagens de produtos servidas diretamente do Supabase Storage (single-region). O Next.js Image faz otimização (resize, WebP, lazy loading), mas a origem dos bytes está num único ponto geográfico.

**Solução:** Configurar Cloudflare como proxy na frente do Supabase Storage — cache de borda gratuito no plano Free do Cloudflare.

---

### 12. Sessões sem timeout por inatividade

**Onde:** `supabase/config.toml` — `jwt_expiry = 3600` sem `inactivity_timeout`.

**Impacto:** A tabela `auth.refresh_tokens` cresce continuamente. Com 100.000 usuários cada um renovando tokens a cada hora, isso gera ~2.4M de rotações/dia. Sem limpeza, a tabela acumula dados desnecessários.

**Solução:**
```toml
[auth.sessions]
inactivity_timeout = "8h"  # invalida sessão após 8h sem uso
```

---

### 13. Sem testes de carga

**Estado atual:** Nenhum script k6/Artillery/Locust no repositório. O ponto de ruptura do sistema é desconhecido.

**Solução — cenários k6 prioritários:**

```javascript
// scripts/load-test/checkout.js
import http from 'k6/http'
import { check } from 'k6'

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // ramp-up
    { duration: '5m', target: 1000 },  // carga sustentada (1k usuários)
    { duration: '2m', target: 5000 },  // pico (hora do almoço)
    { duration: '2m', target: 0 },     // ramp-down
  ],
}

export default function () {
  // 1. Listar lojas (home)
  // 2. Buscar produto
  // 3. Criar PaymentIntent
  // 4. Confirmar pedido
}
```

---

## ROADMAP DE AÇÕES

### Fase 1 — Imediato (0–2 meses)

| # | Ação | Esforço | Impacto |
|---|------|---------|---------|
| 1 | Ativar `revalidate = 60` nas páginas de listagem do dashboard | Baixo | 🔴 Crítico |
| 2 | Implementar paginação cursor-based em produtos e pedidos | Médio | 🔴 Crítico |
| 3 | Adicionar rate limiting no middleware com Upstash Ratelimit | Baixo | 🔴 Crítico |
| 4 | Usar connection string com pooler (porta 6543) no Vercel | Baixo | 🔴 Crítico |
| 5 | Adicionar Sentry nas Edge Functions e no Next.js | Baixo | 🟠 Alto |
| 6 | Throttling no cron `daily-payouts` (micro-lotes de 50) | Baixo | 🟠 Alto |

### Fase 2 — Curto prazo (2–4 meses)

| # | Ação | Esforço | Impacto |
|---|------|---------|---------|
| 7 | Migration com índice GIN trigram em `products.nome` e `stores.nome` | Baixo | 🟠 Alto |
| 8 | Otimizar handler Realtime (usar `payload.new` em vez de re-fetch no UPDATE) | Baixo | 🟠 Alto |
| 9 | GitHub Actions com typecheck + build + RLS tests | Médio | 🟡 Médio |
| 10 | Implementar fila de notificações (tabela + cron) | Médio | 🟠 Alto |
| 11 | Adicionar `inactivity_timeout = "8h"` na config de auth | Baixo | 🟡 Médio |

### Fase 3 — Médio prazo (4–6 meses)

| # | Ação | Esforço | Impacto |
|---|------|---------|---------|
| 12 | Scripts k6 de carga (cenários: 1k, 5k, 10k usuários) | Médio | 🟡 Médio |
| 13 | Cloudflare na frente do Supabase Storage (CDN de imagens) | Baixo | 🟡 Médio |
| 14 | Avaliar upgrade Supabase Team para mais conexões Realtime | Baixo | 🟠 Alto |
| 15 | Read replicas para queries de relatórios (Supabase Team+) | Alto | 🟡 Médio |
| 16 | Virtualização de listas longas com `@tanstack/virtual` | Médio | 🟠 Alto |

---

## O QUE JÁ ESTÁ BEM

Estes componentes **não precisam de mudança** para atingir a meta de escala:

| Componente | Por quê funciona |
|------------|-----------------|
| **JWT stateless** | Não há servidor de sessão — auth escala horizontalmente sem estado |
| **RLS multi-tenant** | Isolamento garantido pelo banco — correto e testado |
| **Vercel hosting** | CDN automático, deploy atômico, escala sem configuração |
| **Edge Functions serverless** | Auto-scale por definição — não há servidor fixo para dimensionar |
| **WebSocket Realtime** | Mais eficiente que polling — uma conexão sustentada vs. N requests por segundo |
| **Expo EAS Build** | Distribuição via App Stores — escala independente do backend |
| **Monorepo pnpm + Turbo** | Tipos compartilhados evitam drift entre apps; builds incrementais |
| **Stripe Connect** | Processamento de pagamentos delegado — sem PCI scope próprio |
