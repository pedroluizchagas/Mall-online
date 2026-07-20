# Stage 6 — Operação da Loja

> Fecha a paridade de gestão: dados da loja, horários, avaliações, mensagens,
> agenda, entregadores, configurações, conta e ajuda. Módulos independentes —
> podem ser entregues em sub-PRs na ordem abaixo. Depende dos Stages 1–2.

## Fonte da verdade das regras

Actions do Dashboard: `lojas.ts` / `loja-vitrine.ts` (minha loja),
`agenda.ts`, `auth.ts` (conta) + tabelas já migradas: `store_reviews`,
`message_threads`/`messages` (ambas na publication Realtime),
`courier_invites`, `support_tickets`, `migration_020_agenda`.

## Ordem interna sugerida (valor decrescente)

1. **Minha loja** (`minha-loja.tsx`) — nome, descrição, telefone, endereço,
   logo/banner (upload `store-assets`, mesma compressão de foto do Stage 4),
   **horários de funcionamento** (grade semanal com toggle por dia — o editor
   mobile mais cuidadoso deste stage), raio e taxa de entrega, tempo médio,
   métodos de pagamento aceitos. Pausar loja (fechar temporariamente) em
   destaque.
2. **Avaliações** (`avaliacoes.tsx`) — lista de `store_reviews` com nota,
   filtros, e **responder avaliação** (mesma mutação do Dashboard). Push/badge
   de avaliação nova é nice-to-have.
3. **Mensagens** (`mensagens/`) — threads (`message_threads`) e chat
   (`messages`) com Realtime (tabelas já estão na publication). Enviar texto;
   anexos ficam como no Dashboard (se lá não há, aqui também não).
4. **Entregadores** (`entregadores.tsx`) — lista dos entregadores próprios,
   status, e convite via `courier_invites` (gerar/compartilhar link com
   `Share`). Aprovação de cadastro segue no Admin.
5. **Agenda** (`agenda.tsx`) — espelho mobile da `/agenda` do Dashboard
   (mesmas entidades da `migration_020`), visão dia/semana compacta.
6. **Configurações** (`configuracoes.tsx`) — o que for regra de loja simples.
   `staff` e `tipo-de-loja` são **web-only** (decisão `01` §3): entradas
   visíveis com CTA "abrir no Dashboard".
7. **Minha conta** (`minha-conta.tsx`) — dados do responsável, assinatura
   (regras no Stage 5), trocar loja ativa, **sair**.
8. **Ajuda** (`ajuda.tsx`) — abrir/acompanhar `support_tickets` (mesmo fluxo
   do Dashboard).

## Diretrizes transversais

- Cada módulo é uma tela stack a partir da aba **Menu** (`(tabs)/menu.tsx`),
  que vira neste stage a lista definitiva de entradas com ícones + estados
  (badges de mensagens/avaliações não lidas quando barato).
- Formulários: validação idêntica à do web (schemas Zod compartilháveis via
  `packages/lib` quando já exportáveis; senão validar igual e anotar
  unificação como pendência).
- Uploads de imagem: mesmo pipeline do Stage 4 (`expo-image-picker` +
  `expo-image-manipulator` + bucket correto).
- Nada de regra nova no cliente; qualquer lacuna de RLS descoberta aqui é
  tratada como bug de backend (migration), nunca contornada no app.

## Critérios de aceite

- [ ] Editar dados/horários/entrega da loja reflete no consumer e no
      storefront igual ao Dashboard.
- [ ] Pausar loja fecha a loja nas superfícies públicas imediatamente.
- [ ] Responder avaliação persiste e aparece no Dashboard.
- [ ] Chat de mensagens recebe/envia em tempo real nos dois lados
      (app ↔ consumer).
- [ ] Convite de entregador gerado no app funciona no fluxo atual do courier.
- [ ] Agenda mostra os mesmos compromissos do Dashboard.
- [ ] Entradas web-only (staff, tipo-de-loja) abrem o Dashboard via link.
- [ ] Sair limpa a sessão local (AsyncStorage) sem afetar outros apps.
- [ ] RLS: nenhum dado de outro tenant acessível (teste negativo por módulo).
