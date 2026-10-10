-- Segurança — dados pessoais só para quem precisa (achados de 2026-10-10,
-- do levantamento feito para a Política de Privacidade)
--
-- Cinco furos, um bloco cada:
--   0. is_admin() lia `user_metadata.role` — campo que o PRÓPRIO usuário
--      edita (`supabase.auth.updateUser({ data: { role: 'admin' } })`).
--      Qualquer conta virava admin no banco e no app admin, que confere o
--      mesmo campo. O papel passa a vir de `app_metadata`, que só o servidor
--      grava.
--   1. Bucket `courier-docs` (fotos de CNH e comprovantes de entrega) com
--      SELECT liberado para `public`: qualquer um listava e baixava.
--   2. `couriers_select_lojista` deixava qualquer usuário logado — cliente
--      inclusive — ler a linha inteira dos autônomos aprovados: CPF, número
--      e foto da CNH, telefone, placa.
--   3. `consumers_select_lojista` entregava ao lojista a linha inteira de
--      quem já comprou dele: CPF, data de nascimento e todos os endereços.
--   4. `get_user_id_by_email` aberta a `anon`: qualquer um descobria se um
--      e-mail tem conta.
--
-- O modelo: a RLS diz QUAIS LINHAS cada um vê; o privilégio de coluna diz
-- QUAIS COLUNAS. CPF/CNH (couriers) e CPF/nascimento/endereços (consumers)
-- deixam de ser legíveis por `anon` e `authenticated` em qualquer linha.
-- Quem precisa deles lê por RPC SECURITY DEFINER: o admin
-- (`admin_documentos_entregadores`) e o próprio cliente
-- (`meu_perfil_consumidor`). Edge functions usam service_role: nada muda.
--
-- ATENÇÃO para as próximas migrations: o SELECT de tabela em `couriers` e
-- `consumers` foi revogado, então coluna nova NÃO fica legível sozinha —
-- precisa de `GRANT SELECT (coluna) ON <tabela> TO anon, authenticated`
-- (se não for dado sensível). E `select('*')` nessas tabelas falha para o
-- cliente: peça as colunas pelo nome.
--
-- ORDEM DO DEPLOY (produção):
--   1. Antes de aplicar, no SQL editor, veja quem se declara admin e promova
--      SÓ as contas legítimas — o bloco 0 recusa aplicar enquanto houver
--      admin por user_metadata e nenhum por app_metadata:
--        select id, email, created_at, last_sign_in_at from auth.users
--         where raw_user_meta_data ->> 'role' = 'admin';
--        update auth.users
--           set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
--                                   || '{"role": "admin"}'::jsonb
--         where email = '<email do admin>';
--      Confira também se sobrou foto de perfil antiga no bucket que vai
--      fechar (deixa de abrir; o cadastro atual usa courier-avatars):
--        select count(*) from couriers where foto_url like '%/courier-docs/%';
--   2. `pnpm db:push`.
--   3. Deploy do admin e do storefront (push na main): leem pelas RPCs novas.
--   4. Update OTA do app do consumidor (perfil pela RPC) e do entregador
--      (cadastro pede as colunas pelo nome). Até lá, nas versões antigas, o
--      perfil do cliente não carrega e o cadastro de entregador falha.
--   5. No app admin, sair e entrar de novo: o JWT precisa trazer o
--      app_metadata.

-- ============================================================
-- 0. ADMIN: papel em app_metadata
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE raw_user_meta_data ->> 'role' = 'admin')
     AND NOT EXISTS (SELECT 1 FROM auth.users WHERE raw_app_meta_data ->> 'role' = 'admin')
  THEN
    RAISE EXCEPTION 'Nenhum admin em app_metadata: promova a conta legítima antes de aplicar (passo 1 do cabeçalho desta migration).';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- ============================================================
-- 1. BUCKET courier-docs: privado
-- ============================================================
UPDATE storage.buckets SET public = false WHERE id = 'courier-docs';

DROP POLICY IF EXISTS "courier_docs_select_publico" ON storage.objects;

-- O entregador lê a própria pasta (o upload com upsert também precisa de
-- SELECT); o admin lê tudo — é ele quem confere a CNH para aprovar.
CREATE POLICY "courier_docs_select_proprio"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'courier-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "courier_docs_select_admin"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'courier-docs' AND is_admin());

-- ============================================================
-- 2. COURIERS: quem vê qual entregador, e sem CPF/CNH
-- ============================================================

-- O cliente vê quem entrega (ou entregou) um pedido dele — nome e telefone
-- na tela do pedido. Bypassa a RLS de delivery_assignments e orders, como
-- as outras funções da migration 007.
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
  );
$$;

DROP POLICY IF EXISTS "couriers_select_lojista" ON couriers;

CREATE POLICY "couriers_select_lojista"
  ON couriers FOR SELECT
  TO authenticated
  USING (
    tenant_id = my_tenant_id()
    -- Despacho: só lojista escolhe entre os autônomos aprovados.
    OR (tipo = 'autonomo' AND status = 'aprovado' AND my_tenant_id() IS NOT NULL)
  );

CREATE POLICY "couriers_select_consumidor"
  ON couriers FOR SELECT
  TO authenticated
  USING (consumer_has_assignment_with_courier(id));

REVOKE SELECT ON couriers FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  v_colunas TEXT;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO v_colunas
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'couriers'
    AND column_name NOT IN ('cpf', 'cnh_numero', 'cnh_foto_url');

  EXECUTE format('GRANT SELECT (%s) ON couriers TO anon, authenticated', v_colunas);
END $$;

-- O admin aprova o cadastro olhando CPF e CNH: lê por aqui, e o banco
-- confere is_admin() — não basta o app dizer que é admin.
CREATE OR REPLACE FUNCTION public.admin_documentos_entregadores(p_ids UUID[])
RETURNS TABLE (id UUID, cpf TEXT, cnh_numero TEXT, cnh_foto_url TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.cpf, c.cnh_numero, c.cnh_foto_url
  FROM couriers c
  WHERE is_admin()
    AND c.id = ANY (p_ids);
$$;

REVOKE ALL ON FUNCTION public.admin_documentos_entregadores(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_documentos_entregadores(UUID[]) TO authenticated;

-- ============================================================
-- 3. CONSUMERS: o lojista segue vendo nome e telefone, e só isso
-- ============================================================
-- `consumers_select_lojista` fica: o painel mostra nome e telefone de quem
-- pediu. O que muda é o que dá para ler dessa linha.
REVOKE SELECT ON consumers FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  v_colunas TEXT;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO v_colunas
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'consumers'
    AND column_name NOT IN ('cpf', 'data_nascimento', 'enderecos');

  EXECUTE format('GRANT SELECT (%s) ON consumers TO anon, authenticated', v_colunas);
END $$;

-- O próprio cliente lê o perfil inteiro (apps/mobile-consumer/lib/perfil.ts,
-- apps/storefront/lib/auth.ts). UPDATE continua direto na tabela.
CREATE OR REPLACE FUNCTION public.meu_perfil_consumidor()
RETURNS TABLE (
  id UUID,
  nome TEXT,
  telefone TEXT,
  foto_url TEXT,
  cpf TEXT,
  data_nascimento DATE,
  enderecos JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.nome, c.telefone, c.foto_url, c.cpf, c.data_nascimento, c.enderecos
  FROM consumers c
  WHERE c.user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.meu_perfil_consumidor() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meu_perfil_consumidor() TO authenticated;

-- ============================================================
-- 4. get_user_id_by_email: só service_role
-- ============================================================
-- SECURITY DEFINER sem REVOKE: qualquer um com a chave anon descobria se um
-- e-mail tem conta (e o id dela). Quem usa é só a edge function
-- onboard-tenant, com service_role.
REVOKE ALL ON FUNCTION public.get_user_id_by_email(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) TO service_role;

-- ============================================================
-- 5. CONFERÊNCIA: a migration falha se algo ficou aberto
-- ============================================================
DO $$
DECLARE
  v_alvo TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'courier-docs' AND public) THEN
    RAISE EXCEPTION 'courier-docs continua público';
  END IF;

  IF has_function_privilege('anon', 'public.get_user_id_by_email(text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.get_user_id_by_email(text)', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'get_user_id_by_email continua aberta';
  END IF;

  FOREACH v_alvo IN ARRAY ARRAY[
    'couriers.cpf', 'couriers.cnh_numero', 'couriers.cnh_foto_url',
    'consumers.cpf', 'consumers.data_nascimento', 'consumers.enderecos'
  ] LOOP
    IF has_column_privilege('anon', 'public.' || split_part(v_alvo, '.', 1), split_part(v_alvo, '.', 2), 'SELECT')
       OR has_column_privilege('authenticated', 'public.' || split_part(v_alvo, '.', 1), split_part(v_alvo, '.', 2), 'SELECT')
    THEN
      RAISE EXCEPTION '% continua legível pela API', v_alvo;
    END IF;
  END LOOP;

  IF NOT has_column_privilege('authenticated', 'public.couriers', 'nome', 'SELECT')
     OR NOT has_column_privilege('authenticated', 'public.consumers', 'telefone', 'SELECT')
  THEN
    RAISE EXCEPTION 'nome/telefone deveriam continuar legíveis';
  END IF;
END $$;
