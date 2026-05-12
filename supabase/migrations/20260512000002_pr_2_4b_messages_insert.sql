-- ============================================================
-- PR 2.4b — INSERT policies em messages.
-- O trigger bump_thread_on_message (criado em 2.4a) atualiza
-- thread.ultima_em e contadores automaticamente.
-- ============================================================

-- Lojista envia mensagem em qualquer thread do próprio tenant.
CREATE POLICY tenant_envia_mensagem ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    autor_tipo = 'lojista'
    AND EXISTS (
      SELECT 1 FROM message_threads t
      WHERE t.id = thread_id AND t.tenant_id = my_tenant_id()
    )
  );

-- Consumer envia mensagem em qualquer thread própria.
CREATE POLICY consumer_envia_mensagem ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    autor_tipo = 'consumer'
    AND EXISTS (
      SELECT 1 FROM message_threads t
      WHERE t.id = thread_id AND t.consumer_id = my_consumer_id()
    )
  );
