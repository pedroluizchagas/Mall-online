-- Função auxiliar para edge functions recuperarem o UUID de um usuário auth
-- pelo e-mail, necessário para tratar usuários órfãos (auth criado, tenant não).
-- SECURITY DEFINER permite acesso ao schema auth sem expô-lo via PostgREST.
CREATE OR REPLACE FUNCTION get_user_id_by_email(p_email TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM auth.users WHERE email = p_email LIMIT 1;
$$;
