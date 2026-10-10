-- Autônomos aparecem para o lojista só quando estão online (decisão de
-- produto de 2026-10-10)
--
-- Até aqui, `couriers_select_lojista` deixava qualquer conta de lojista — e
-- o cadastro de lojista é aberto — listar todos os autônomos aprovados, com
-- nome, telefone, foto e placa, mesmo fora do expediente. Agora o pool de
-- despacho é só quem marcou "online" no app do entregador, que é o que o
-- modal de atribuição já filtrava no cliente.
--
-- Para o histórico não perder o entregador quando ele fica offline, o
-- lojista continua vendo quem foi atribuído a um pedido da loja (pendente,
-- aceita, coletada ou entregue). Oferta recusada (cancelada) não conta.

-- Bypassa a RLS de delivery_assignments, como as funções da migration 007.
CREATE OR REPLACE FUNCTION public.tenant_has_delivery_with_courier(p_courier_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM delivery_assignments da
    WHERE da.courier_id = p_courier_id
      AND da.tenant_id = (SELECT id FROM tenants WHERE user_id = auth.uid() LIMIT 1)
      AND da.status IN ('pendente', 'aceita', 'coletada', 'entregue')
  );
$$;

DROP POLICY IF EXISTS "couriers_select_lojista" ON couriers;

CREATE POLICY "couriers_select_lojista"
  ON couriers FOR SELECT
  TO authenticated
  USING (
    tenant_id = my_tenant_id()
    -- Despacho: autônomo aprovado e online, só para lojista.
    OR (tipo = 'autonomo' AND status = 'aprovado' AND online AND my_tenant_id() IS NOT NULL)
    -- Entregas em curso e histórico dos pedidos da loja.
    OR tenant_has_delivery_with_courier(id)
  );
