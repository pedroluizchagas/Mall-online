# 06 — Fluxos de UX Críticos

*Versão 1.0 — 09/05/2026*

Cada fluxo descreve **gatilho → passos → estados de erro → telas**.
Servem como referência para implementação e QA.

---

## 6.1 Setup inicial da loja

**Gatilho:** primeiro login após onboarding.

```
1. /  →  detecta setupCompleto = false
2.    Renderiza <SetupWizard /> com 4 passos:
       a. Verificar conta de recebimentos        → /configuracoes#recebimentos
       b. Cadastrar produtos                      → /produtos/novo
       c. Configurar horários                     → /configuracoes#horarios
       d. Configurar entrega                      → /configuracoes#entrega
3. Após cada passo concluído, retorna a /  com checkbox marcado.
4. Quando todos completos, /  passa a renderizar a Home operacional.
   O SetupWizard vira card "Saúde da loja" permanente.
```

**Erros:**
- Stripe rejeita verificação → banner global "Verificação pendente"
  fica até regularizar.
- Plano não permite mais produtos → CTA dentro de "Saúde da loja"
  para fazer upgrade.

---

## 6.2 Primeiro pedido

**Gatilho:** evento `INSERT` na tabela `orders` com `tenant_id` do
lojista.

```
1. Realtime dispara → badge "Pedidos" pulsa, som toca (se opt-in).
2. Push notification se app fechado.
3. Lojista clica no badge → /pedidos
4. Coluna "Novo" tem o pedido com timer.
5. Click → painel lateral abre (?abrir=ord_xxx)
6. Botão primário muda conforme status:
       novo            → "Aceitar"
       aceito          → "Marcar em preparo"
       em_preparo      → "Despachar"  (chama modal-atribuir-entregador)
       saiu_entrega    → "Marcar entregue"
7. Cada transição chama Server Action atualizarStatusPedido(id, novo)
8. Pedido entregue → repasse agendado (já implementado).
```

**Erros:**
- Falha em atribuir entregador → toast vermelho com motivo, status
  do pedido **não muda**.
- Cliente cancela → notificação push para lojista, status vira
  `cancelado_cliente` na coluna correspondente.

---

## 6.3 Atrasos e SLA

**Gatilho:** pedido com `now() - status_atualizado_em > tempo_entrega`.

```
1. Realtime ou polling client-side identifica.
2. Linha no kanban fica com borda âmbar e badge "atrasado".
3. Card de pedido mostra: "Há X min sem mudança".
4. Aparece em "Saúde da loja" da home se houver ≥ 3 atrasos no dia.
5. Botão "Avisar cliente" abre modal com mensagem template; envia via
   /mensagens (cria thread se ainda não existir).
```

---

## 6.4 Antecipação de repasse

**Gatilho:** lojista clica em CardAntecipacao em /financeiro.

```
1. /financeiro  → CardAntecipacao mostra "X pedidos elegíveis = R$ Y"
2. Click "Antecipar" → modal:
   - Tabela com pedidos elegíveis (selecionáveis)
   - Subtotal, desconto (R$ 0,75/pedido), valor líquido
   - Botão "Confirmar antecipação"
3. Server Action solicitarAntecipacao(orderIds) → Edge Function
4. Estado de loading e idempotência via tabela payout_advance_requests
5. Sucesso → toast verde, repasses passam a ter status "antecipado"
6. Falha do gateway → mensagem clara com botão "Tentar novamente"
```

**Erros:**
- Saldo insuficiente no recipient → impede e mostra explicação.
- Recipient pendente de KYC → bloqueia com link para
  `/configuracoes#recebimentos`.

---

## 6.5 Convidar entregador próprio

**Gatilho:** clique em "Convidar entregador" em `/entregadores`.

```
1. /entregadores  →  [Convidar entregador]
2. /entregadores/convidar  →  formulário (nome, telefone, e-mail opcional)
3. Server Action gerarConviteEntregador()
   → cria registro em courier_invites
   → retorna { link, token, expiraEm }
4. Tela de sucesso mostra link + botão "Copiar" + QR.
5. Link envia o convidado para fluxo de cadastro do app entregador
   (docs/19) com pré-preenchimento.
6. Ao cadastro completo, entregador entra como pendente em /entregadores.
7. Lojista aprova/reprova em /entregadores/[id].
```

**Erros:**
- Telefone já cadastrado → toast vermelho com "este telefone já está
  vinculado a outro entregador na sua loja".
- Convite expirado → status `expirado` no listing de convites.

---

## 6.6 Aprovar entregador

```
1. /entregadores  →  filtro "Pendentes"  →  click no item
2. /entregadores/[id]  →  abas "Documentos", "Perfil"
3. Lojista revisa CNH, foto, comprovante.
4. Botão "Aprovar"  →  Server Action aprovarEntregador(id)
   → atualiza couriers.status = 'aprovado'
   → dispara push para o entregador
5. Botão "Reprovar"  →  modal com motivo obrigatório
   → atualiza couriers.status = 'reprovado'
   → notifica entregador.
```

---

## 6.7 Mudar identidade visual da loja

**Gatilho:** lojista quer trocar logo / template / paleta.

```
1. /minha-loja
2. Aba "Identidade"
3. Faz alterações; preview ao vivo no painel direito (já existe).
4. Clica "Publicar alterações"
5. Server Action publicarVitrine():
   - upload Supabase Storage para logo/banner
   - update stores.theme (jsonb), stores.logo_url, stores.banner_url
   - revalidatePath('/minha-loja') e a rota pública /loja/[slug]
6. Toast verde, botão volta ao estado padrão.
```

**Erros:**
- Imagem > 5MB → bloqueio antes do upload.
- Upload falha → mantém estado anterior, toast vermelho.

---

## 6.8 Pausar a loja

**Gatilho:** alta demanda, cozinha sobrecarregada, fim de expediente
não programado.

```
1. Header de /minha-loja  →  toggle "Aberta"  →  desliga.
2. Confirmação rápida ("Tem certeza? Clientes verão a loja como pausada.").
3. Server Action alternarStatusLoja(false)
   → stores.ativo = false
   → revalida loja pública
4. Banner global no dashboard: "Loja pausada — clientes não podem
   pedir agora". CTA "Reabrir".
5. Reabrir é simétrico: alternarStatusLoja(true).
```

---

## 6.9 Responder avaliação ruim

```
1. /avaliacoes  →  filtro "Estrelas: 1-2"
2. Click "Responder"
3. Modal com sugestões de resposta (templates).
4. Server Action responderAvaliacao(id, texto)
   → store_reviews.resposta_lojista, respondida_em
5. Resposta aparece na loja pública abaixo da avaliação.
```

---

## 6.10 Domínio personalizado

```
1. /minha-loja  →  aba "Domínio"
2. Lojista digita "minhaloja.com.br"
3. Server Action configurarDominio() → chama
   /api/stores/provision-domain
4. Mostra instruções DNS (A/CNAME) e botão "Verificar".
5. Verificação periódica até DNS propagar; status: pending → verified.
6. Após verified, loja pública responde no domínio do lojista.
```

**Erros:**
- DNS não propaga em 48h → CTA "Reenviar instruções" + link para
  ajuda.

---

## 6.11 Abrir chamado de suporte

```
1. /ajuda  →  [Abrir chamado]
2. Form (assunto, descrição, prioridade)
3. Server Action abrirChamado()
   → cria support_tickets
   → envia e-mail para suporte@mallevo
4. Lojista vê o ticket em /ajuda?tab=meus-chamados
```

---

## 6.12 Atalhos de teclado (jornadas rápidas)

| Atalho | O que faz no contexto |
|--------|------------------------|
| `⌘K` | Abre command palette de qualquer página. |
| `g p` | Vai para Pedidos. |
| `g e` | Vai para Entregadores. |
| `n` em /produtos | Abre /produtos/novo. |
| `Enter` numa linha do kanban | Abre painel do pedido. |
| `Esc` | Fecha modal / palette. |

---

## 6.13 RESUMO

Os 12 fluxos acima são o **mapa de jornadas críticas** do lojista
no MVP redesenhado. Servem como base para o `09-checklist-qa.md`.
