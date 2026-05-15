# Storefront — Documentação de Implementação

> Loja web dedicada do parceiro em `{loja}.mallevo.com.br` — projeto Vercel
> próprio (`apps/storefront`), isolado do runtime do Dashboard.

## Modelo de produto: 3 superfícies, 1 cérebro

O Mallevo expõe **três frontends isolados** sobre **um único backend compartilhado**:

| Superfície | App | Público | Frontend | Backend |
|---|---|---|---|---|
| Aba "loja" no app Mallevo | `apps/mobile-consumer` | consumidor (app) | isolado | **compartilhado** |
| Storefront wildcard `{loja}.mallevo.com.br` | `apps/storefront` (novo) | consumidor (web, anônimo) | isolado | **compartilhado** |
| Dashboard do lojista | `apps/web` | lojista (autenticado) | isolado | **compartilhado** |

O lojista usa o storefront como e-commerce próprio (link na bio, venda fora do
app, atendimento isolado) **e** o Dashboard para administrar tudo de forma
centralizada — vendas do app, vendas do storefront, e entrega Mallevo quando a
venda é para a cidade.

**Regra de ouro:** o isolamento é de **runtime / deploy / frontend**, NUNCA de
dados. Supabase, catálogo, checkout Pagar.me, roteamento de entrega e a tabela
`orders` são um só backend. Pedidos dos três canais convergem no mesmo Dashboard.

## Decisões de arquitetura (fechadas)

1. **Projeto separado** `apps/storefront` (projeto Vercel próprio), não rota em `apps/web`.
2. **`apps/storefront` é dono do wildcard** `*.mallevo.com.br`. `apps/web` fica só
   com `app.mallevo.com.br`; `apps/admin` com `admin.mallevo.com.br`.
3. **Roteamento host-based**, sem segmento `/loja/[slug]`. Todo request é uma loja.
4. **Catálogo público via view dedicada** (`public_catalog_*`), NÃO abrindo as
   tabelas base `stores`/`products` ao papel `anon`. RLS é row-level, não
   column-level — view protege colunas sensíveis.
5. **`orders.origem`** nova coluna (`app` | `storefront` | `dashboard_manual`)
   para os três canais convergirem distinguíveis no Dashboard.
6. **Lógica de entrega/cobertura compartilhada** em `packages/lib`, nunca
   reimplementada no storefront.
7. **Sessão por subdomínio** (cookie escopado ao host exato). Não compartilhar
   sessão entre lojas nem com Dashboard/Admin.

## Índice

- `01-arquitetura-e-decisoes.md` — decisões, o que é isolado vs compartilhado, riscos
- `02-stage-0-preflight.md` — RLS via view + `orders.origem` + extração p/ lib (BLOQUEANTE)
- `03-stage-1-scaffold.md` — scaffold do `apps/storefront`
- `04-stage-2-roteamento.md` — middleware host-based + resolução de tenant
- `05-stage-3-storefront.md` — storefront completo (catálogo → pedido)
- `06-stage-4-corte-dominio.md` — runbook do corte do wildcard na Vercel
- `07-prompts-execucao.md` — prompts auto-contidos para o agente executor
- `08-workflow-tech-lead.md` — ciclo executar → resumir → revisar → merge

## Como usar esta documentação

1. Tech lead (arquiteto) mantém `01`–`06` como fonte da verdade do design.
2. Para cada stage, o tech lead entrega ao agente executor o prompt
   correspondente de `07-prompts-execucao.md` (auto-contido).
3. O executor implementa, commita na branch da feature e **resume o que fez**.
4. O resumo volta ao tech lead, que valida contra o doc do stage e decide:
   ajustar (novo prompt) ou avançar / mergear (`08-workflow-tech-lead.md`).

## Status dos stages

| Stage | Descrição | Status |
|---|---|---|
| 0 | Pré-flight: RLS view, `orders.origem`, extração lib | ✅ concluído (validado tech lead) |
| 1 | Scaffold `apps/storefront` | ✅ concluído (validado tech lead) |
| 2 | Roteamento host-based + tenant | ✅ concluído (validado tech lead) |
| 3 | Storefront completo (3a–3f) | ⬜ não iniciado |
| 4 | Corte de domínio Vercel | ⬜ não iniciado |

> Atualizar esta tabela ao fim de cada stage (responsabilidade do tech lead).
