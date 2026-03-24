# 23 — Push Notifications

### Plataforma Delivery Divinópolis

*Versão 1.0 — 23/03/2026*

-----

## VISAO GERAL

As push notifications conectam os três apps em tempo real quando
o Supabase Realtime não é suficiente — por exemplo, quando o app
está em segundo plano ou fechado. A arquitetura usa Expo Notifications
como provedor para iOS e Android, Supabase Database Webhooks para
detectar eventos relevantes e uma Edge Function para despachar
as notificações via Expo Push API.

-----

## ARQUITETURA

```
Evento no banco (INSERT/UPDATE)
        ↓
Supabase Database Webhook
        ↓
Edge Function notify-order-update
  → Busca push tokens dos destinatários
  → Monta payload por tipo de evento
  → Chama Expo Push API
        ↓
Expo Push API
  → APNs (Apple)
  → FCM (Google)
        ↓
App do consumidor / lojista / entregador
  (em background ou foreground)
```

-----

## TABELA PUSH_TOKENS

Já definida no arquivo 03 e criada na migration_004.
Cada usuário/entregador pode ter múltiplos tokens
(um por dispositivo/app instalado).

```sql
-- Referência da estrutura
push_tokens (
  id            UUID PRIMARY KEY,
  user_id       UUID REFERENCES auth.users,   -- consumidor ou lojista
  courier_id    UUID REFERENCES couriers,      -- entregador
  token         TEXT NOT NULL,
  plataforma    TEXT,                          -- 'ios' | 'android'
  app           TEXT,                          -- 'consumer' | 'courier' | 'web'
  ativo         BOOLEAN DEFAULT true
)
```

-----

## REGISTRO DE TOKEN NOS APPS MOBILE

### Consumidor e Entregador — lib/notificacoes.ts

Reutilizável nos dois apps Expo. Solicita permissão, obtém o
token e salva no banco. Chamado no `_layout.tsx` raiz após
autenticação.

```typescript
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { supabase } from './supabase'

// Configurar comportamento quando notificação chega com app aberto
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export async function registrarPushToken(
  userId: string | null,
  courierId: string | null,
  app: 'consumer' | 'courier'
): Promise<void> {
  // Push não funciona em emulador
  if (!Device.isDevice) {
    console.warn('Push notifications requerem dispositivo físico.')
    return
  }

  // Solicitar permissão
  const { status: existente } = await Notifications.getPermissionsAsync()
  let status = existente

  if (existente !== 'granted') {
    const { status: novo } = await Notifications.requestPermissionsAsync()
    status = novo
  }

  if (status !== 'granted') {
    console.warn('Permissão de notificações negada.')
    return
  }

  // Configuração específica do Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Padrão',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4CAF82',
    })
  }

  // Obter token Expo
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  })

  const token = tokenData.data
  const plataforma = Platform.OS === 'ios' ? 'ios' : 'android'

  // Salvar no banco (upsert para atualizar se já existe)
  const registro = {
    token,
    plataforma,
    app,
    ativo: true,
    ...(userId ? { user_id: userId } : {}),
    ...(courierId ? { courier_id: courierId } : {}),
  }

  const { error } = await supabase
    .from('push_tokens')
    .upsert(registro, { onConflict: 'token' })

  if (error) {
    console.error('Erro ao salvar push token:', error.message)
  }
}

export async function desativarPushToken(token: string): Promise<void> {
  await supabase
    .from('push_tokens')
    .update({ ativo: false })
    .eq('token', token)
}
```

### Uso no layout raiz do consumer app

```typescript
// app/_layout.tsx (apps/mobile-consumer) — trecho

useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (_event, session) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        const { data: consumer } = await supabase
          .from('consumers')
          .select('id')
          .eq('user_id', session.user.id)
          .single()

        if (consumer) {
          setConsumer(consumer)
          // Registrar token após autenticação
          await registrarPushToken(session.user.id, null, 'consumer')
        }
      }
    }
  )

  return () => subscription.unsubscribe()
}, [])
```

### Uso no layout raiz do courier app

```typescript
// app/_layout.tsx (apps/mobile-courier) — trecho

if (session?.user) {
  const { data: courier } = await supabase
    .from('couriers')
    .select('id, nome, status, ...')
    .eq('user_id', session.user.id)
    .single()

  if (courier) {
    setCourier(courier)
    // Registrar token usando courier_id
    await registrarPushToken(null, courier.id, 'courier')
  }
}
```

-----

## EDGE FUNCTION — NOTIFY-ORDER-UPDATE

### supabase/functions/notify-order-update/index.ts

Recebe o payload do Database Webhook e despacha as notificações
corretas para cada ator envolvido no pedido.

```typescript
import { getSupabaseAdmin } from '../helpers/auth.ts'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

interface PushMessage {
  to: string
  title: string
  body: string
  data?: Record<string, string>
  sound?: 'default'
  badge?: number
}

Deno.serve(async (req) => {
  // Verificar secret do webhook para segurança
  const webhookSecret = req.headers.get('x-webhook-secret')
  if (webhookSecret !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('Não autorizado', { status: 401 })
  }

  const payload = await req.json()
  const { type, table, record, old_record } = payload

  const supabase = getSupabaseAdmin()
  const mensagens: PushMessage[] = []

  // Processar eventos na tabela orders
  if (table === 'orders') {
    if (type === 'INSERT') {
      // Novo pedido — notificar lojista
      mensagens.push(...(await notificarLojistaNovoPedido(supabase, record)))
    }

    if (type === 'UPDATE' && old_record?.status !== record.status) {
      // Mudança de status — notificar consumidor
      mensagens.push(...(await notificarConsumidorStatus(supabase, record)))
    }
  }

  // Processar eventos na tabela delivery_assignments
  if (table === 'delivery_assignments') {
    if (type === 'INSERT') {
      // Nova atribuição — notificar entregador
      mensagens.push(...(await notificarEntregadorNovoPedido(supabase, record)))
    }

    if (type === 'UPDATE' && old_record?.status !== record.status) {
      if (record.status === 'entregue') {
        // Notificar lojista da entrega confirmada
        mensagens.push(...(await notificarLojistaPedidoEntregue(supabase, record)))
      }
    }
  }

  // Processar eventos na tabela payouts
  if (table === 'payouts' && type === 'UPDATE') {
    if (record.status === 'concluido' && old_record?.status !== 'concluido') {
      mensagens.push(...(await notificarRepasseProcessado(supabase, record)))
    }
  }

  // Enviar todas as notificações
  if (mensagens.length > 0) {
    await enviarNotificacoes(mensagens)
  }

  return new Response(
    JSON.stringify({ enviadas: mensagens.length }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})

// Buscar tokens de um usuário
async function buscarTokensUsuario(
  supabase: any,
  userId: string
): Promise<string[]> {
  const { data } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId)
    .eq('ativo', true)

  return (data ?? []).map((t: any) => t.token)
}

// Buscar tokens de um courier
async function buscarTokensCourier(
  supabase: any,
  courierId: string
): Promise<string[]> {
  const { data } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('courier_id', courierId)
    .eq('ativo', true)

  return (data ?? []).map((t: any) => t.token)
}

// Notificar lojista sobre novo pedido
async function notificarLojistaNovoPedido(
  supabase: any,
  pedido: any
): Promise<PushMessage[]> {
  // Buscar user_id do tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('user_id')
    .eq('id', pedido.tenant_id)
    .single()

  if (!tenant) return []

  const tokens = await buscarTokensUsuario(supabase, tenant.user_id)

  return tokens.map((token) => ({
    to: token,
    title: 'Novo pedido',
    body: `Você recebeu um novo pedido de R$${(pedido.total / 100).toFixed(2).replace('.', ',')}`,
    data: { tipo: 'novo_pedido', order_id: pedido.id },
    sound: 'default',
  }))
}

// Notificar consumidor sobre mudança de status
async function notificarConsumidorStatus(
  supabase: any,
  pedido: any
): Promise<PushMessage[]> {
  const { data: consumer } = await supabase
    .from('consumers')
    .select('user_id')
    .eq('id', pedido.consumer_id)
    .single()

  if (!consumer) return []

  const tokens = await buscarTokensUsuario(supabase, consumer.user_id)

  const MENSAGENS_STATUS: Record<string, { titulo: string; corpo: string }> = {
    confirmado: {
      titulo: 'Pedido confirmado',
      corpo: 'Seu pedido foi confirmado e está sendo preparado.',
    },
    em_preparo: {
      titulo: 'Em preparo',
      corpo: 'Seu pedido está sendo preparado agora.',
    },
    saiu_para_entrega: {
      titulo: 'Saiu para entrega',
      corpo: 'Seu pedido está a caminho! Acompanhe em tempo real.',
    },
    entregue: {
      titulo: 'Pedido entregue',
      corpo: 'Seu pedido foi entregue. Bom apetite!',
    },
    cancelado: {
      titulo: 'Pedido cancelado',
      corpo: pedido.motivo_cancelamento ?? 'Seu pedido foi cancelado.',
    },
  }

  const msg = MENSAGENS_STATUS[pedido.status]
  if (!msg) return []

  return tokens.map((token) => ({
    to: token,
    title: msg.titulo,
    body: msg.corpo,
    data: { tipo: 'status_pedido', order_id: pedido.id, status: pedido.status },
    sound: 'default',
  }))
}

// Notificar entregador sobre novo pedido disponível
async function notificarEntregadorNovoPedido(
  supabase: any,
  assignment: any
): Promise<PushMessage[]> {
  const tokens = await buscarTokensCourier(supabase, assignment.courier_id)

  return tokens.map((token) => ({
    to: token,
    title: 'Nova entrega disponível',
    body: `Uma entrega de R$${(assignment.valor_entrega / 100).toFixed(2).replace('.', ',')} está aguardando você.`,
    data: { tipo: 'nova_entrega', assignment_id: assignment.id },
    sound: 'default',
  }))
}

// Notificar lojista que pedido foi entregue
async function notificarLojistaPedidoEntregue(
  supabase: any,
  assignment: any
): Promise<PushMessage[]> {
  const { data: pedido } = await supabase
    .from('orders')
    .select('tenant_id, id')
    .eq('id', assignment.order_id)
    .single()

  if (!pedido) return []

  const { data: tenant } = await supabase
    .from('tenants')
    .select('user_id')
    .eq('id', pedido.tenant_id)
    .single()

  if (!tenant) return []

  const tokens = await buscarTokensUsuario(supabase, tenant.user_id)

  return tokens.map((token) => ({
    to: token,
    title: 'Entrega confirmada',
    body: 'O entregador confirmou a entrega do pedido ao consumidor.',
    data: { tipo: 'entrega_confirmada', order_id: pedido.id },
    sound: 'default',
  }))
}

// Notificar entregador sobre repasse processado
async function notificarRepasseProcessado(
  supabase: any,
  payout: any
): Promise<PushMessage[]> {
  if (!payout.courier_id) return []

  const tokens = await buscarTokensCourier(supabase, payout.courier_id)
  const valor = (payout.valor_liquido / 100).toFixed(2).replace('.', ',')

  return tokens.map((token) => ({
    to: token,
    title: 'Repasse processado',
    body: `R$${valor} foram transferidos para sua conta Stripe.`,
    data: { tipo: 'repasse_processado', payout_id: payout.id },
    sound: 'default',
  }))
}

// Despachar notificações via Expo Push API
async function enviarNotificacoes(mensagens: PushMessage[]): Promise<void> {
  // Expo aceita até 100 mensagens por chamada
  const lotes = []
  for (let i = 0; i < mensagens.length; i += 100) {
    lotes.push(mensagens.slice(i, i + 100))
  }

  for (const lote of lotes) {
    try {
      const resposta = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(lote),
      })

      const resultado = await resposta.json()

      // Verificar tickets e desativar tokens inválidos
      if (resultado.data) {
        for (let i = 0; i < resultado.data.length; i++) {
          const ticket = resultado.data[i]
          if (ticket.status === 'error') {
            if (
              ticket.details?.error === 'DeviceNotRegistered' ||
              ticket.details?.error === 'InvalidCredentials'
            ) {
              // Token inválido — desativar no banco
              console.warn('Token inválido detectado:', lote[i]?.to)
            }
          }
        }
      }
    } catch (erro) {
      console.error('Erro ao enviar notificações:', erro)
    }
  }
}
```

-----

## CONFIGURACAO DOS DATABASE WEBHOOKS

Os webhooks precisam ser configurados no Supabase Dashboard ou via
SQL. Cada tabela relevante tem seu próprio webhook apontando para
a Edge Function.

### Via SQL (recomendado — executar após criar a Edge Function)

```sql
-- Habilitar extensão de webhooks (já habilitada no Supabase por padrão)
-- CREATE EXTENSION IF NOT EXISTS "supabase_functions";

-- Webhook para INSERT em orders (novo pedido)
SELECT supabase_functions.http_request(
  'https://<PROJECT_REF>.supabase.co/functions/v1/notify-order-update',
  'POST',
  '{"Content-Type": "application/json", "x-webhook-secret": "<WEBHOOK_SECRET>"}',
  '{}',
  '1000'
);

-- Forma correta via pg_net (Supabase usa pg_net internamente)
-- Configurar via Dashboard: Database > Webhooks > Create webhook
```

### Via Supabase Dashboard

```
Supabase Dashboard
  → Database
  → Webhooks
  → Create new webhook

Webhook 1:
  Name: notify-new-order
  Table: orders
  Events: INSERT
  URL: https://<PROJECT_REF>.supabase.co/functions/v1/notify-order-update
  HTTP Headers:
    x-webhook-secret: <WEBHOOK_SECRET>

Webhook 2:
  Name: notify-order-status
  Table: orders
  Events: UPDATE
  URL: https://<PROJECT_REF>.supabase.co/functions/v1/notify-order-update
  HTTP Headers:
    x-webhook-secret: <WEBHOOK_SECRET>

Webhook 3:
  Name: notify-new-assignment
  Table: delivery_assignments
  Events: INSERT
  URL: https://<PROJECT_REF>.supabase.co/functions/v1/notify-order-update
  HTTP Headers:
    x-webhook-secret: <WEBHOOK_SECRET>

Webhook 4:
  Name: notify-assignment-status
  Table: delivery_assignments
  Events: UPDATE
  URL: https://<PROJECT_REF>.supabase.co/functions/v1/notify-order-update
  HTTP Headers:
    x-webhook-secret: <WEBHOOK_SECRET>

Webhook 5:
  Name: notify-payout
  Table: payouts
  Events: UPDATE
  URL: https://<PROJECT_REF>.supabase.co/functions/v1/notify-order-update
  HTTP Headers:
    x-webhook-secret: <WEBHOOK_SECRET>
```

-----

## VARIAVEL DE AMBIENTE ADICIONAL

```bash
# Adicionar ao Supabase Edge Function secrets
WEBHOOK_SECRET=gere_um_uuid_aleatorio_aqui

# Gerar com:
# node -e "console.log(require('crypto').randomUUID())"
# ou
# openssl rand -hex 32
```

-----

## LISTENER DE NOTIFICACOES NOS APPS

### lib/notificacoes.ts — listener de toque na notificação

Adicionar ao `_layout.tsx` raiz de cada app para tratar o toque
do usuário na notificação:

```typescript
import * as Notifications from 'expo-notifications'
import { useEffect, useRef } from 'react'
import { router } from 'expo-router'

export function useNotificacaoListener() {
  const notificacaoRecebida = useRef<Notifications.Subscription>()
  const notificacaoRespondida = useRef<Notifications.Subscription>()

  useEffect(() => {
    // Notificação recebida com app aberto (foreground)
    notificacaoRecebida.current =
      Notifications.addNotificationReceivedListener((notificacao) => {
        console.log('Notificação recebida:', notificacao.request.content.data)
        // O handler configurado com setNotificationHandler já exibe automaticamente
      })

    // Usuário tocou na notificação
    notificacaoRespondida.current =
      Notifications.addNotificationResponseReceivedListener((resposta) => {
        const data = resposta.notification.request.content.data as Record<string, string>

        // Navegar conforme o tipo de notificação
        switch (data?.tipo) {
          case 'novo_pedido':
            router.push('/dashboard/pedidos')
            break
          case 'status_pedido':
            if (data.order_id) {
              router.push(`/pedido/${data.order_id}`)
            }
            break
          case 'nova_entrega':
            router.push('/(tabs)')
            break
          case 'entrega_confirmada':
            router.push('/dashboard/pedidos')
            break
          case 'repasse_processado':
            router.push('/(tabs)/ganhos')
            break
        }
      })

    return () => {
      notificacaoRecebida.current?.remove()
      notificacaoRespondida.current?.remove()
    }
  }, [])
}
```

### Uso no layout raiz

```typescript
// app/_layout.tsx de cada app mobile

export default function LayoutRaiz() {
  useNotificacaoListener()  // Adicionar esta linha

  // resto do componente...
}
```

-----

## NOTIFICACAO IN-APP (FALLBACK)

Quando o app está em foreground, o Realtime já atualiza a UI em
tempo real. A notificação push serve como fallback para background.

Para o caso do dashboard web (Next.js), que não recebe push
nativas, o som de novo pedido e o realtime (arquivo 12)
cobrem a necessidade.

-----

## EVENTOS E DESTINATARIOS

Tabela completa de todos os eventos e quem recebe:

|Evento            |Tabela                     |Destinatário|Mensagem                               |
|------------------|---------------------------|------------|---------------------------------------|
|Novo pedido       |orders INSERT              |Lojista     |“Você recebeu um novo pedido de R$X”   |
|Pedido confirmado |orders UPDATE              |Consumidor  |“Seu pedido foi confirmado”            |
|Em preparo        |orders UPDATE              |Consumidor  |“Seu pedido está sendo preparado”      |
|Saiu para entrega |orders UPDATE              |Consumidor  |“Seu pedido está a caminho”            |
|Entregue          |orders UPDATE              |Consumidor  |“Seu pedido foi entregue. Bom apetite!”|
|Cancelado         |orders UPDATE              |Consumidor  |motivo do cancelamento                 |
|Nova atribuição   |delivery_assignments INSERT|Entregador  |“Nova entrega de R$X disponível”       |
|Entrega confirmada|delivery_assignments UPDATE|Lojista     |“Entregador confirmou a entrega”       |
|Repasse processado|payouts UPDATE             |Entregador  |“R$X transferidos para sua conta”      |

-----

## TRATAMENTO DE TOKENS INVALIDOS

Tokens podem se tornar inválidos quando:

- Usuário desinstala o app
- Usuário revoga permissão de notificações
- Token expira (raro com Expo)

A Edge Function detecta o erro `DeviceNotRegistered` nos tickets
de resposta da Expo API e deve desativar o token no banco.
Implementação completa com desativação:

```typescript
// Dentro de enviarNotificacoes()

// Após verificar tickets de resposta
const tokensInvalidos: string[] = []

for (let i = 0; i < resultado.data.length; i++) {
  const ticket = resultado.data[i]
  if (
    ticket.status === 'error' &&
    ticket.details?.error === 'DeviceNotRegistered'
  ) {
    tokensInvalidos.push(lote[i].to)
  }
}

if (tokensInvalidos.length > 0) {
  const supabase = getSupabaseAdmin()
  await supabase
    .from('push_tokens')
    .update({ ativo: false })
    .in('token', tokensInvalidos)

  console.log(`${tokensInvalidos.length} token(s) inválido(s) desativados`)
}
```

-----

## CHECKLIST DO MODULO

- [ ] `expo-notifications` instalado nos dois apps mobile
- [ ] `expo-device` instalado (necessário para verificar se é dispositivo físico)
- [ ] `EXPO_PUBLIC_PROJECT_ID` configurado no `.env.local` de cada app
  (encontrado em https://expo.dev → projeto → ID)
- [ ] Permissão de notificações solicitada após autenticação do usuário
- [ ] Canal Android (`setNotificationChannelAsync`) configurado antes de registrar token
- [ ] `WEBHOOK_SECRET` adicionado aos secrets da Edge Function via `supabase secrets set`
- [ ] 5 webhooks criados no Supabase Dashboard (orders INSERT, orders UPDATE,
  delivery_assignments INSERT, delivery_assignments UPDATE, payouts UPDATE)
- [ ] Edge Function `notify-order-update` deployada e testada com
  `supabase functions serve notify-order-update`
- [ ] `useNotificacaoListener` adicionado ao `_layout.tsx` raiz de cada app
- [ ] Navegação ao tocar na notificação testada para cada tipo de evento
- [ ] Tokens inválidos (`DeviceNotRegistered`) desativados automaticamente
- [ ] Notificações não duplicam quando app está em foreground com Realtime ativo
  (o `setNotificationHandler` exibe, mas o Realtime já atualizou a UI)
- [ ] `x-webhook-secret` verificado na Edge Function antes de processar qualquer payload

-----

*Arquivo 23 de 29 — Índice Mestre disponível no arquivo 00*
*Próximo: 24 — Módulo de Estoque*
