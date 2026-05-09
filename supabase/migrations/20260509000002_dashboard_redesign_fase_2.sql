-- ============================================================
-- MIGRATION — Dashboard redesign Fase 2
-- Tabelas: message_threads, messages, store_reviews,
--          support_tickets, courier_invites
-- Referência: docs/dashboard-redesign/04-novas-paginas.md
-- ============================================================

-- ------------------------------------------------------------
-- 1. MENSAGENS (consumer ↔ lojista, plataforma → lojista, broadcast)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS message_threads (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  consumer_id         UUID REFERENCES consumers(id) ON DELETE SET NULL,
  order_id            UUID REFERENCES orders(id) ON DELETE SET NULL,
  origem              TEXT NOT NULL CHECK (origem IN ('cliente','plataforma','broadcast')),
  ultima_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
  nao_lidas_lojista   INT NOT NULL DEFAULT 0,
  nao_lidas_consumer  INT NOT NULL DEFAULT 0,
  arquivada           BOOLEAN NOT NULL DEFAULT false,
  criada_em           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_threads_tenant   ON message_threads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_consumer ON message_threads(consumer_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_order    ON message_threads(order_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_ultima
  ON message_threads(tenant_id, ultima_em DESC)
  WHERE arquivada = false;

CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  autor_tipo  TEXT NOT NULL CHECK (autor_tipo IN ('lojista','consumer','sistema')),
  autor_id    UUID,
  corpo       TEXT NOT NULL CHECK (length(corpo) > 0 AND length(corpo) <= 4000),
  metadados   JSONB,
  criada_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id, criada_em DESC);

-- Trigger: ao inserir mensagem, atualiza ultima_em e contadores da thread
CREATE OR REPLACE FUNCTION bump_thread_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE message_threads
     SET ultima_em = NEW.criada_em,
         nao_lidas_lojista = CASE
           WHEN NEW.autor_tipo IN ('consumer','sistema')
             THEN nao_lidas_lojista + 1
           ELSE nao_lidas_lojista
         END,
         nao_lidas_consumer = CASE
           WHEN NEW.autor_tipo IN ('lojista','sistema')
             THEN nao_lidas_consumer + 1
           ELSE nao_lidas_consumer
         END
   WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_thread_on_message ON messages;
CREATE TRIGGER trg_bump_thread_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION bump_thread_on_message();

-- ------------------------------------------------------------
-- 2. AVALIAÇÕES (loja + entregador, 1 por pedido)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS store_reviews (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id            UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  consumer_id         UUID NOT NULL REFERENCES consumers(id) ON DELETE CASCADE,
  estrelas_loja       INT CHECK (estrelas_loja BETWEEN 1 AND 5),
  estrelas_entrega    INT CHECK (estrelas_entrega BETWEEN 1 AND 5),
  comentario          TEXT CHECK (length(comentario) <= 2000),
  resposta_lojista    TEXT CHECK (length(resposta_lojista) <= 2000),
  respondida_em       TIMESTAMPTZ,
  sinalizada          BOOLEAN NOT NULL DEFAULT false,
  motivo_sinalizacao  TEXT,
  criada_em           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_reviews_tenant
  ON store_reviews(tenant_id, criada_em DESC);
CREATE INDEX IF NOT EXISTS idx_store_reviews_estrelas
  ON store_reviews(tenant_id, estrelas_loja);
CREATE INDEX IF NOT EXISTS idx_store_reviews_sem_resposta
  ON store_reviews(tenant_id)
  WHERE respondida_em IS NULL;

-- ------------------------------------------------------------
-- 3. SUPORTE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_tickets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  autor_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assunto       TEXT NOT NULL CHECK (length(assunto) BETWEEN 3 AND 200),
  mensagem      TEXT NOT NULL CHECK (length(mensagem) BETWEEN 10 AND 4000),
  prioridade    TEXT NOT NULL DEFAULT 'normal'
                CHECK (prioridade IN ('baixa','normal','alta','critica')),
  status        TEXT NOT NULL DEFAULT 'aberto'
                CHECK (status IN ('aberto','em_andamento','resolvido','fechado')),
  criada_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizada_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant
  ON support_tickets(tenant_id, criada_em DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status
  ON support_tickets(status, prioridade);

-- ------------------------------------------------------------
-- 4. CONVITES DE ENTREGADOR
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courier_invites (
  token                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome                  TEXT NOT NULL CHECK (length(nome) BETWEEN 2 AND 120),
  telefone              TEXT NOT NULL,
  email                 TEXT,
  expira_em             TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  usado_em              TIMESTAMPTZ,
  usado_por_courier_id  UUID REFERENCES couriers(id),
  criada_em             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_courier_invites_tenant
  ON courier_invites(tenant_id, criada_em DESC);
CREATE INDEX IF NOT EXISTS idx_courier_invites_telefone
  ON courier_invites(tenant_id, telefone);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE message_threads  ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_reviews    ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_invites  ENABLE ROW LEVEL SECURITY;

-- message_threads ---------------------------------------------
CREATE POLICY "tenant_le_threads" ON message_threads
  FOR SELECT USING (tenant_id = my_tenant_id());

CREATE POLICY "tenant_atualiza_threads" ON message_threads
  FOR UPDATE USING (tenant_id = my_tenant_id())
  WITH CHECK (tenant_id = my_tenant_id());

CREATE POLICY "tenant_cria_thread_broadcast" ON message_threads
  FOR INSERT WITH CHECK (
    tenant_id = my_tenant_id() AND origem = 'broadcast'
  );

CREATE POLICY "consumer_le_threads" ON message_threads
  FOR SELECT USING (consumer_id = my_consumer_id());

-- messages ----------------------------------------------------
CREATE POLICY "tenant_le_mensagens" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM message_threads t
      WHERE t.id = thread_id AND t.tenant_id = my_tenant_id()
    )
  );

CREATE POLICY "tenant_envia_mensagem" ON messages
  FOR INSERT WITH CHECK (
    autor_tipo = 'lojista'
    AND EXISTS (
      SELECT 1 FROM message_threads t
      WHERE t.id = thread_id AND t.tenant_id = my_tenant_id()
    )
  );

CREATE POLICY "consumer_le_mensagens" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM message_threads t
      WHERE t.id = thread_id AND t.consumer_id = my_consumer_id()
    )
  );

CREATE POLICY "consumer_envia_mensagem" ON messages
  FOR INSERT WITH CHECK (
    autor_tipo = 'consumer'
    AND EXISTS (
      SELECT 1 FROM message_threads t
      WHERE t.id = thread_id AND t.consumer_id = my_consumer_id()
    )
  );

-- store_reviews -----------------------------------------------
CREATE POLICY "tenant_le_avaliacoes" ON store_reviews
  FOR SELECT USING (tenant_id = my_tenant_id());

CREATE POLICY "tenant_responde_avaliacao" ON store_reviews
  FOR UPDATE USING (tenant_id = my_tenant_id())
  WITH CHECK (tenant_id = my_tenant_id());

CREATE POLICY "consumer_cria_avaliacao" ON store_reviews
  FOR INSERT WITH CHECK (consumer_id = my_consumer_id());

CREATE POLICY "consumer_le_propria_avaliacao" ON store_reviews
  FOR SELECT USING (consumer_id = my_consumer_id());

-- support_tickets ---------------------------------------------
CREATE POLICY "tenant_le_tickets" ON support_tickets
  FOR SELECT USING (tenant_id = my_tenant_id());

CREATE POLICY "autor_cria_ticket" ON support_tickets
  FOR INSERT WITH CHECK (
    tenant_id = my_tenant_id() AND autor_id = auth.uid()
  );

CREATE POLICY "autor_atualiza_ticket" ON support_tickets
  FOR UPDATE USING (autor_id = auth.uid())
  WITH CHECK (autor_id = auth.uid());

-- courier_invites ---------------------------------------------
CREATE POLICY "tenant_le_convites" ON courier_invites
  FOR SELECT USING (tenant_id = my_tenant_id());

CREATE POLICY "tenant_cria_convite" ON courier_invites
  FOR INSERT WITH CHECK (tenant_id = my_tenant_id());

CREATE POLICY "tenant_deleta_convite" ON courier_invites
  FOR DELETE USING (tenant_id = my_tenant_id());

-- Convidado (sem auth) lê convite pelo token: a segurança é a
-- aleatoriedade do uuid (token equivale a senha)
CREATE POLICY "publico_le_convite_por_token" ON courier_invites
  FOR SELECT USING (true);

-- ============================================================
-- REALTIME
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE message_threads;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE store_reviews;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
