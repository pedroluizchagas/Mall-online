-- ============================================================================
-- SEED LOCAL (supabase db reset) — NUNCA rodar em produção.
--
-- Ambiente de QA da convergência web · storefront · mobile
-- (docs/dev/plano-convergencia-web-storefront-mobile.md, Fase 4 "seed demo"):
-- um lojista de teste com uma pizzaria vestida no arquétipo `slice` (vitrine
-- Forno), catálogo com fotos, metadata de vitrine (galeria, recorte, ficha,
-- unidade) e conteúdo editorial. É o que o dashboard (apps/web), o storefront
-- e o consumer precisam para exercitar as vitrines fora do mock.
--
-- Login do dashboard: qa@mallevo.local / mallevo-qa-2026
-- Loja no storefront: forno-demo.mallevo.localhost
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Categorias globais (nicho) — `categories` com tenant_id NULL + slug único
-- (migration 014). Em produção elas existem; localmente nascem aqui.
-- Slugs = CATEGORIA_SLUG_TO_TEMPLATE em packages/lib/src/templates/mapping.ts.
-- ---------------------------------------------------------------------------
INSERT INTO categories (id, tenant_id, store_id, nome, slug, ordem, icone) VALUES
  ('a0000000-0000-4000-8000-000000000001', NULL, NULL, 'Alimentos e bebidas',      'alimentos-bebidas',        1,  '🍽️'),
  ('a0000000-0000-4000-8000-000000000002', NULL, NULL, 'Vestuário e calçados',     'vestuario-calcados',       2,  '👗'),
  ('a0000000-0000-4000-8000-000000000003', NULL, NULL, 'Acessórios e joias',       'acessorios-joias',         3,  '💍'),
  ('a0000000-0000-4000-8000-000000000004', NULL, NULL, 'Farmácia e medicamentos',  'farmacia-medicamentos',    4,  '💊'),
  ('a0000000-0000-4000-8000-000000000005', NULL, NULL, 'Beleza e cosméticos',      'beleza-cosmeticos',        5,  '💄'),
  ('a0000000-0000-4000-8000-000000000006', NULL, NULL, 'Salões e estética',        'saloes-estetica',          6,  '💇'),
  ('a0000000-0000-4000-8000-000000000007', NULL, NULL, 'Saúde e bem-estar',        'saude-bem-estar',          7,  '🧘'),
  ('a0000000-0000-4000-8000-000000000008', NULL, NULL, 'Pet shop',                 'pet-shop',                 8,  '🐾'),
  ('a0000000-0000-4000-8000-000000000009', NULL, NULL, 'Veterinária',              'veterinaria',              9,  '🩺'),
  ('a0000000-0000-4000-8000-000000000010', NULL, NULL, 'Eletrônicos e tecnologia', 'eletronicos-tecnologia',   10, '📱'),
  ('a0000000-0000-4000-8000-000000000011', NULL, NULL, 'Casa e decoração',         'casa-decoracao',           11, '🛋️'),
  ('a0000000-0000-4000-8000-000000000012', NULL, NULL, 'Construção e ferramentas', 'construcao-ferramentas',   12, '🔧'),
  ('a0000000-0000-4000-8000-000000000013', NULL, NULL, 'Papelaria e livraria',     'papelaria-livraria',       13, '📚'),
  ('a0000000-0000-4000-8000-000000000014', NULL, NULL, 'Brinquedos e presentes',   'brinquedos-presentes',     14, '🧸'),
  ('a0000000-0000-4000-8000-000000000015', NULL, NULL, 'Floricultura e plantas',   'floricultura-plantas',     15, '🌿'),
  ('a0000000-0000-4000-8000-000000000016', NULL, NULL, 'Automotivo',               'automotivo',               16, '🚗'),
  ('a0000000-0000-4000-8000-000000000017', NULL, NULL, 'Mercado e conveniência',   'mercado-conveniencia',     17, '🛒'),
  ('a0000000-0000-4000-8000-000000000018', NULL, NULL, 'Oficinas e manutenção',    'oficinas-manutencao',      18, '🛠️'),
  ('a0000000-0000-4000-8000-000000000019', NULL, NULL, 'Aulas e cursos',           'aulas-cursos',             19, '🎓'),
  ('a0000000-0000-4000-8000-000000000020', NULL, NULL, 'Outros',                   'outros',                   20, '🏬')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Usuário de QA (auth) — senha via pgcrypto, e-mail já confirmado.
-- ---------------------------------------------------------------------------
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'b0000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated',
  'qa@mallevo.local',
  extensions.crypt('mallevo-qa-2026', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"tenant","nome":"QA Mallevo"}',
  now(), now(), '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) VALUES (
  'b0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001',
  '{"sub":"b0000000-0000-4000-8000-000000000001","email":"qa@mallevo.local","email_verified":true}',
  'email', now(), now(), now()
) ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Plano + tenant + assinatura
-- ---------------------------------------------------------------------------
INSERT INTO plans (id, nome, descricao, preco_mensal, max_lojas, max_produtos, tem_estoque, tem_relatorios)
VALUES ('c0000000-0000-4000-8000-000000000001', 'Profissional (QA)', 'Plano de QA local', 9900, 1, 500, true, true)
ON CONFLICT (id) DO NOTHING;

-- tutorial_template_visto = true: o lojista de QA já viu o tour do dashboard
-- (senão o modal de boas-vindas cobre a tela e bloqueia a interação).
INSERT INTO tenants (id, user_id, nome_responsavel, cpf_cnpj, telefone, email, slug, tutorial_template_visto)
VALUES ('d0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
        'QA Mallevo', '12345678000199', '37999990000', 'qa@mallevo.local', 'qa-mallevo', true)
ON CONFLICT (id) DO NOTHING;

-- Assinatura só com as colunas garantidas pela migration 001; colunas de
-- billing posteriores ficam no default (a Fase 0 do plano não depende delas).
INSERT INTO tenant_subscriptions (id, tenant_id, plan_id)
VALUES ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Loja: pizzaria vestida no arquétipo `slice` → vitrine Forno no app e no web
-- ---------------------------------------------------------------------------
INSERT INTO stores (
  id, tenant_id, nome, descricao, slug, logo_url, banner_url, telefone,
  horarios, taxa_entrega, tempo_entrega, raio_entrega_km,
  aceita_pix, aceita_cartao_online, ativo, categoria_id, theme, conteudo
) VALUES (
  'f0000000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000001',
  'Forno Demo',
  'Pizza de fermentação longa assada em forno a lenha. Massa leve, borda alta e ingredientes da região.',
  'forno-demo',
  'https://picsum.photos/seed/forno-logo/240/240',
  'https://picsum.photos/seed/forno-banner/1200/900',
  '37999990001',
  '{"seg":{"abre":"18:00","fecha":"23:30"},"ter":{"abre":"18:00","fecha":"23:30"},"qua":{"abre":"18:00","fecha":"23:30"},"qui":{"abre":"18:00","fecha":"23:30"},"sex":{"abre":"18:00","fecha":"00:30"},"sab":{"abre":"18:00","fecha":"00:30"},"dom":{"abre":"18:00","fecha":"23:00"}}'::jsonb,
  800, 35, 8.0,
  true, true, true,
  'a0000000-0000-4000-8000-000000000001',
  '{"v":2,"preset":"slice"}'::jsonb,
  '{"v":1,"campanha":{"eyebrow":"Forno a lenha","titulo":"Pizza em dobro às terças","subtitulo":"Duas pizzas grandes pelo preço de uma, só no salão e no delivery.","cta":"Ver cardápio"},"manifesto":"Uma experiência de pizza inesquecível. Fermentamos a massa por 48 horas e assamos em forno a lenha a 450 graus.","destaques":["10000000-0000-4000-8000-000000000001","10000000-0000-4000-8000-000000000002"],"galeria_casa":["https://picsum.photos/seed/forno-casa-1/900/700","https://picsum.photos/seed/forno-casa-2/900/700"]}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Seções do cardápio (categories da loja)
INSERT INTO categories (id, tenant_id, store_id, nome, ordem) VALUES
  ('a1000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'Pizzas',   1),
  ('a1000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'Entradas', 2),
  ('a1000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'Bebidas',  3)
ON CONFLICT (id) DO NOTHING;

-- Produtos — metadata segue o metadataProdutoSchema (@mallevo/lib):
-- galeria, recorte, especificacoes, unidade.
INSERT INTO products (id, store_id, tenant_id, category_id, nome, descricao, preco, preco_promocional, foto_url, ordem, metadata) VALUES
  ('10000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001',
   'Margherita', 'Molho de tomate, muçarela fresca, manjericão e azeite.', 5900, NULL,
   'https://picsum.photos/seed/pizza-margherita/800/800', 1,
   '{"galeria":["https://picsum.photos/seed/pizza-margherita-2/800/800","https://picsum.photos/seed/pizza-margherita-3/800/800"],"recorte":"https://picsum.photos/seed/pizza-margherita-recorte/700/700.png","especificacoes":[["Tamanho","35 cm · 8 fatias"],["Massa","Fermentação 48h"]],"tempo_preparo_min":25,"serve_pessoas":2,"tags":["vegetariana"]}'::jsonb),
  ('10000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001',
   'Calabresa da casa', 'Calabresa artesanal, cebola roxa e orégano.', 6400, 5490,
   'https://picsum.photos/seed/pizza-calabresa/800/800', 2,
   '{"galeria":["https://picsum.photos/seed/pizza-calabresa-2/800/800"],"recorte":"https://picsum.photos/seed/pizza-calabresa-recorte/700/700.png","tempo_preparo_min":25,"serve_pessoas":2}'::jsonb),
  ('10000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001',
   'Quatro queijos', 'Muçarela, gorgonzola, parmesão e provolone.', 6900, NULL,
   'https://picsum.photos/seed/pizza-queijos/800/800', 3,
   '{"tempo_preparo_min":25,"serve_pessoas":2}'::jsonb),
  ('10000000-0000-4000-8000-000000000004', 'f0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002',
   'Bruschetta', 'Pão de fermentação natural, tomate confit e manjericão.', 2400, NULL,
   'https://picsum.photos/seed/bruschetta-demo/800/800', 1,
   '{"tempo_preparo_min":10,"serve_pessoas":2}'::jsonb),
  ('10000000-0000-4000-8000-000000000005', 'f0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000003',
   'Limonada siciliana', 'Limão siciliano, hortelã e água com gás. 500 ml.', 1400, NULL,
   'https://picsum.photos/seed/limonada-demo/800/800', 1,
   '{"unidade":"un"}'::jsonb),
  ('10000000-0000-4000-8000-000000000006', 'f0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000003',
   'Vinho da casa', 'Tinto seco, taça de 150 ml.', 2200, 1800,
   'https://picsum.photos/seed/vinho-demo/800/800', 2,
   '{"unidade":"un"}'::jsonb)
ON CONFLICT (id) DO NOTHING;
