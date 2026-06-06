-- ============================================================
-- REALTIME · adiciona `orders` à publication supabase_realtime
-- Referência: docs/dev/correction-plan.md (Fase 5 — pré-deploy)
--
-- Os apps assinam `orders` via Realtime para: acompanhamento de pedido
-- (storefront /pedido/[id] e mobile-consumer), confirmação de Pix
-- (payment_status) e painel de pedidos do dashboard. A tabela NÃO estava
-- na publication (só delivery_assignments/courier_locations/messages/
-- message_threads), então esses UPDATEs não chegavam ao cliente. Antes
-- dependia de passo manual no Dashboard (docs/dev/pendente.md); aqui vira
-- reproduzível. Idempotente.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'orders'
     )
  THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  END IF;
END $$;
