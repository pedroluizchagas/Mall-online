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

## Lojas-demo das vitrines (bloco gerado do seed)

`pnpm seed:vitrines` regenera, entre os marcadores `-- >>> DEMO DAS VITRINES` e
`-- <<< DEMO DAS VITRINES` do `seed.sql`, **18 lojas** portadas do dataset mock
do consumer (`apps/mobile-consumer/lib/mock/dataset.ts`): uma por vitrine da
tabela `VITRINES` (@mallevo/lib) e uma por arquétipo prioritário ainda sem
vitrine (`heritage`, `market`, `soft`). Cada loja tem lojista próprio
(`demo-<slug>@mallevo.local` / `mallevo-demo-2026`, recebimentos ativos),
catálogo com metadata de vitrine (galeria, recorte, ficha, unidade,
`exige_receita`), estoque real (`track_stock`/`stock_quantity` — o
`metadata.estoque` do mock virou coluna) e os posts do Explorar que o mock já
tinha. IDs são determinísticos (md5 do slug), então regerar não duplica.

| Slug | Vitrine / arquétipo |
|---|---|
| `vitrine-fashion` | Editorial |
| `urban-wear` | Raw |
| `atelie-camelia` | Serena |
| `casa-conforto` | Artesã |
| `cantina-bella-italia` | Noir |
| `nucleo-pilates` | Volt |
| `divinolab` | Clínica |
| `cafe-aroma` | Torra |
| `burger-house` | Smash |
| `roxa-acai` | Ritual |
| `lojao-central` | Magazine |
| `broto-e-grao` | Horta |
| `forno-real` | Forno |
| `monarca` | Passarela |
| `quintal-verde` | Feira |
| `sabor-mineiro` | `heritage` (layout padrão) |
| `tintas-aurora` | `market` (layout padrão) |
| `esmalteria-lilas` | `soft` (layout padrão) |

Storefront: `http://<slug>.mallevo.localhost:3002/`. Saguão: `http://mallevo.localhost:3002/`.

## Consumer fora do mock (Fase 4)

O app do consumidor roda sobre o mesmo seed, sem o dataset em memória:

```bash
cd apps/mobile-consumer
# .env.local: aponte para o Supabase local (o celular precisa alcançar a máquina —
# use o IP da rede, não 127.0.0.1) e desligue o mock.
EXPO_PUBLIC_SUPABASE_URL=http://<ip-da-maquina>:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY de `supabase status`>
EXPO_PUBLIC_USE_MOCK=false
npx expo start --clear     # env é inlinado pelo babel: sempre --clear ao trocar
```

O que muda fora do mock e já está coberto: a página da loja seleciona `slug`,
`track_stock` e `stock_quantity`; o "Aberto" literal virou `statusAbertura`
(lib) em todas as vitrines e no layout padrão (sem horários → sem pílula); o
home agrupa por piso com `agruparPorPiso` da lib (o mesmo do saguão web).

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
- Os logos das lojas-demo são data URIs (PNG) copiados do mock — o seed
  cresce ~80 KB por isso; é intencional (o splash e a fachada usam o logo).
