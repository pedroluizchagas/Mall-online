-- ============================================================
-- SAGUÃO — destaques por loja em UMA chamada (A-12)
-- ============================================================
-- PROBLEMA: `carregarDestaques` (apps/storefront/lib/saguao.ts) pedia
-- `store_id IN (…200 lojas)` ordenado GLOBALMENTE e cortava em
-- `store_ids.length * 12`. O corte é global, então uma loja com `ordem`
-- alta podia ficar sem nenhum destaque enquanto outra trazia dezenas —
-- e o Postgres devolvia ~2.400 linhas para exibir 3 por fachada.
--
-- FIX: janela por loja no banco. `row_number()` particionado por
-- `store_id` na mesma ordem que a fachada usa (`ordem`, depois `nome`)
-- e corte em `n` por partição. Devolve no máximo `cardinality(store_ids)
-- * n` linhas.
--
-- Lê `public_catalog_products` (view com `security_invoker = false`, o
-- par definer+grant da migration 20260714120000), então a função é
-- INVOKER: quem chama precisa apenas do GRANT SELECT na view, que anon
-- já tem. Nenhuma tabela base é tocada.
--
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS public.destaques_por_loja(uuid[], int);
-- ============================================================

CREATE OR REPLACE FUNCTION public.destaques_por_loja(
  store_ids uuid[],
  n int DEFAULT 3
)
RETURNS TABLE (
  id                uuid,
  store_id          uuid,
  nome              text,
  preco             integer,
  preco_promocional integer,
  foto_url          text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT q.id, q.store_id, q.nome, q.preco, q.preco_promocional, q.foto_url
  FROM (
    SELECT
      p.id,
      p.store_id,
      p.nome,
      p.preco,
      p.preco_promocional,
      p.foto_url,
      row_number() OVER (
        PARTITION BY p.store_id
        ORDER BY p.ordem NULLS LAST, p.nome
      ) AS posicao
    FROM public.public_catalog_products p
    WHERE p.store_id = ANY (destaques_por_loja.store_ids)
  ) q
  WHERE q.posicao <= GREATEST(COALESCE(destaques_por_loja.n, 3), 0)
  ORDER BY q.store_id, q.posicao;
$$;

COMMENT ON FUNCTION public.destaques_por_loja(uuid[], int) IS
  'Saguão (apex): os N primeiros produtos disponíveis de cada loja pedida, por ordem/nome. Substitui o corte global de public_catalog_products. Ver docs/dev/plano-convergencia-web-storefront-mobile.md A-12.';

-- Anon é quem lê o saguão (D2); authenticated também, pelo mesmo caminho.
GRANT EXECUTE ON FUNCTION public.destaques_por_loja(uuid[], int) TO anon, authenticated;
