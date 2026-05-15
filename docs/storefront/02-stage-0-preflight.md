# Stage 0 — Pré-flight (BLOQUEANTE)

Sem este stage, navegação anônima quebra e os 3 canais não convergem. Tudo aqui
precede o Stage 3a.

## 0a — RLS: catálogo público via VIEW

Criar migration nova `supabase/migrations/<timestamp>_storefront_public_catalog.sql`.

Princípio (D2): views `SECURITY INVOKER` com colunas explícitas e seguras;
`GRANT SELECT ... TO anon` **só nas views**; tabelas base permanecem
`TO authenticated`.

Views a criar (colunas só as necessárias para renderizar o storefront — sem
custo, sem `tenant_id`, sem campos internos):

- `public_catalog_stores` — de `stores` onde `ativo = true`. Colunas:
  `id, slug, nome, descricao, logo_url, banner_url, taxa_entrega,
  tempo_entrega, telefone, aceita_*, horarios, categoria_id`
  (validar nomes reais em `migration_001` e migrations de `stores`).
- `public_catalog_products` — de `products` onde `disponivel = true` E a loja
  está ativa. Colunas: `id, store_id, categoria_id, nome, descricao, preco,
  imagem_url, ordem, disponivel` + campos de variant/modifier necessários.
- `public_catalog_product_variants` / `public_catalog_product_modifiers` —
  análogo, filtrados a produto disponível.
- `categories` já tem `categories_select_publico` para anon — reusar; não
  recriar. Validar que cobre o que o storefront precisa.

Regras:
- NÃO usar `SECURITY DEFINER` sem necessidade; default invoker + GRANT explícito.
- `GRANT SELECT ON public_catalog_* TO anon, authenticated;`
- Revisar colunas reais antes de escrever (ler o `CREATE TABLE` de cada uma nas
  migrations). Se alguma coluna sensível existir, ela NÃO entra na view.
- Migration idempotente: `CREATE OR REPLACE VIEW` + `DROP VIEW IF EXISTS` no rollback documentado no header.

Checkout (`orders`, `order_items`, lookup `consumers`) **continua exigindo JWT
de consumer** — não tocar nessas policies.

## 0b — `orders.origem`

Mesma migration ou migration irmã:

```sql
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'app';

ALTER TABLE orders
  ADD CONSTRAINT orders_origem_check
  CHECK (origem IN ('app', 'storefront', 'dashboard_manual'));

CREATE INDEX IF NOT EXISTS idx_orders_origem ON orders(origem);
```

`DEFAULT 'app'` mantém pedidos existentes consistentes (eram todos do app).
Documentar rollback no header. Atualizar `docs/03-schema-completo-de-banco-de-dados.md`
e `docs/04-migrations-sql.md` se forem índices da documentação viva.

## 0c — Extração para `packages/lib`

`packages/lib` entrega TS source (`main: ./index.ts`, sem build step) e já tem
`@supabase/supabase-js`. Stores Zustand confirmados puros (zero import de
`react-native`/`expo`/`AsyncStorage`).

Mover (não copiar) — preservando API pública idêntica:

- `apps/mobile-consumer/store/useCartStore.ts` → `packages/lib/src/stores/useCartStore.ts`
- `apps/mobile-consumer/store/useOrderStore.ts` → `packages/lib/src/stores/useOrderStore.ts`
- `apps/mobile-consumer/store/useAuthStore.ts` → `packages/lib/src/stores/useAuthStore.ts`
- `apps/web/lib/dns/tenant-dns.ts` → `packages/lib/src/dns/tenant-dns.ts`

Depois:

- Adicionar `zustand` às `dependencies` de `packages/lib/package.json`.
- Exportar em `packages/lib/index.ts`:
  `export * from './src/stores/useCartStore'` etc. e
  `export * from './src/dns/tenant-dns'`.
- **Shims de re-export** nos caminhos antigos para não tocar no app mobile:
  `apps/mobile-consumer/store/useCartStore.ts` vira
  `export * from '@mallevo/lib'` (ou caminho específico). Idem os outros 2.
- `apps/web/lib/dns/tenant-dns.ts` vira `export * from '@mallevo/lib'` **ou**
  ajustar o import em `apps/web/app/api/stores/provision-domain/route.ts` para
  `@mallevo/lib`. Escolher o que minimiza diff; documentar no resumo.

### 0c.1 — Lógica de entrega/cobertura na lib (D4)

Identificar no `apps/mobile-consumer` onde é decidido "entrega vs retirada" e o
cálculo de `taxa_entrega`/`platform_fee_amount` (ver `checkout.tsx` e
`useCartStore`). Extrair essa regra pura para
`packages/lib/src/delivery/coverage.ts` (funções puras, sem RN), exportar no
index, e fazer mobile-consumer consumir via `@mallevo/lib`. Se a regra estiver
entrelaçada com UI, extrair só a parte pura e deixar TODO documentado no resumo.

## Critérios de aceite do Stage 0

- [ ] Migration aplica e reverte limpa (rollback no header).
- [ ] `anon` consegue `SELECT` nas views `public_catalog_*` (linhas ativas) e
      **não** consegue `SELECT` em `stores`/`products` base.
- [ ] Views não expõem custo/`tenant_id`/campos internos.
- [ ] `orders.origem` existe, default `app`, CHECK ativo, índice criado.
- [ ] `packages/lib` exporta os 3 stores + `tenant-dns` + `delivery/coverage`.
- [ ] `apps/mobile-consumer` e `apps/web` compilam sem mudar comportamento
      (shims no lugar). `pnpm -w typecheck`/build dos apps afetados passa.
- [ ] Nenhuma policy de `orders`/`order_items`/`consumers` foi alterada.

## Fora de escopo deste stage

Qualquer código em `apps/storefront` (ainda não existe). Só backend/migrations
e refactor de extração.
