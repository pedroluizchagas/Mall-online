# Plano de execução — barra de navegação em TODAS as lojas do mobile-consumer

> **Para o executor (Opus 5):** plano preparado com análise do código em
> `claude/partner-app` (pós-merge c8bb0d8). Siga as fases NA ORDEM.
>
> **ORDEM DADA PELO USUÁRIO (2026-08-26), supersede decisões anteriores:**
> TODA loja aberta no **mobile-consumer** deve mostrar a barra de navegação —
> as 15 vitrines de arquétipo atuais, o layout padrão (lojas sem vitrine) e
> TODO arquétipo futuro. Isso REVOGA:
> - docs/store-theme/05 §5.6: "sem barra de menu inferior" nas vitrines
>   **ritual**, **horta** e **forno**;
> - a regra dos planos `plano-arquetipo-{garden,slice,mono,fresh}.md` de que a
>   vitrine usa só o chrome de dois botões flutuantes.
>
> Regras que CONTINUAM valendo:
> - `apps/mobile-consumer/app/(tabs)/_layout.tsx` é INTOCÁVEL — a barra da
>   vitrine é uma RÉPLICA local vestida no arquétipo, nunca a TabBar do shell;
> - escopo é SÓ `apps/mobile-consumer` — `storefront` (web) e demais apps não
>   entram.

---

## 0. Diagnóstico (feito — não redescobrir)

O app tem 15 vitrines dedicadas em `apps/mobile-consumer/components/loja/`.
**10 têm** barra de menu inferior própria (`BarraMenu<Nome>`, itens
Início/Explorar/Pedidos/Perfil que saem da loja via transição radial):
Editorial, Raw, Serena, Artesã, Noir, Volt, Clínica, Torra, Smash, Magazine.

**Faltam SEIS lugares** — 5 vitrines de arquétipo + o layout padrão:

| Onde | Arquétipo | Arquivo | Loja demo (mock) | Situação atual |
|---|---|---|---|---|
| Ritual | `ritual` | `LojaRitual.tsx` | `roxa-acai` | sem barra (decisão de design revogada) |
| Horta | `garden` | `LojaHorta.tsx` | `broto-e-grao` | sem barra (decisão de design revogada) |
| Forno | `slice` | `LojaForno.tsx` | `forno-real` | sem barra (decisão de design revogada) |
| Passarela | `mono` | `LojaPassarela.tsx` | `monarca`, `selene` | sem barra (nunca teve) |
| Feira | `fresh` | `LojaFeira.tsx` | `quintal-verde` | sem barra (nunca teve) |
| **Layout padrão** | (nenhum) | `app/loja/[slug].tsx` (ramo final) | qualquer loja sem tema/v1, loja de serviço, categoria fora do gate | só header animado + FAB de carrinho |

As 5 vitrines já importam `useTransicaoSaida` e já definem `sairPara` com a
cor de saída correta da casa (Feira: `VERDE_MATA`; Forno: `PRETO_FORNO`;
Passarela: `colors.ink`; Horta/Ritual: `colors.accent`) — a barra só PLUGA
nisso. O layout padrão ainda NÃO tem `sairPara` (o back usa `router.back()`
direto) — ver Fase F.

## 1. O padrão a replicar (já existe, 10 exemplos)

Dois moldes no repositório:

**A) Barra fixa colada na base** (Editorial `LojaEditorial.tsx:678-760`,
Artesã `LojaArtesa.tsx:1016-1069`): `position: absolute`, `left/right/bottom:
0`, `zIndex: 12`, fundo `colors.canvas` ou `colors.surface`, `borderTopWidth:
1` em `colors.line`, `paddingTop: 10`, `paddingBottom:
Math.max(insets.bottom, 12)`.

**B) Pílula flutuante** (Smash `LojaSmash.tsx:1383-1440`): `left/right: 14`,
`bottom: Math.max(insets.bottom, 12)`, `height: ALTURA_BARRA_MENU`,
`borderRadius: 999`, fio + `consumerDesign.shadow.floating`.

Comum aos dois:
- `const ALTURA_BARRA_MENU = 58` no topo do arquivo;
- `ITENS_MENU` local (convenção da casa: duplicado por arquivo, não
  compartilhado): Início `home` `/` (ativo), Explorar `reels` `/explorar`,
  Pedidos `orders` `/pedidos`, Perfil `user` `/perfil`;
- `onPress={sairPara(() => router.navigate(item.rota as never))}` — a saída
  radial já usa a cor certa da casa;
- ícone `ConsumerIcon` 20–21px, rótulo 10px, ativo vs inativo por cor e peso
  (`fontStyle(design.body, ...)`);
- padding do scroll: barra fixa → `paddingBottom: espacoFinal +
  ALTURA_BARRA_MENU + 12` (o inset já mora dentro da barra); pílula →
  `espacoFinal + ALTURA_BARRA_MENU + Math.max(insets.bottom, 12) + 12`.

Use SEMPRE tokens (`colors.*` via `useStoreDesign()`) para as paletas
alternativas repintarem sem código novo (matcha/pitaya na ritual etc.);
literais só quando forem DNA já existente no arquivo (`PRETO_FORNO`,
`VERDE_MATA`).

## 2. Fases — um lugar por fase, commit por fase

Ordem do mais simples ao mais delicado. Em cada fase: constante + `ITENS_MENU`
+ componente `BarraMenu<Nome>` + render como ÚLTIMO elemento de chrome +
ajuste do `paddingBottom` do scroll + conferir que nenhum diálogo/overlay da
vitrine fica ABAIXO da barra (diálogo de troca de loja da Passarela usa
zIndex 30 — barra fica em 12, ok).

### Fase A — Passarela (`mono`, LojaPassarela.tsx)
Molde A (barra fixa). Mundo sem cor: fundo `colors.canvas`, fio `colors.line`,
ativo em `colors.ink` peso 600, inativo `colors.inkSoft`/`inkMuted` — como a
Editorial (que é a irmã de moda), SEM accent. Zero animação (regra do
arquétipo: "zero animação contínua").

### Fase B — Feira (`fresh`, LojaFeira.tsx)
Molde A. Página clara, barra em `colors.canvas` com fio; ativo no verde da
casa (`colors.accent` — conferir se o accent do preset `fresh` é o verde-mata
ou o lima; se o accent for o LIMA, ativo em `VERDE_MATA` literal com
comentário, lima é claro demais para ícone sobre branco — verificar contraste
AA ≥ 4.5:1 do rótulo).

### Fase C — Horta (`garden`, LojaHorta.tsx)
Molde A vestido de adesivo: fundo creme (`colors.canvas`), fio e leve sombra
(eco dos botões-adesivo do arquivo, ver `horta-ui.tsx`), ativo no
verde-floresta (`colors.accent`). Atualizar o comentário do arquivo que
declara "sem barra de menu inferior".

### Fase D — Forno (`slice`, LojaForno.tsx)
Molde B (pílula flutuante) em PRETO_FORNO com fio sutil: itens inativos em
creme apagado, ativo em OURO (usar os literais de cor que o arquivo já define
para hero/cardápio). A pílula preta lê sobre os três palcos (preto/ouro/
vermelho/creme) por onde o scroll passa — mesma lógica dos botões circulares
existentes. Atualizar o comentário "sem barra de menu inferior".

### Fase E — Ritual (`ritual`, LojaRitual.tsx)
Molde B: pílula flutuante CREME (eco dos cartões flutuando no rosa — o chrome
do topo já é pill, a base espelha), itens em rosa da casa (`colors.accent`
ativo, tinta suave inativo). Cuidar do fecho: o cartão final não pode morrer
escondido atrás da pílula (padding do scroll). Atualizar os DOIS comentários
do arquivo que dizem "sem barra de menu inferior" (linhas ~37 e ~334).

### Fase F — Layout padrão (`app/loja/[slug].tsx`, ramo final)
É a rede de segurança: toda loja que NÃO cai numa vitrine de arquétipo (sem
tema, tema v1, loja de serviço com `ModalProduto`, categoria fora do gate)
usa este ramo — e hoje não tem barra nenhuma.

1. `BarraMenuPadrao` local ao arquivo, molde A em pele NEUTRA de tokens
   (`colors.surface`/`canvas`, fio `colors.line`, ativo `colors.accent`
   quando `design.themed`, senão `colors.ink`) — repinta sozinha em loja
   tematizada sem vitrine própria;
2. saída de loja com o MESMO ritual das vitrines: criar `sairPara` local via
   `useTransicaoSaida` (cor: `colors.accent` se `design.themed`, senão a cor
   padrão Mallevo) e usá-lo nos itens da barra. O `router.back()` do
   `BotaoCircular` do header fica como está;
3. `FabCarrinho` sobe: `bottom: insets.bottom + 16` vira `bottom:
   ALTURA_BARRA_MENU + Math.max(insets.bottom, 12) + 12` (o FAB flutua ACIMA
   da barra, nunca por cima dela);
4. `espacoFinal` (hoje `120 : 40`) ganha `+ ALTURA_BARRA_MENU`;
5. NÃO mexer nos ramos das vitrines de arquétipo nesta fase (cada uma tem a
   sua barra das fases A–E).

### Fase G — Garantia para arquétipos FUTUROS
O objetivo do usuário é que a barra nunca mais falte numa vitrine nova.
Duas travas:

1. **Teste-guarda** em
   `packages/lib/src/store-theme/__tests__/store-theme.test.ts` (vitest já
   roda lá): novo `describe` que lê via `fs.readdirSync`/`readFileSync` os
   arquivos `apps/mobile-consumer/components/loja/Loja*.tsx` (path relativo
   ao repo a partir do teste) e falha se algum não contiver `BarraMenu` — e
   também se `app/loja/[slug].tsx` perder `BarraMenuPadrao`. Mensagem de
   falha deve apontar este plano. Seguir o estilo dos testes vizinhos
   (comentário explicando o porquê, como o do `LARANJA_ESTOQUE`);
2. **Regra escrita**:
   - `docs/store-theme/05-aplicacao-storefront-consumer.md` §5.6: parágrafo
     de abertura ganha a regra "toda vitrine de arquétipo TEM barra de menu
     inferior própria (molde fixo ou pílula), réplica do shell vestida no
     DNA — obrigatória, coberta por teste-guarda";
   - remover os "**sem barra de menu inferior**" de ritual/horta/forno e
     registrar a barra nas 5 vitrines novas (uma linha por vitrine);
   - `.claude/napkin.md`: nota "toda loja do consumer tem barra de navegação
     — vitrines têm BarraMenu própria (molde A fixo / molde B pílula),
     layout padrão tem BarraMenuPadrao; teste-guarda em
     packages/lib store-theme.test.ts; vitrine nova SEM barra quebra o
     teste".

### Fase H — Verificação e entrega
1. Typecheck: `./packages/lib/node_modules/.bin/tsc --noEmit -p
   apps/mobile-consumer/tsconfig.json` (lint não roda aqui — eslint ausente,
   não perder tempo);
2. Testes: rodar o vitest de `packages/lib` (script `test` do package.json
   de lá) — o teste-guarda novo passa com as 15 vitrines + layout padrão;
3. QA visual em device/emulador nas 6 lojas demo da tabela do §0 + UMA loja
   sem arquétipo (qualquer loja mock que caia no layout padrão; se nenhuma
   cair, testar temporariamente removendo o theme de uma no mock — NÃO
   commitar essa mudança): barra presente, ativo correto, tocar em cada item
   sai da loja com a onda radial, PDP/diálogos abrem POR CIMA da barra, FAB
   do layout padrão flutua acima da barra, nada do fecho fica escondido;
4. Commits por fase, mensagem via `git commit -F <arquivo>` (here-string
   quebra no PowerShell). Sugestão: `fix(consumer): barra de menu na vitrine
   <nome>`, `fix(consumer): barra de menu no layout padrão de loja`,
   `test(store-theme): guarda de barra de menu por vitrine` e um final
   `docs(store-theme): barra de navegação obrigatória em toda loja`.

## 3. O que NÃO fazer

- NÃO tocar em `app/(tabs)/_layout.tsx` nem em `useImersao`;
- NÃO tocar em `storefront`, `web`, `admin`, `mobile-partner`,
  `mobile-courier` — escopo é só o mobile-consumer;
- NÃO compartilhar um componente único de barra entre vitrines (convenção da
  casa é duplicar por arquivo, cada uma vestida no DNA; o teste-guarda é a
  trava de presença, não um componente central);
- NÃO adicionar FAB de carrinho nas vitrines de arquétipo (comentário em
  `[slug].tsx` explica — a sacola do header é a porta do carrinho);
- NÃO mexer nas 10 vitrines que já têm barra;
- NÃO inventar itens novos na barra (são os 4 do shell, Início ativo).
