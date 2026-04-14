-- ============================================================
-- MIGRATION 015 — Seed dos Planos de Assinatura
--
-- ATENÇÃO: stripe_price_id precisa ser atualizado com os IDs
-- reais criados no painel Stripe antes de ir para produção.
-- ============================================================

INSERT INTO plans (
  nome,
  descricao,
  preco_mensal,
  max_lojas,
  max_produtos,
  max_entregadores,
  tem_estoque,
  tem_relatorios,
  tem_antecipacao,
  stripe_product_id,
  stripe_price_id,
  ativo
) VALUES
  (
    'Starter',
    'Ideal para quem está começando. Uma loja, catálogo básico e gestão de pedidos.',
    4900,
    1,
    30,
    0,
    false,
    false,
    false,
    'prod_placeholder_starter',
    'price_placeholder_starter',
    true
  ),
  (
    'Pro',
    'Para negócios em crescimento. Múltiplos produtos, controle de estoque e relatórios.',
    9900,
    1,
    200,
    3,
    true,
    true,
    false,
    'prod_placeholder_pro',
    'price_placeholder_pro',
    true
  ),
  (
    'Premium',
    'Máxima performance. Produtos ilimitados, entregadores próprios e antecipação de recebíveis.',
    19900,
    3,
    1000,
    10,
    true,
    true,
    true,
    'prod_placeholder_premium',
    'price_placeholder_premium',
    true
  )
ON CONFLICT DO NOTHING;
