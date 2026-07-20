-- ============================================================
-- PARTNER APP · Stage 0 (3/4) — Limite de posts por plano
-- Referência: docs/partner-app/02-stage-0-backend.md §3
--
-- Espelha o padrão de verificar_limite_lojas()/verificar_limite_produtos()
-- (migration_001). plans.max_posts NULL = ilimitado -> trigger é no-op.
-- MVP: seed permanece NULL em todos os planos (decisão registrada em
-- docs/partner-app/13-workflow-tech-lead.md); o gancho fica pronto e a
-- regra vive só no banco — o Partner App nunca checa limite no cliente.
-- Idempotente.
-- ============================================================

ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_posts INTEGER;

COMMENT ON COLUMN plans.max_posts IS
  'Teto de posts do Explorar (store_posts com status <> removed) por tenant. NULL = ilimitado.';

CREATE OR REPLACE FUNCTION verificar_limite_posts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  max_posts_plano INTEGER;
  posts_atuais INTEGER;
BEGIN
  SELECT p.max_posts INTO max_posts_plano
  FROM plans p
  JOIN tenant_subscriptions ts ON ts.plan_id = p.id
  WHERE ts.tenant_id = NEW.tenant_id
  LIMIT 1;

  -- Sem assinatura localizada ou sem teto definido: no-op (ilimitado).
  -- Diferente de lojas/produtos, o post não bloqueia por ausência de
  -- assinatura — o gate de publicação do app já cobre esse caso.
  IF max_posts_plano IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO posts_atuais
  FROM store_posts
  WHERE tenant_id = NEW.tenant_id AND status <> 'removed';

  IF posts_atuais >= max_posts_plano THEN
    RAISE EXCEPTION 'Limite de posts do plano atingido (máximo: %).', max_posts_plano;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_limite_posts ON store_posts;
CREATE TRIGGER trigger_limite_posts
  BEFORE INSERT ON store_posts
  FOR EACH ROW
  EXECUTE FUNCTION verificar_limite_posts();
