# mobile-courier — Configurações manuais no Supabase Dashboard

## Storage — Bucket courier-docs
Criar bucket `courier-docs` como **privado** no Supabase Dashboard:
  Storage → New Bucket → nome: `courier-docs` → desmarcar "Public bucket"

Executar as políticas RLS do arquivo `docs/19-entregador-modelo-auth-e-cadastro.md`
(seção "BUCKET SUPABASE STORAGE PARA DOCUMENTOS").

## Authentication — URL de callback do app entregador
  Authentication → URL Configuration
  → Adicionar: mallora-courier://auth/callback

---

#Realtime

Habilitar Realtime para a tabela orders no Supabase Dashboard
(Database → Replication → orders) antes de testar.

Habilite o Realtime no Supabase Dashboard:

Database > Replication — ativar orders e courier_locations
Project Settings > Realtime — verificar que está habilitado.





Configurar no Supabase Dashboard:
  Authentication → URL Configuration
  → Adicionar: mallora-consumer://auth/callback

(Fizemos porém, óbvio isso em modo de desenvolvimento, adicionar a de produção)





Criar bucket courier-docs como privado no Supabase Storage. (Já foi Criado)
Configurar URL de callback mallora-courier://auth/callback (modo dev criado).




Checar: Habilitar Realtime para delivery_assignments e courier_locations.





Adicionar EXPO_PUBLIC_PROJECT_ID no .env.local de cada app mobile (encontrado em expo.dev → projeto → ID).





adicionar EXPO_PUBLIC_PROJECT_ID no .env de cada app mobile com o ID do projeto no Expo.