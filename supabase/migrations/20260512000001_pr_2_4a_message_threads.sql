-- ============================================================
-- PR 2.4a — Threads e mensagens (chat lojista <-> consumer)
-- Referência: docs/dashboard-redesign/04-novas-paginas.md §4.4
-- Helpers RLS my_tenant_id() / my_consumer_id() vêm de migration_006.
--
-- Modelo:
-- - message_threads: 1 thread por par (tenant, consumer) ou por order.
-- - messages: append-only; trigger bump_thread_on_message atualiza
--   thread.ultima_em e os contadores de não-lidas.
-- - origem: 'cliente' (consumer iniciou), 'plataforma' (sistema),
--   'broadcast' (lojista enviou em massa — usado no PR 2.4b).
-- - autor_tipo: 'lojista', 'consumer', 'sistema'.
-- ============================================================

CREATE TABLE IF NOT EXISTS message_threads (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  consumer_id           UUID REFERENCES consumers(id) ON DELETE SET NULL,
  order_id              UUID REFERENCES orders(id) ON DELETE SET NULL,
  origem                TEXT NOT NULL CHECK (origem IN ('cliente','plataforma','broadcast')),
  ultima_em             TIMESTAMPTZ NOT NULL DEFAULT now(),
  nao_lidas_lojista     INT NOT NULL DEFAULT 0,
  nao_lidas_consumer    INT NOT NULL DEFAULT 0,
  arquivada             BOOLEAN NOT NULL DEFAULT false,
  criada_em             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_threads_tenant
  ON message_threads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_consumer
  ON message_threads(consumer_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_ultima
  ON message_threads(tenant_id, ultima_em DESC) WHERE arquivada = false;
CREATE INDEX IF NOT EXISTS idx_message_threads_nao_lidas
  ON message_threads(tenant_id) WHERE nao_lidas_lojista > 0;

CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  autor_tipo  TEXT NOT NULL CHECK (autor_tipo IN ('lojista','consumer','sistema')),
  autor_id    UUID,
  corpo       TEXT NOT NULL CHECK (length(corpo) BETWEEN 1 AND 4000),
  metadados   JSONB,
  criada_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_thread
  ON messages(thread_id, criada_em DESC);

-- ------------------------------------------------------------
-- Trigger: ao inserir mensagem, atualizar thread.ultima_em e
-- contadores de não-lidas. Mensagem do lojista incrementa
-- nao_lidas_consumer; mensagem do consumer/sistema incrementa
-- nao_lidas_lojista. 'sistema' soma nos dois lados (notificações).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION bump_thread_on_message() RETURNS trigger AS $$
BEGIN
  UPDATE message_threads
     SET ultima_em = NEW.criada_em,
         nao_lidas_lojista = CASE
           WHEN NEW.autor_tipo IN ('consumer','sistema') THEN nao_lidas_lojista + 1
           ELSE nao_lidas_lojista
         END,
         nao_lidas_consumer = CASE
           WHEN NEW.autor_tipo IN ('lojista','sistema') THEN nao_lidas_consumer + 1
           ELSE nao_lidas_consumer
         END
   WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bump_thread_on_message ON messages;
CREATE TRIGGER trg_bump_thread_on_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION bump_thread_on_message();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages        ENABLE ROW LEVEL SECURITY;

-- THREADS: lojista lê/atualiza/cria do próprio tenant.
CREATE POLICY tenant_le_threads ON message_threads
  FOR SELECT TO authenticated
  USING (tenant_id = my_tenant_id());

CREATE POLICY tenant_atualiza_threads ON message_threads
  FOR UPDATE TO authenticated
  USING (tenant_id = my_tenant_id())
  WITH CHECK (tenant_id = my_tenant_id());

CREATE POLICY tenant_cria_thread ON message_threads
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = my_tenant_id());

-- THREADS: consumer lê as próprias.
CREATE POLICY consumer_le_threads ON message_threads
  FOR SELECT TO authenticated
  USING (consumer_id = my_consumer_id());

-- MESSAGES: leitura pelo lojista do tenant dono da thread.
CREATE POLICY tenant_le_mensagens ON messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM message_threads t
            WHERE t.id = thread_id AND t.tenant_id = my_tenant_id())
  );

-- MESSAGES: leitura pelo consumer dono da thread.
CREATE POLICY consumer_le_mensagens ON messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM message_threads t
            WHERE t.id = thread_id AND t.consumer_id = my_consumer_id())
  );

-- INSERT policies de mensagens ficam para o PR 2.4b (junto com o composer).
-- Por enquanto, mensagens só podem ser inseridas via service role (seeds,
-- backend admin); o trigger bump_thread_on_message não insere — apenas UPDATE.

-- ============================================================
-- REALTIME — publication criada por migration_010.
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE message_threads;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;
