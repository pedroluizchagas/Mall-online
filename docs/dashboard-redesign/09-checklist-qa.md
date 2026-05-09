# 09 — Checklist de QA

*Versão 1.0 — 09/05/2026*

Checklist por página + regressão. Marcar com `[x]` durante PRs.

---

## 9.1 Sidebar

- [ ] Não há links 404 (todos os 12 itens levam a página real).
- [ ] Grupos "Operar", "Analisar", "Minha Loja", "Conta" presentes.
- [ ] Subitens de Catálogo (Produtos, Categorias, Estoque) expandem.
- [ ] Item ativo destacado em `var(--brick)`.
- [ ] Badge de Pedidos atualiza em < 2s após novo pedido (Realtime).
- [ ] Badge de Mensagens atualiza ao receber mensagem do cliente.
- [ ] `⌘K` abre command palette.
- [ ] "Sair" desloga e redireciona para `/entrar`.
- [ ] Mobile: vira drawer com hamburger.

---

## 9.2 Início (`/`)

- [ ] Nome do lojista no header.
- [ ] Seletor de período `Hoje · 7d · 30d` muda KPIs e sparklines.
- [ ] KPIs com comparativo `Δ %` quando período permite.
- [ ] Fila de pedidos mostra os 3 ativos mais recentes.
- [ ] Card Entregadores: pool ou próprios conforme configuração.
- [ ] "Saúde da loja" com warnings clicáveis (cada CTA leva à página
  certa).
- [ ] InsightBar permanece no rodapé.
- [ ] SetupWizard só aparece quando há passo incompleto.

---

## 9.3 Pedidos (`/pedidos`)

- [ ] Realtime: pedido novo aparece sem refresh.
- [ ] Som toca apenas com opt-in.
- [ ] Filtros por período e status persistem em URL.
- [ ] Busca por número/telefone/bairro.
- [ ] Painel lateral abre via `?abrir=ord_xxx`.
- [ ] Botões de transição mudam conforme status.
- [ ] Atribuir entregador: modal abre, lista entregadores, atribui.
- [ ] Imprimir comanda gera PDF.
- [ ] Atrasos exibem borda âmbar e badge "atrasado".
- [ ] Mobile: tabs por status; detalhe em tela cheia.

---

## 9.4 Catálogo

### Produtos (`/produtos`)
- [ ] Lista paginada quando > 50 produtos.
- [ ] Filtro por categoria, status e estoque baixo via URL.
- [ ] "Importar CSV" carrega arquivo e valida.
- [ ] "Exportar CSV" baixa arquivo.
- [ ] Ações em massa: desativar, mudar categoria.
- [ ] Barra de uso de plano correta.

### Categorias (`/categorias`)
- [ ] Reordenação por arrastar.
- [ ] Contador de produtos por categoria.
- [ ] CRUD completo.

### Estoque (`/estoque`)
- [ ] Listagem geral com busca, filtro "baixo" e "zerado".
- [ ] Linha leva a `/estoque/[id]`.
- [ ] Movimento manual (botão) abre modal.

---

## 9.5 Financeiro (`/financeiro`)

- [ ] KPIs financeiros com comparativo de período.
- [ ] Seletor `Hoje · 7d · 30d · Mês · 12m` em URL.
- [ ] Gráfico de faturamento atualiza com período.
- [ ] Card "Saldo" tem botão "Acessar conta Stripe" mas **não**
  "Completar verificação".
- [ ] Card Antecipação só aparece quando há pedidos elegíveis.
- [ ] Modal de antecipação confirma pedidos selecionados.
- [ ] Histórico de repasses paginado.
- [ ] "Exportar extrato" gera CSV/XLSX por período.

---

## 9.6 Minha Loja (`/minha-loja`)

- [ ] Toggle "Aberta/Pausada" funciona com confirmação.
- [ ] Botão "Ver loja pública" abre `/loja/[slug]` em nova aba.
- [ ] Aba Identidade: template, paleta, logo, banner, nome, tagline.
- [ ] **Persistência real** — recarregar mantém alterações.
- [ ] Upload de logo/banner para Supabase Storage.
- [ ] Aba Identidade pública: slug + copiar + QR.
- [ ] Aba Domínio: configurar e verificar DNS.
- [ ] Preview ao vivo reflete mudanças.
- [ ] Mobile: editor sem preview lateral; modal "Ver preview".

---

## 9.7 Configurações (`/configuracoes`)

- [ ] 7 abas presentes: Identificação, Localização, Horários,
  Entrega, Pagamentos, Recebimentos, Notificações.
- [ ] Identificação: nome interno, telefone, e-mail comercial,
  CNPJ, categoria.
- [ ] Localização: endereço completo isolado.
- [ ] Horários: grade semanal com toggle (mantém).
- [ ] Entrega: taxa, raio, tempo, política (sem endereço).
- [ ] Pagamentos: dinheiro, PIX, cartão maquininha, cartão online.
- [ ] Recebimentos: status Stripe/Pagar.me + completar verificação.
- [ ] Notificações: toggles de e-mail/push.
- [ ] Aba ativa via `?aba=...`.

---

## 9.8 Minha Conta (`/minha-conta`)

- [ ] 5 abas: Pessoa, Segurança, Assinatura, Faturas, Privacidade.
- [ ] Pessoa: nome, telefone, foto. E-mail e CPF read-only.
- [ ] Segurança: alterar senha, sessões ativas, encerrar todas.
- [ ] Assinatura: plano, próxima cobrança, link portal Stripe.
- [ ] Faturas: tabela com PDF.
- [ ] Privacidade: exportar dados, excluir conta (com confirmação
  forte).
- [ ] **Não há mais aba "Recebimentos" aqui.**
- [ ] `/configuracoes/conta` redireciona para `/minha-conta`.

---

## 9.9 Entregadores (`/entregadores`)

- [ ] Header com modelo atual (pool / próprios).
- [ ] Filtros: Ativos, Pendentes, Inativos, Todos.
- [ ] KPIs: em entrega, aceite 7d, tempo médio, avaliação.
- [ ] Tabela com ações inline.
- [ ] `/entregadores/[id]`: 4 abas (Perfil, Histórico, Localização,
  Documentos).
- [ ] Aprovar/Reprovar (próprios pendentes).
- [ ] Convidar gera link com QR.
- [ ] Convidado completa cadastro e cai em "Pendentes".

---

## 9.10 Relatórios (`/relatorios`)

- [ ] 5 abas: Visão geral, Produtos, Pedidos, Clientes, Bairros.
- [ ] Período + comparação em URL.
- [ ] Heatmap dia × hora.
- [ ] Top 20 mais vendidos.
- [ ] Tempo médio por etapa do pedido.
- [ ] Novos × recorrentes.
- [ ] Exportação CSV/XLSX/PDF.
- [ ] Cache responde em < 2s para 30d.

---

## 9.11 Mensagens (`/mensagens`)

- [ ] Lista de threads à esquerda, conversa à direita.
- [ ] Filtros: Todas, Cliente, Plataforma, Não lidas.
- [ ] Realtime em `messages`.
- [ ] Envio com `Enter`.
- [ ] Sugestões rápidas / templates.
- [ ] Broadcast com seleção de público.
- [ ] Marcar lido ao abrir thread.
- [ ] Mobile: lista e conversa em telas separadas.

---

## 9.12 Avaliações (`/avaliacoes`)

- [ ] KPIs (média geral, total, distribuição).
- [ ] Filtros: período, estrelas, sem resposta.
- [ ] Resposta inline com templates.
- [ ] Sinalizar abre modal com motivo.
- [ ] Resposta aparece na loja pública.
- [ ] Avaliações ≤ 2 disparam aviso na home.

---

## 9.13 Central de Ajuda (`/ajuda`)

- [ ] Busca client-side em FAQ `.mdx`.
- [ ] Cards de categoria.
- [ ] Lista de artigos populares.
- [ ] "Abrir chamado" cria `support_tickets`.
- [ ] "Meus chamados" lista os tickets do tenant.
- [ ] WhatsApp deeplink funciona.

---

## 9.14 Acessibilidade

- [ ] Lighthouse a11y ≥ 95 nas páginas críticas.
- [ ] Navegação 100% por teclado em Início, Pedidos, Produtos.
- [ ] VoiceOver lê título de página, menu e tabela coerentemente.
- [ ] NVDA idem.
- [ ] Zoom 200% — nada quebra.
- [ ] Contraste AA — Stark/axe sem violações.
- [ ] Foco visível em todos os interativos.

---

## 9.15 Regressão

- [ ] `/loja/[slug]` (vitrine pública) reflete identidade publicada.
- [ ] Onboarding de novo lojista ainda funciona ponta a ponta.
- [ ] `BannerStripePendente` aparece para tenant sem onboarding.
- [ ] Banner de assinatura em atraso aparece e leva a `/minha-conta?aba=assinatura`.
- [ ] Webhooks de Stripe/Pagar.me continuam atualizando estados.
- [ ] Migration `006` aplica e desfaz (down) sem erro.

---

## 9.16 Critério final de release

A release só pode ir para produção quando:
1. Todos os checks acima estiverem `[x]`.
2. Lighthouse a11y ≥ 95 nas 5 páginas críticas (Início, Pedidos,
   Catálogo, Financeiro, Minha Loja).
3. 3 lojistas piloto fizeram um ciclo completo (cadastro de produto,
   recebimento de pedido, atribuição de entregador, recebimento de
   avaliação, resposta).
4. Nenhuma rota antiga retorna 404; todas redirecionam.
5. Telemetria mostra que o tempo médio para "primeiro pedido após
   login" caiu vs. baseline.
