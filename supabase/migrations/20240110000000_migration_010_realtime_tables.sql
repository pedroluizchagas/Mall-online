-- Habilitar Realtime para delivery_assignments e courier_locations
-- Necessário para o app do entregador receber pedidos em tempo real
-- e para consumidor/lojista rastrear a posição do entregador

ALTER PUBLICATION supabase_realtime ADD TABLE delivery_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE courier_locations;
