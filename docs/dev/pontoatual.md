Já rodamos o PROMPT — Fase 5: Push Notifications, agora abrir o último chat e vamos fazer: 

Configurar os 5 webhooks no Supabase Dashboard:
  orders INSERT, orders UPDATE,
  delivery_assignments INSERT, delivery_assignments UPDATE,
  payouts UPDATE

Configurar WEBHOOK_SECRET nos secrets da Edge Function.




Próximos passos manuais (não automatizáveis via código)
1. Instalar dependências:


pnpm install
2. Configurar variável de ambiente:


supabase secrets set WEBHOOK_SECRET=$(openssl rand -hex 32)
3. Deploy da Edge Function:


supabase functions deploy notify-order-update
4. Criar os 5 webhooks no Supabase Dashboard → Database → Webhooks:

Nome	Tabela	Evento	Header
notify-new-order	orders	INSERT	x-webhook-secret: <valor>
notify-order-status	orders	UPDATE	x-webhook-secret: <valor>
notify-new-assignment	delivery_assignments	INSERT	x-webhook-secret: <valor>
notify-assignment-status	delivery_assignments	UPDATE	x-webhook-secret: <valor>
notify-payout	payouts	UPDATE	x-webhook-secret: <valor>
5. Adicionar EXPO_PUBLIC_PROJECT_ID no .env.local de cada app mobile (encontrado em expo.dev → projeto → ID).