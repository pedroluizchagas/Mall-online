# Stage 4 — Catálogo: Produtos, Categorias e Estoque

> O lojista mantém o cardápio/catálogo do celular: criar produto com foto em
> um minuto, pausar item que acabou, ajustar preço e estoque na hora. Depende
> dos Stages 1–2.

## Fonte da verdade das regras

[`apps/web/lib/actions/produtos.ts`](../../apps/web/lib/actions/produtos.ts),
`categorias.ts` e `estoque.ts` + as migrations de variações/modificadores
(`migration_015`–`018`) e metadados (`migration_019`). O app replica queries e
mutações sob a mesma RLS; limites de plano são o trigger no banco (nunca
checados no cliente).

## Produtos (`produtos/`)

- **Lista** (`produtos/index.tsx`): busca por nome, filtro por categoria e
  disponibilidade; card com foto, nome, preço, badge de estoque baixo.
  **Toggle de disponibilidade inline** (otimista) — a ação nº 1 do dia a dia.
  Barra de uso do plano (X/Y produtos) como no Dashboard.
- **Criar** (`produtos/novo.tsx`): fluxo mobile-first em uma tela rolável —
  foto (câmera ou galeria via `expo-image-picker`, comprimida com
  `expo-image-manipulator`, upload no bucket `product-images` com o mesmo
  path-pattern do Dashboard), nome, descrição, preço (centavos — helpers de
  `@mallevo/lib`), categoria, disponibilidade, estoque inicial (se
  `track_stock`).
- **Editar** (`produtos/[id].tsx`): mesmos campos + trocar foto.
- **Variações/modificadores**: **exibir** as existentes (leitura completa,
  preços por variação) e permitir editar preço/disponibilidade de variação.
  Criação/estruturação de grupos de modificadores fica **web-only** no MVP
  (decisão `01` §3) — CTA "estruturar no Dashboard".
- Ao atingir limite do plano: o INSERT falha pelo trigger → tratar o erro com
  a mesma mensagem/UX do Dashboard (upsell de plano).

## Categorias (`categorias.tsx`)

CRUD espelhando o Dashboard: nome, emoji/ícone, **ordem** (reordenar por
arrastar — long-press drag; fallback setas ↑↓), ativa/inativa. Respeitar a
imutabilidade de slug (`migration_014`).

## Estoque (`estoque/`)

- **Visão** (`estoque/index.tsx`): produtos com `track_stock`, quantidade
  atual, alerta de mínimo (mesma regra do Dashboard), busca.
- **Movimentar** (`estoque/[id].tsx`): entrada (reposição), ajuste com motivo
  (perda/correção) — grava `stock_movements` como `estoque.ts` grava
  (incluindo variantes — `migration_018`); histórico de movimentações do
  produto.
- Disponibilidade por plano: mesma verificação de feature do Dashboard (vem
  do plano, não hardcode).

## Critérios de aceite

- [ ] Criar produto com foto pelo app → aparece no Dashboard, no consumer e
      no storefront sem ajuste (mesmo bucket/paths/campos).
- [ ] Toggle de disponibilidade reflete no cardápio do consumer imediatamente.
- [ ] Limite de plano bloqueia via trigger com UX tratada (sem checagem no
      cliente).
- [ ] Reordenar categorias persiste e muda a ordem no consumer/storefront.
- [ ] Movimentações de estoque geram `stock_movements` idênticos aos do
      Dashboard (mesmos campos/motivos).
- [ ] Editar variação (preço/disponibilidade) funciona; estruturar
      modificadores aponta para o Dashboard (CTA), sem quebrar.
- [ ] RLS: catálogo de outro tenant é invisível/imutável (teste negativo).
