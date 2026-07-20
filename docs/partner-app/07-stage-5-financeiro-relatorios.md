# Stage 5 — Financeiro e Relatórios

> O lojista acompanha faturamento, repasses e assinatura do celular, e pede
> antecipação quando precisa de caixa. Depende dos Stages 1–2 (e do 3 para
> números de pedidos coerentes).

## Fonte da verdade das regras

[`apps/web/lib/actions/financeiro.ts`](../../apps/web/lib/actions/financeiro.ts)
e `assinatura.ts` (queries/KPIs), Edge Functions `request-advance` e
`create-subscription` (operações), tabela `payouts` e docs `13`/`30` (modelo
Pagar.me). **Toda operação financeira passa por Edge Function existente** —
o app nunca fala com Pagar.me/Stripe diretamente nem calcula repasse no
cliente.

## Financeiro (`financeiro.tsx`)

- **KPIs**: faturamento bruto · líquido · ticket médio · total de pedidos,
  com seletor de período (hoje / 7d / mês) — mesmas agregações do Dashboard.
- **Repasses**: saldo a receber, próximo repasse, histórico de `payouts`
  (status pendente/processado/falhou, `pagarme_transfer_id`).
- **Antecipação**: botão "Antecipar recebimento" → bottom sheet com o cálculo
  de desconto exibido pelo Dashboard (nº pedidos × R$0,75) → confirma →
  `supabase.functions.invoke('request-advance')`. Feedback de sucesso/erro
  idêntico ao web.
- Gráfico temporal de faturamento: versão compacta (sparkline/barras por dia)
  usando os mesmos dados do gráfico web.

## Relatórios (`relatorios.tsx`)

O Dashboard tem 5 abas (Visão geral, Produtos, Pedidos, Clientes, Bairros).
No app, **mesmos dados, forma compacta**: seletor de período + seções
roláveis (top produtos, pedidos por dia, clientes recorrentes, bairros que
mais pedem). Reusar as queries de
[`apps/web/app/(dashboard)/relatorios/_lib`](../../apps/web/app/(dashboard)/relatorios)
— se estiverem acopladas ao server, extrair o miolo para `packages/lib` (ou
RPC) e fazer os dois consumirem, nunca duplicar a agregação.

Exportações/detalhamentos densos (tabelas grandes, CSV) ficam web-only com
CTA — decisão `01` §3.

## Assinatura (em `minha-conta.tsx`, Stage 6 — regras definidas aqui)

- Exibir: plano atual, status (`billing_status`), próxima cobrança, histórico
  resumido de faturas.
- Gerenciar (trocar cartão, cancelar, upgrade): abre o **Stripe Customer
  Portal no browser** (`expo-web-browser`) via o mesmo fluxo que o Dashboard
  usa para gerar a URL do portal. Sem UI nativa de billing no MVP.

## Critérios de aceite

- [ ] KPIs e gráfico batem com o Dashboard para a mesma loja/período (mesmo
      número, centavo a centavo).
- [ ] Histórico de `payouts` lista com status corretos via RLS.
- [ ] Antecipação dispara `request-advance` e reflete o resultado (sucesso e
      erro tratados) — sem cálculo financeiro no cliente.
- [ ] Relatórios mostram os mesmos agregados do web (fonte única — sem
      agregação duplicada no app).
- [ ] Status da assinatura correto + abertura do Customer Portal funcional.
- [ ] RLS: dados financeiros de outro tenant inacessíveis (teste negativo).
