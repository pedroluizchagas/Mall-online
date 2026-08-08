Fase 8 (Deploy em Produção) — parte de CLI executada em 2026-08-07:
migrations em sync (inclui logística 01-04 + fix do Pix), `dispatch-order` e
`create-pagarme-order` deployadas, pg_cron `despacho-logistica` a cada 30 s,
types regenerados, typecheck limpo nos 6 apps.

Próximo passo: itens manuais do `deploy-checklist.md` — secrets do Pagar.me
(PAGARME_API_KEY, PAGARME_WEBHOOK_SECRET, PAGARME_PLATFORM_RECIPIENT_ID,
WEBHOOK_SECRET), webhooks Pagar.me/Stripe de produção, envs da Vercel,
buckets/Realtime/Auth URLs no painel, e smoke tests e2e (§6).
