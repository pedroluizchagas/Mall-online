# 07 — Prompts de Execução

Prompts auto-contidos gerados pelo tech lead (arquiteto) para o agente executor.
Um stage por vez. O executor NÃO improvisa escopo: implementa o stage, commita
na branch `claude/storefront-architecture-plan-51Y30`, e **resume o que fez**
(formato em `08-workflow-tech-lead.md`).

Regras gerais para o executor (incluir mentalmente em todo prompt):
- Branch: `claude/storefront-architecture-plan-51Y30`. Não mergear, não tocar `main`.
- Ler os docs referenciados antes de codar. Eles são a fonte da verdade.
- Não expandir escopo além do stage. Dúvida de ambiguidade → registrar no
  resumo como "decisão pendente do tech lead", não chutar.
- Validar com typecheck/build dos apps afetados antes de commitar.
- Commits pequenos e descritivos. Ao fim, produzir o RESUMO estruturado.

---

## Prompt — Stage 0 (Pré-flight, BLOQUEANTE)

```
Você está no monorepo Mallevo (pnpm + Turborepo), branch
claude/storefront-architecture-plan-51Y30. Implemente o Stage 0 do storefront.

Leia primeiro, como fonte da verdade:
- docs/storefront/01-arquitetura-e-decisoes.md (decisões D2, D3, D4)
- docs/storefront/02-stage-0-preflight.md (especificação completa do stage)

Contexto: vamos lançar uma loja web anônima. Hoje o RLS bloqueia leitura
anônima de stores/products (TO authenticated), orders não tem coluna de canal,
e os stores Zustand + tenant-dns precisam virar código compartilhado.

Entregue, exatamente como descrito em 02-stage-0-preflight.md:
1. (0a) Migration nova em supabase/migrations/ criando views públicas
   public_catalog_* com colunas explícitas e seguras (SEM custo, tenant_id ou
   campos internos), GRANT SELECT só nas views para anon. NÃO abrir as tabelas
   base. NÃO alterar policies de orders/order_items/consumers. Antes de
   escrever, leia os CREATE TABLE reais (migration_001 e migrations de stores/
   products/variants/modifiers) para usar os nomes de coluna corretos.
2. (0b) Coluna orders.origem TEXT NOT NULL DEFAULT 'app' + CHECK
   (app|storefront|dashboard_manual) + índice.
3. (0c) Mover useCartStore/useOrderStore/useAuthStore para
   packages/lib/src/stores/ e tenant-dns para packages/lib/src/dns/, exportar
   no index, adicionar zustand às deps de packages/lib, e deixar shims de
   re-export nos caminhos antigos (mobile-consumer/store/*, apps/web dns).
4. (0c.1) Extrair a regra pura de cobertura/entrega para
   packages/lib/src/delivery/coverage.ts e fazer mobile-consumer consumir dela.
   Se estiver entrelaçada com UI, extraia só a parte pura e registre TODO.

Migrations idempotentes com rollback documentado no header.

Valide: anon lê as views (linhas ativas) e NÃO lê stores/products base;
orders.origem existe; packages/lib exporta tudo; apps/web e
apps/mobile-consumer compilam sem mudança de comportamento (typecheck/build).
Cheque todos os critérios de aceite de 02-stage-0-preflight.md.

Commite na branch e produza o RESUMO no formato de
docs/storefront/08-workflow-tech-lead.md.
```

---

## Prompt — Stage 1 (Scaffold)

```
Monorepo Mallevo, branch claude/storefront-architecture-plan-51Y30. Stage 0 já
concluído e validado. Implemente o Stage 1 (scaffold de apps/storefront).

Leia: docs/storefront/03-stage-1-scaffold.md (especificação completa) e
docs/storefront/01-arquitetura-e-decisoes.md (decisões D1, D5).

Crie o esqueleto compilável de apps/storefront exatamente como em
03-stage-1-scaffold.md: package.json (espelhando apps/web, deps corretas, sem
recharts/stripe/react-hook-form, dev na porta 3002), next.config.mjs,
tsconfig.json, postcss, tailwind.config.ts (tokens traduzidos de
apps/mobile-consumer/lib/consumer-design.ts), app/layout.tsx + globals.css,
lib/supabase/{client,server}.ts (copiados do padrão de apps/web), lib/
{consumer-design,format}.ts, .env.local.example, README.md, public/.
app/page.tsx pode ser placeholder.

NÃO implemente middleware/tenant (Stage 2) nem telas reais (Stage 3).
NÃO altere apps/web nem apps/admin.

Valide todos os critérios de aceite de 03-stage-1-scaffold.md
(install reconhece o app, dev sobe na 3002, build e typecheck passam).

Commite e produza o RESUMO no formato de
docs/storefront/08-workflow-tech-lead.md.
```

---

## Prompt — Stage 2 (Roteamento + tenant)

```
Monorepo Mallevo, branch claude/storefront-architecture-plan-51Y30. Stages 0–1
concluídos. Implemente o Stage 2 (roteamento host-based + resolução de tenant).

Leia: docs/storefront/04-stage-2-roteamento.md (especificação) e a decisão D1
em docs/storefront/01-arquitetura-e-decisoes.md. Use como referência (NÃO
copiar a lógica de rewrite) apps/web/middleware.ts.

Entregue: apps/storefront/middleware.ts (host-based, injeta x-store-slug, SEM
rewrite para /loja/[slug], com bloco de refresh de token @supabase/ssr, matcher
correto), apps/storefront/lib/tenant.ts (getStoreSlug via headers, getStore
consultando a view public_catalog_stores do Stage 0, notFound em loja
inexistente/inativa), app/loja-nao-encontrada/page.tsx, e atualize
README.md com instruções de dev local (*.mallevo.localhost).
app/page.tsx mínima imprimindo slug + dados básicos da loja vindos da view.

NÃO implemente catálogo/checkout (Stage 3). NÃO toque apps/web.

Valide todos os critérios de aceite de 04-stage-2-roteamento.md (slug resolvido,
404 para inexistente/inativa, apex sem crash, token refresh, zero path /loja/).

Commite e produza o RESUMO no formato de
docs/storefront/08-workflow-tech-lead.md.
```

---

## Prompt — Stage 3 (por subestágio)

> Gerar um prompt por subestágio (3a→3f) — NÃO pedir os 6 de uma vez. Modelo
> (substituir `<X>` pelo subestágio):

```
Monorepo Mallevo, branch claude/storefront-architecture-plan-51Y30. Stages 0–2
concluídos; subestágios anteriores de 3 (se houver) concluídos. Implemente
APENAS o subestágio 3<X> do storefront.

Leia: docs/storefront/05-stage-3-storefront.md (seção 3<X> + critérios de
aceite e2e) e docs/storefront/01-arquitetura-e-decisoes.md (D2 catálogo via
view, D3 origem='storefront', D4 entrega via @mallevo/lib, D5 sessão por
subdomínio). Use o arquivo mobile de origem citado na seção 3<X> como
REFERÊNCIA DE COMPORTAMENTO — é reescrita RN→DOM, não cópia.

Implemente só o escopo de 3<X>. Catálogo lê das views públicas (anon).
Pedidos carimbam origem='storefront'. Regra de entrega vem de @mallevo/lib,
não reimplementada. PAN/CVV só browser→pagar.me.

NÃO toque apps/web/middleware.ts (Stage 4). NÃO avance para o próximo
subestágio.

Valide os critérios de aceite e2e aplicáveis a 3<X> em
05-stage-3-storefront.md. Commite e produza o RESUMO no formato de
docs/storefront/08-workflow-tech-lead.md, listando explicitamente o que ficou
fora (próximos subestágios) e qualquer decisão pendente.
```

---

## Prompt — Stage 4 (só código; ops são humanas)

```
Monorepo Mallevo, branch claude/storefront-architecture-plan-51Y30. Stages 0–3
concluídos e validados; o corte de domínio na Vercel/Cloudflare (passos
operacionais 2–5, 7–8) foi confirmado pelo tech lead como já executado por
humano. Implemente APENAS as partes de código do Stage 4.

Leia: docs/storefront/06-stage-4-corte-dominio.md.

Entregue só os passos de código:
- Passo 6: remover de apps/web/middleware.ts o bloco de subdomínio
  (getSubdomain, if(slug){rewrite}, MAIN_DOMAINS, IGNORED_SUBDOMAINS),
  MANTENDO refresh de token e lógica de onboarding intactos. Deletar stub
  apps/web/app/loja/[slug]/page.tsx. Remover *.mallevo.com.br e
  *.mallevo.localhost de apps/web/next.config.mjs allowedOrigins.
- (Opcional) script back-to-back do passo 4 via API Vercel, se solicitado.

NÃO execute operações de Vercel/Cloudflare/DNS — não tem acesso e não deve
tentar. Apenas código. Valide que apps/web compila e que token
refresh/onboarding seguem funcionando (não quebrar middleware).

Cheque os critérios de aceite de código de 06-stage-4-corte-dominio.md.
Commite e produza o RESUMO no formato de
docs/storefront/08-workflow-tech-lead.md.
```
