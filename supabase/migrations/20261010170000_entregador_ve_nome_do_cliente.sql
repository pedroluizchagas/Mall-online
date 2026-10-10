-- Entregador vê o nome do cliente das próprias entregas (achado de 2026-10-10)
--
-- O app do entregador lê `orders → consumers!inner (nome)` ao iniciar uma
-- entrega aceita (app/(tabs)/index.tsx, iniciarEntregaAtiva) e no detalhe
-- (app/entrega/[id].tsx). Nenhuma policy de `consumers` cobria o
-- entregador: o embed voltava vazio, o `!inner` derrubava a linha inteira e
-- a entrega aceita não abria.
--
-- A policy libera a LINHA do cliente só para o entregador com atribuição
-- aceita, coletada ou entregue num pedido dele — oferta pendente ou recusada
-- não conta. As COLUNAS seguem a migration 20261010150000: nome, telefone e
-- foto; CPF, nascimento e endereços continuam fora (o endereço da entrega
-- vem da cópia em `orders.endereco_entrega`).
--
-- A mesma régua vale no sentido contrário: a 20261010150000 deixava o
-- cliente ver o entregador de qualquer atribuição, inclusive oferta pendente
-- ou recusada. Agora também só aceita, coletada ou entregue.

-- Bypassa a RLS de delivery_assignments e orders, como as funções da 007.
CREATE OR REPLACE FUNCTION public.courier_delivers_to_consumer(p_consumer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM delivery_assignments da
    JOIN orders o ON o.id = da.order_id
    WHERE o.consumer_id = p_consumer_id
      AND da.courier_id = (SELECT id FROM couriers WHERE user_id = auth.uid() LIMIT 1)
      AND da.status IN ('aceita', 'coletada', 'entregue')
  );
$$;

CREATE POLICY "consumers_select_entregador"
  ON consumers FOR SELECT
  TO authenticated
  USING (courier_delivers_to_consumer(id));

-- Usada por `couriers_select_consumidor` (migration 20261010150000).
CREATE OR REPLACE FUNCTION public.consumer_has_assignment_with_courier(p_courier_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM delivery_assignments da
    JOIN orders o ON o.id = da.order_id
    WHERE da.courier_id = p_courier_id
      AND o.consumer_id = (SELECT id FROM consumers WHERE user_id = auth.uid() LIMIT 1)
      AND da.status IN ('aceita', 'coletada', 'entregue')
  );
$$;
