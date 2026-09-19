# Mobile Partner — telas sobre o sistema

> Como cada tela do lojista foi remontada com o sistema de [`00-sistema.md`](./00-sistema.md). Lógica de dados, stores e integrações não mudaram — só a camada visual e a organização do que está ao vivo vs. o que é acervo.

| Tela | Arquivo | Estado |
|---|---|---|
| Entrar | `app/(auth)/entrar.tsx` | refeita (fachada) |
| Gates | `components/TelaGate.tsx`, `TelaStub.tsx` | refeitos sobre `EmptyState` |
| Ative sua loja para publicar | `components/GatePublicacao.tsx` | refeita (marquise + folha, status real) |
| Início | `app/(tabs)/index.tsx` | refeita (marquise + folha) |
| Pedidos | `app/(tabs)/pedidos.tsx` | refeita (marquise + folha) |
| Publicar | `app/(tabs)/publicar.tsx` | mantida (base dark; só hex → tokens) |
| Meu conteúdo | `app/(tabs)/conteudo.tsx` | refeita (marquise + folha) |
| Menu | `app/(tabs)/menu.tsx` | refeita (marquise + folha) |
| Pedido (detalhe) | `app/pedido/[id].tsx` | refeita (marquise + folha + CTA fixo) |
| Módulos de gestão (18) | `app/{produtos,estoque,financeiro,…}` | herdaram via `Basicos` |

---

## 1. Início (`(tabs)/index.tsx`)

```
┌─────────────────────────────────────────┐
│ ▓▓ marquee + GlowNeon ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ (◉ Café Aroma ▾)                        │  ← SeletorLoja escuro (pílula de vidro)
│  BOA TARDE, PEDRO                        │  ← micro
│  Sua loja,                               │  ← statement 30
│  ao vivo no shopping.                    │  ← acento itálico accent
│  2 novos · 3 em preparo · 1 em entrega   │  ← sublinha (resumo vivo)
│ ┌ 💵 R$ 1.240 ┐ ┌ 🧾 14 ┐ ┌ 📈 R$ 88 ┐   │  ← PlacaVidro: receita · pedidos · ticket
│ ┌ 🔔 2 ┐ ┌ 👨‍🍳 3 ┐ ┌ 🛵 1 ┐               │  ← fila: novos (accent se > 0) · preparo · entrega
│ ┌─ CartaoPedidoVivo ──────────────────┐ │
│ │ • MARIA SILVA                há 4 min│ │
│ │ Pedido novo                          │ │  ← statement 20
│ │ Aguardando sua confirmação.          │ │
│ │ ▓▓░░░░░░░░░░░░ 10%                   │ │
│ │ 2× Cappuccino…            R$ 24,90   │ │
│ │ [ ✓ Confirmar pedido ]               │ │  ← ação inline (otimista + rollback)
│ └──────────────────────────────────────┘ │
│ ╭──────── folha (VidroFosco + luz) ─────╮
│ │  ATENÇÃO / Pendências da conta         │  ← só com assinatura em atraso / recebimentos
│ │  JÁ CONFIRMADOS / Em andamento  Ver todos ›
│ │  ┌ PedidoCard (recibo) ×5 ┐            │
│ │  ATALHOS / Sua loja                    │
│ │  ┌ Publicar · Relatórios · Minha loja ┐│  ← linhas com moeda canvasAlt + ícone ink
│ ╰────────────────────────────────────────╯
```

- **Marquise**: até 3 pedidos `novo` como `CartaoPedidoVivo` com **Confirmar** inline (`atualizarStatusPedido`, otimista com rollback, como o Dashboard); mais de 3 → link "Mais N aguardando em Pedidos". Sem novos → `SemAcaoPendente` (linha de vidro: "Nenhum pedido esperando você").
- **Folha**: pendências (antes eram `Banner` soft no topo) viram cartões claros com moeda na cor do momento; "Em andamento" = ativos não-novos (5) como recibo; atalhos como lista.
- KPIs: mesma query da home web (`orders` desde 00:00, RLS por tenant).

## 2. Pedidos (`(tabs)/pedidos.tsx`)

- **Marquise**: statement "Operação / Do balcão / à porta do cliente." + resumo; **todos** os `novo` como cartão ao vivo com Confirmar. Vazio: "Nenhum pedido novo".
- **Folha**: "Em andamento" (confirmado → saiu, sempre visíveis) e "Finalizados" com `Chip` de período (Hoje / 7 dias / Mês) — os chips de **status** saíram: a divisão marquise/andamento/finalizados já responde.
- Erro de carga vira `CartaoFolha` em danger, não texto solto.

## 3. Menu (`(tabs)/menu.tsx`)

Port do Perfil do consumer: marquise com `TijoloLoja` 68 + nome da loja (statement 24) + responsável; `SeletorLoja escuro` na portaria quando há mais de uma loja. Folha: quatro `SecaoFolha` (Catálogo / Desempenho / Operação / Conta) com `ItemMenu` (moeda `canvasAlt` + ícone ink + título + descrição + chevron), **Aparência → Luz do dia** (Switch accent), `Botao danger` "Sair da conta" e versão.

## 4. Meu conteúdo (`(tabs)/conteudo.tsx`)

- **Marquise**: statement "Meu conteúdo / O que sua loja / mostrou ao shopping." + "N posts · N vídeos · N fotos"; filtros como `PilulaVidro` (Tudo / Vídeos / Fotos / Todas as lojas).
- **Folha**: aviso de uploads órfãos (cartão claro, moeda warning) e a grade 3 colunas (`CelulaPost`: thumb, pílula `inkGlass` de duração e views, `Badge` preenchido só quando não publicado). Vazio → `EmptyState` com CTA "Publicar primeiro post".

## 5. Pedido (`pedido/[id].tsx`)

Port do tracking do consumer ([07-telas §10](../consumer/07-telas.md)) na visão de quem opera:

- **Marquise**: `MoedaVidro` voltar; `MoedaVidro` telefone (accent enquanto ativo); sobrelinha com `PontoAoVivo` "AO VIVO · CLIENTE"; statement = `rotuloLongo` 30 + linha acesa "há 4 min."; `descricao` (o que fazer); `BarraProgresso` + % (success quando entregue); motivo de cancelamento em bloco `softColor(danger)`; **cartão de vidro com o total** e forma/estado do pagamento.
- **Folha**: Separação (`CardSeparacao`, agora sem borda), Itens (`CartaoFolha` padding 0, variações/modificadores/observação com ícone `info`, Subtotal · Entrega (Grátis em success) · Total), Cliente (nome + telefone tocável, endereço), Observações, Entregador (moeda ink + telefone accent).
- **CTA fixo**: barra `surface` com `radius.md` no topo e `shadow.floating`; um `Botao` por transição (`primario`; cancelar = `secundario` com ícone `close`). A folha reserva a altura da barra.
- Atribuição de entregador = `FolhaModal` sobre canvas com linhas `LinhaInfo`.

## 6. Entrar (`(auth)/entrar.tsx`)

Fachada inteira: `marquee` + `GlowNeon`, logo, sobrelinha "APP DO LOJISTA", statement "Sua loja, / na palma da mão." (acento itálico), `Input fundoEscuro` (email, senha com olho), `Botao` primário, link "Cadastre sua loja" (accent) → Dashboard. Os `#A4A7AD` inline viraram `marqueeInkSoft`.

## 7. Gates e stubs

`TelaGate` (sem tenant / assinatura / sem loja) = fachada escura + `EmptyState escuro` + `Botao ghost` "Sair" — quem está barrado ainda está "fora". `TelaStub` = `EmptyState` claro com `Badge` warning "Em construção".

### "Ative sua loja para publicar" (`components/GatePublicacao.tsx`)

O lojista está DENTRO do app (tab bar visível, gestão liberada), então o gate de publicação segue a arquitetura da casa:

- **Marquise**: portaria com o nome da aba (Publicar / Meu conteúdo) e `SeletorLoja escuro`; statement "Recebimentos / Ative sua loja / para publicar." + sublinha explicando o porquê; `CartaoVidro` com o **status real** de `pagarme_onboarding_status` no vocabulário da aba Recebimentos do web (`registration` cadastro em andamento · `affiliation`/`pending` em análise · `refused`/`suspended`/`blocked` problema · `inactive`), ponto na cor do momento (warning / info / danger / mudo). **Pull-to-refresh reconsulta o tenant** — aprovação acontece no web/Pagar.me e o app só vê quando pergunta.
- **Folha**: "O caminho / Três passos" (dados de recebimento → verificação Pagar.me → loja no ar), com o passo atual derivado do momento (feito = moeda ink + check accent; atual = `softColor(cor)` + "AGORA"; pendente = `canvasAlt` esmaecido); `Botao` "Configurar recebimentos" (ícone `external`, abre `/configuracoes?aba=recebimentos`) e a nota "a verificação é feita no Dashboard"; "Enquanto isso / Segue liberado" com Pedidos, Catálogo e Minha loja.

## 8. Módulos de gestão (stack)

Não foram reescritos. Herdaram o sistema por `components/Basicos.tsx`:

| Peça antiga | Agora |
|---|---|
| `Cartao` (surface, sem sombra) | `surface` sem borda + `shadow.soft` (= `CartaoFolha`) |
| `CampoTexto` (TextInput em `surfaceMuted`) | `ui/Input` (fio `line` → accent no foco → danger no erro) |
| `BotaoPrimario` (54px; destrutivo = outline) | `ui/Botao md` (`primario` / `danger`) |
| `Chip` (surface/ink) | `ui/Chip sm` (`surfaceMuted` / ink+accent) |
| `Legenda` (micro 11) | sobrelinha 10.5/1.2 `inkSoft` (a mesma do `SecaoFolha`) |
| `CabecalhoTela` | moeda `surface` com `shadow.soft` |

`CardSeparacao` perdeu a borda e ganhou `shadow.soft`; o selo do porte é `accent` sobre `ink`.

## 9. Próximos passos (não feitos)

1. **Módulos com marquise curta** — os 18 módulos ainda usam `paddingTop: 64/72` fixo + `CabecalhoTela`. Uma marquise de uma linha (voltar + letreiro) daria continuidade ao sistema sem exigir reescrita de cada tela.
2. **Publicar** — a tela de captura segue com a base dark própria (correto: é o "Explorar" do lojista), mas os controles inline poderiam usar `MoedaVidro`/`PilulaVidro`.
3. **Assets** — `splash.png` é um lima chapado; um asset com a marca em accent sobre `marquee` alinharia com o consumer (`#111216`). `adaptiveIcon.backgroundColor` já foi para `#111216`.
4. **Placas do Menu** — contagens (produtos, posts, mensagens não lidas) como `PlacaVidro` na marquise, quando houver query barata.
