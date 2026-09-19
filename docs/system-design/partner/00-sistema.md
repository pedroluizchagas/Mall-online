# Mobile Partner — o sistema extraído do consumer

> **Decisão**: o app do lojista (`apps/mobile-partner`) adota, por port literal, o system design que o `mobile-consumer` consolidou entre 2026-08 e 2026-09. Este documento é a **extração** desse sistema — o que ele é, em que ordem as ideias se empilham e quais regras não se negociam — já traduzido para a superfície do lojista. O detalhe tela a tela está em [`01-telas.md`](./01-telas.md).
>
> A fonte canônica continua sendo `docs/system-design/consumer/` (tokens, ícones, primitivos, shell, status, telas). Aqui não se repete o que está lá; referencia-se.

## 1. O que o sistema é, em uma frase

**Uma fachada escura sempre acesa em cima, e um salão claro de vidro fosco embaixo.** Tudo o que está *ao vivo* mora na fachada (a **marquise**); tudo o que é *acervo* mora no salão (a **folha**). A voz é Plus Jakarta Sans, o material é vidro, o accent lima é caro.

Essa frase vale para o consumidor (o shopping visto da rua) e para o lojista (o balcão visto de dentro). O que muda é **o que está ao vivo** em cada superfície:

| | Consumer | Partner |
|---|---|---|
| Ao vivo (marquise) | pedido a caminho, posts das lojas seguidas, busca | pedidos que **pedem ação**, os números do dia, a fila operacional |
| Acervo (folha) | histórico, corredores de lojas, conta | pedidos em andamento/finalizados, módulos de gestão, galeria |
| Identidade na marquise | quem eu sou + o que é meu (seguidas, favoritos, endereços) | a loja ativa (tijolo, nome, responsável) |
| Statement | "A cidade inteira, / na sua mão." | "Sua loja, / ao vivo no shopping." |

## 2. As camadas, na ordem em que se empilham

```
6  telas          composição: TelaMarquise { marquise, folha }
5  domínio        PedidoCard (recibo) · CartaoPedidoVivo (vidro) · TijoloLoja · SeletorLoja
4  primitivos     ui/: Botao Input Card Badge Chip Skeleton EmptyState LoadingState SecaoFolha FolhaModal
3  materiais      marquise/: Marquise GlowNeon Statement Portaria MoedaVidro PlacaVidro CartaoVidro PilulaVidro · Folha VidroFosco
2  voz            useFontesMarquee (Plus Jakarta Sans 700/600/600i) · micro caps · status-pedido
1  tokens         lib/partner-design.ts (cores, raio, spacing, tipografia, motion, shadow, opacity, luz) · PartnerIcon
```

Cada camada só conhece a de baixo. Uma tela nunca desenha um letreiro por conta própria (usa `SecaoFolha`), nunca inventa um cartão (usa `CartaoFolha`/`CartaoVidro`), nunca digita hex (usa `colors.*`).

## 3. Tokens — o que veio e o que mudou

`lib/partner-design.ts` é espelho de `consumer-design.ts` ([01-tokens.md](../consumer/01-tokens.md)). Diferenças vs o `partner-design.ts` anterior:

| Eixo | Antes (partner) | Agora | Por quê |
|---|---|---|---|
| `canvas` / `canvasAlt` / `surfaceMuted` / `line` | `#F3F3F1` / `#E8E8E3` / `#ECECE9` / `#E5E5E0` (família bege) | `#F1F1F3` / `#E7E7EA` / `#ECECEF` / `#E4E4E7` (família **zinco fumê**) | casa com o `marquee #18181B` e com o painel web; a surface branca acende sobre o fumê (elevação por luminosidade) |
| família `marquee*` | não existia | `marquee`, `marqueeGlow`, `marqueeGlass`, `marqueeGlassStrong`, `marqueeLine`, `marqueeInkSoft`, `marqueeInkMuted` | o material da fachada |
| `inkGlass`, `glass*`, `accentRing` | não existiam | idem consumer | tab bar de vidro, placas claras, aro aceso |
| `splash` | `#1A4D3A` (verde da marca antiga!) | **removido** — splash JS usa `colors.marquee` | marca antiga não existe mais |
| `luz.*` | — | 7 cores da luz do dia | atmosfera da folha (fora de `colors`) |
| `spacing.tabBarHeight` | 96 | 108 | pior caso real do iPhone com a cápsula nova |
| helpers | `softColor` | + `corComAlpha`, `tempoRelativo` | fios/halos derivados; "há 3 min" |

**Regras (de [01-tokens.md §11](../consumer/01-tokens.md)):** hex literal fora do arquivo só em overlays sobre mídia, `app.json`, cor de LED da notificação e o cinza inativo da tab bar (`#6B6E75`, o mesmo do consumer).

## 4. Materiais

### 4.1 Marquise (a fachada)

`components/marquise/Marquise.tsx` — port de [07-telas.md §3](../consumer/07-telas.md) com as peças que o consumer espalhou por Início/Pedidos/Perfil/Checkout/Tracking reunidas num módulo:

| Peça | O que é | Equivalente no consumer |
|---|---|---|
| `Marquise` | `marquee` + `GlowNeon`, `paddingTop: inset + 16`, `paddingBottom: 48` (24 escondidos atrás da folha) | bloco inline de cada tela |
| `GlowNeon` | dois blobs radiais de `marqueeGlow` (22% topo-direito, 12% pé-esquerdo) | `Marquise.GlowNeon` |
| `useFontesMarquee` | `letreiro` 700 · `statement` 600 · `acento` 600 itálico, fallback de sistema | idem |
| `estiloMicroMudo` | 11/700, tracking 1.2, caps, `marqueeInkMuted` | `estilos.microMudo` |
| `Portaria` | linha do topo com slot esquerdo/direito (gutter 24) | linha "Entregar em · sino" |
| `Statement` | sobrelinha + statement (30/35 ou 24/28) com a **última linha acesa** em itálico accent + sublinha | hero da home / pedidos / checkout |
| `MoedaVidro` | 40px redonda, `marqueeGlass` + fio; `accent` = acesa; `badge` = ponto danger | voltar/telefone do tracking |
| `PlacaVidro` | ícone accent + valor 20/800 + rótulo; `alerta` = valor accent; `ativo` = fio `accentRing` | `MoedaColecao` do perfil |
| `CartaoVidro` | `marqueeGlass` + `marqueeLine`, `radius.lg` (ou `md`), padding 18; `aceso` = fio accent | cartão ao vivo, "Nada a caminho" |
| `PilulaVidro` | 34px, ícone + texto; ativa = `accent` sólido | chips do Concierge |
| `PontoAoVivo` | 7px accent respirando (`motion.pulse`), respeita reduce motion | idem |
| `BarraProgresso` | 4px `marqueeGlassStrong`, fill animado (`motion.slow × 2`) | idem |

### 4.2 Folha (o salão)

`components/marquise/Folha.tsx` + `VidroFosco.tsx` — port de [07-telas.md §3 "Folha de vidro fosco" e "Luz do dia"](../consumer/07-telas.md): `marginTop: -24`, `radius.md` no topo, `canvas`, `overflow: hidden`, nuvens SVG (sombra da fachada 7%, nuvem fria `inkSoft` 7%, fôlego `info` 4%, bloom `white` 55%, neon 5%) e, com a preferência ligada, o **véu e o sol da luz do dia** (`lib/luz-do-dia.ts`, Divinópolis, 7 quadros interpolados, ≤ 14%). O canvas nunca muda.

A preferência vive em `store/usePreferencias.ts` (chave `mallevo-partner:preferencias`) e é ligada em **Menu → Aparência → Luz do dia**.

### 4.3 TelaMarquise (a composição)

`components/marquise/TelaMarquise.tsx` junta as duas: status bar clara (só em foco nas tabs; fixa com `stack`), céu `marquee` atrás do overscroll do iOS, `ScrollView` com `RefreshControl` branco, `Marquise` + `Folha`, e a reserva de rolagem (`tabBarHeight` ou o CTA fixo).

```tsx
<TelaMarquise marquise={<>…ao vivo…</>} refreshing onRefresh>
  <SecaoFolha sobrelinha="…" titulo="…">…acervo…</SecaoFolha>
</TelaMarquise>
```

## 5. Primitivos (`components/ui/`)

Port 1:1 de [03-componentes-base.md](../consumer/03-componentes-base.md): `Botao` (5 variantes × 3 tamanhos, pílula), `Input` (`fundoEscuro` = teclado escuro + caret accent), `Card`, `Badge` (soft 18% ou preenchido), `Chip` (ink/accent vs `surfaceMuted`), `Skeleton`, `EmptyState` (claro/escuro), `LoadingState`, **`SecaoFolha` + `CartaoFolha`** (o letreiro de corredor: sobrelinha micro `inkSoft` + Jakarta 700 21; cartão `surface` **sem borda**, `radius.md`, `shadow.soft`) e **`FolhaModal`** (alça, sobrelinha, letreiro, sem fio; `fundo` surface/canvas).

Diferença única vs consumer: `Botao` não veste StoreTheme — o lojista fala sempre com a voz da casa.

### `Basicos.tsx` virou fachada

Os ~20 módulos de gestão (produtos, estoque, financeiro, minha loja…) importam `CabecalhoTela`, `Cartao`, `Legenda`, `CampoTexto`, `BotaoPrimario`, `Chip` de `components/Basicos.tsx`. A API foi mantida e a implementação trocada pelos primitivos de `ui/`: `Cartao` = `CartaoFolha` com margem, `CampoTexto` = `Input`, `BotaoPrimario` = `Botao`, `Chip` = `ui/Chip sm`. Os módulos herdaram o sistema sem reescrita.

## 6. Shell

Port de [05-shell-app.md §1](../consumer/05-shell-app.md) mantendo a régua do lojista (5 slots, Publicar central — [docs/partner-app/03](../../partner-app/03-stage-1-scaffold.md)):

- cápsula `inkGlass` + fio `marqueeLine`, `radius.pill`, altura 70, `bottom = max(inset − 16, 16)`, `shadow.floating`;
- ícone ativo accent stroke 2.2, inativo `#6B6E75` stroke 1.8, **sem labels**;
- **Publicar** = a única moeda cheia: 46px accent sólido, ícone ink; na própria rota ganha fio `accentRing`;
- badge de pedidos novos no ombro de Pedidos (accent, aro ink);
- navegação por **nome**, nunca por índice.

Auth (`(auth)/entrar`) e gates (`TelaGate`) vivem na fachada escura: quem não entrou ainda está "fora". Ao entrar, tudo vira canvas.

## 7. Iconografia

`components/PartnerIcon.tsx` = `PartnerIconName` exportado (antes o tipo era local) com os ícones do lojista (`orders` recibo, `gallery`, `menu`, `chart`, `chat`, `calendar`, `gear`, `help`, `box`, `store` com toldo) **mais** o conjunto comum do consumer (`bell`, `chevron-*`, `check*`, `close*`, `clock`, `package`, `pin`, `phone`, `tag`, `truck`, `chef`, `bag`, `info`, `edit`, `file`, `shield`, `trend`, `cash`, `users`, `external`…). Mesmas convenções: viewBox 24, stroke-only, round caps, 1.9.

Regra da casa (diretiva de 2026-09-12): moeda **monocromática** (vidro no escuro; `canvasAlt` + ícone `ink` no claro) — sem tijolo colorido por tipo, sem faísca. Accent só no ponto/rótulo de estado; o tipo fala por extenso.

## 8. Status de pedido — a versão do lojista

`lib/status-pedido.ts` segue [06-status-pedido.md](../consumer/06-status-pedido.md) (single source: cor, rótulos, descrição, ícone, progresso, ordem) com dois acréscimos de perspectiva:

| status | cor | rótulo | rótulo longo | descrição (o que fazer) | ícone | pede ação |
|---|---|---|---|---|---|---|
| `novo` | warning | Novo | Pedido novo | Aguardando sua confirmação. | `bell` | ✅ |
| `confirmado` | info | Confirmado | Confirmado | Inicie o preparo quando começar. | `check-circle` | ✅ |
| `em_preparo` | warning | Em preparo | Em preparo | Marque como pronto ao terminar. | `chef` | ✅ |
| `aguardando_entregador` | info | Aguardando coleta | Pronto para coleta | Aguardando o entregador retirar. | `package` | — |
| `saiu_para_entrega` | info | Em entrega | Saiu para entrega | A caminho do cliente. | `bike` | — |
| `entregue` | success | Entregue | Entregue | Entrega concluída. | `check-circle` | — |
| `cancelado` | danger | Cancelado | Cancelado | Pedido cancelado. | `close-circle` | — |

`pedeAcao` decide o que sobe para a marquise; `META_STATUS_LOJISTA` continua exportado como alias. Helpers: `metaDoStatus`, `ehAtivo`, `ehFinalizado`, `pedeAcao`, `progressoDoStatus`, `ORDEM_FLUXO`.

## 9. Regras que não se negociam

1. **Marquise + folha** em toda tela principal e no detalhe do pedido. Módulos de gestão (stack) seguem claros com `CabecalhoTela` — são o "corredor de serviço", não a fachada.
2. **Letreiro = `SecaoFolha`.** Nenhuma tela redesenha o rótulo de seção.
3. **Cartão claro sem borda.** Elevação por luminosidade (`surface` sobre `canvas`) + `shadow.soft`. Fio só em estado (accent/danger) ou como divisor interno (`line`).
4. **Vidro na fachada é conteúdo**, não chrome: placas, cartões, pílulas de filtro, moedas de ação. A portaria em si é nua.
5. **Lima é caro.** CTA, estado ativo, o ponto "ao vivo", a linha acesa do statement. Nunca em fundo de seção.
6. **Um hex, um lugar.** Tokens em `partner-design.ts`; `tailwind.config.js` é espelho.
7. **Status só vive em `status-pedido.ts`.**
8. **Não tocar em `apps/mobile-consumer`.** O port é one-way: consumer → partner.

## 10. O que ficou de fora (e por quê)

- **Concierge / Diretório / Fachadas / VitrineCard / Reels** — são peças do shopping visto da rua; o lojista não navega o shopping.
- **StoreTheme nas peças da casa** — o lojista não veste a pele da própria loja no app de gestão; `TijoloLoja` cai nas iniciais `ink` sobre `accent` Mallevo.
- **Transições de ambiente (SplashLoja/TransicaoMallevo)** — não há "entrar numa loja".
- **`HeaderTela` de 3 variantes** — a marquise assume o topo das principais; os módulos já tinham `CabecalhoTela`.

## 11. Verificação

```
cd apps/mobile-partner
./node_modules/typescript/bin/tsc --noEmit            # 0 erros
grep -rn "'#[0-9A-Fa-f]\{6\}'" app components lib | grep -v "partner-design\|PartnerIcon"
#  → só COR_INATIVA (tab bar) e lightColor (LED da notificação)
CI=1 npx expo export --platform android --output-dir /tmp/x   # bundle fecha
```
