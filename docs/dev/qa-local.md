# QA local — Supabase local + seed demo + e2e do dashboard

Ambiente isolado para verificar o dashboard (`apps/web`) e o storefront com
sessão autenticada e dados de demonstração, **sem tocar em produção**. Nasceu
na convergência web · storefront · mobile (plano em
`plano-convergencia-web-storefront-mobile.md`, Fase 4 "seed demo").

## Pré-requisitos

- Docker daemon rodando: `sudo systemctl start docker` (e o usuário no grupo
  `docker`, ou rodar com `sudo`).
- Supabase CLI (já instalado) e Playwright (devDependency de `apps/web`;
  navegador: `pnpm --filter web exec playwright install chromium`).

## Rodar tudo

```bash
pnpm qa:local            # scripts/qa-local.sh
```

O script: `supabase start` → `supabase db reset` (migrations + `supabase/seed.sql`)
→ exporta as chaves locais → `pnpm --filter web e2e`. O Playwright sobe o
dashboard em `http://127.0.0.1:3100` e o storefront em `:3002` (o iframe do preview
de Minha Loja) apontando para o Supabase local (variáveis
de ambiente vencem o `.env.local`, que continua apontando para produção e não
é alterado). Capturas ficam em `apps/web/test-results/shots/`.

## O que o seed cria (`supabase/seed.sql`)

| Coisa | Valor |
|---|---|
| Login do dashboard | `qa@mallevo.local` / `mallevo-qa-2026` |
| Tenant | QA Mallevo (plano Profissional QA) |
| Loja | **Forno Demo**, slug `forno-demo`, categoria alimentos-bebidas, `theme {v:2, preset:'slice'}` → vitrine **Forno** no app e no web |
| Conteúdo da vitrine | campanha, manifesto, 2 destaques, 2 fotos da casa (`stores.conteudo`) |
| Catálogo | Pizzas / Entradas / Bebidas, 6 produtos com foto; Margherita com galeria, recorte e ficha técnica; bebidas com unidade |
| Categorias globais | as 20 de `CATEGORIA_SLUG_TO_TEMPLATE`, com `tenant_id NULL` |

## O que o e2e cobre (`apps/web/e2e/vitrine.spec.ts`)

- `/minha-loja`: painel "Vitrine ativada: Forno"; seção "Conteúdo da vitrine"
  carrega o seed; editar o título, publicar e recarregar mantém o valor; o iframe
  do preview carrega o storefront real vestindo o rascunho (wordmark = título).
- `/produtos/<margherita>`: bloco "Mídia e vitrine" com as 2 fotos da galeria,
  o recorte e a ficha do seed; adicionar uma linha e salvar persiste.

## Storefront contra o mesmo seed

```bash
cd apps/storefront
eval "$(supabase status -o env | sed -n 's/^API_URL=/export NEXT_PUBLIC_SUPABASE_URL=/p; s/^ANON_KEY=/export NEXT_PUBLIC_SUPABASE_ANON_KEY=/p')"
STOREFRONT_ALLOW_PREVIEW_OVERRIDE=true pnpm dev
# http://forno-demo.mallevo.localhost:3002/  (Firefox/Chrome resolvem *.localhost)
```

## Limites conhecidos

- `supabase db reset` apaga o banco LOCAL inteiro — é o esperado.
- O seed usa fotos do picsum (rede). Sem rede, as vitrines mostram os fallbacks.
- `next build` do web falha no erro pré-existente de tipos em
  `(dashboard)/layout.tsx:80` (`@types/react` 19 da lib vs React 18) — o
  `next dev` do e2e não é afetado.
