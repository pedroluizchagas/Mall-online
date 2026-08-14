# 07 — Redesenho tela-a-tela

> Como cada tela é remontada usando os tokens ([01](./01-tokens.md)), ícones ([02](./02-iconografia.md)), primitivos ([03](./03-componentes-base.md)), componentes de domínio ([04](./04-componentes-dominio.md)), shell ([05](./05-shell-app.md)) e o módulo de status ([06](./06-status-pedido.md)).
>
> Cada seção descreve: **propósito**, **wireframe textual**, **estrutura final em pseudocódigo**, **mudanças vs hoje**. Não repete spec dos componentes — referencia.

## Telas cobertas

| Tela | Arquivo | Fase |
|---|---|---|
| Boas-vindas | `app/(auth)/boas-vindas.tsx` | 8 |
| Entrar | `app/(auth)/entrar.tsx` | 8 |
| Home (Início) | `app/(tabs)/index.tsx` | 4 |
| Buscar | `app/(tabs)/buscar.tsx` | 4 |
| Explorar (reels) | `app/(tabs)/explorar.tsx` | 9 |
| Seguindo | `app/(tabs)/seguindo.tsx` | 9 |
| Favoritos | `app/(tabs)/favoritos.tsx` | 9 |
| Pedidos | `app/(tabs)/pedidos.tsx` | 7 |
| Perfil | `app/(tabs)/perfil.tsx` | 8 |
| Loja | `app/loja/[slug].tsx` | 5 |
| Checkout | `app/checkout.tsx` | 6 |
| Pedido (tracking) | `app/pedido/[id].tsx` | 7 |

---

## 1. Boas-vindas (`(auth)/boas-vindas.tsx`)

### Propósito
3 slides apresentando a app antes do login.

### Wireframe alvo

```
┌─────────────────────────────┐
│        (canvas: ink)        │
│                             │
│        [hero ícone]         │  ← círculo 96x96 accentSoft, ícone (bag/store/spark) accent
│                             │
│      Título grande          │  ← display 32, weight 800, letterSpacing -0.5, white
│                             │
│   descrição centralizada    │  ← body 15, color inkSoft, max 320px
│      até 3 linhas           │
│                             │
│                             │
│      ◉ ○ ○                 │  ← dots: ativo accent (w 20), inativo lineDark (w 8)
│                             │
│     [   Próximo   ]         │  ← Botao primario lg
│        Pular                │  ← link ghost
└─────────────────────────────┘
```

### Estrutura

```tsx
<View style={{ flex: 1, backgroundColor: colors.surfaceDark }}>
  <FlatList
    horizontal pagingEnabled
    data={SLIDES}
    renderItem={({ item }) => (
      <View style={{ width, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <View style={{ width: 96, height: 96, borderRadius: radius.pill, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
          <ConsumerIcon name={item.icone} size={44} color={colors.accent} strokeWidth={1.6} />
        </View>
        <Text style={{ fontSize: 32, fontWeight: '800', color: colors.white, letterSpacing: -0.5, textAlign: 'center', marginBottom: 12 }}>
          {item.titulo}
        </Text>
        <Text style={{ fontSize: 15, color: colors.inkSoft, textAlign: 'center', lineHeight: 22, maxWidth: 320 }}>
          {item.descricao}
        </Text>
      </View>
    )}
  />

  <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
    {SLIDES.map((_, i) => (
      <View key={i} style={{
        height: 8, borderRadius: 4,
        width: i === indiceAtual ? 20 : 8,
        backgroundColor: i === indiceAtual ? colors.accent : colors.lineDark,
      }} />
    ))}
  </View>

  <View style={{ paddingHorizontal: 24, paddingBottom: 40, gap: 12 }}>
    <Botao
      label={indiceAtual < SLIDES.length - 1 ? 'Próximo' : 'Começar'}
      variante="primario"
      tamanho="lg"
      onPress={handleProximo}
    />
    {indiceAtual < SLIDES.length - 1 && (
      <Botao label="Pular" variante="ghost" tamanho="md" onPress={() => router.replace('/(auth)/entrar')} />
    )}
  </View>
</View>
```

### Conteúdo dos slides

| # | Ícone | Título | Descrição |
|---|---|---|---|
| 1 | `bag` | "Seu bairro na palma da mão" | "Peça de restaurantes, mercados e lojas locais sem sair de casa." |
| 2 | `store` | "Apoie o comércio local" | "Cada pedido fortalece um negócio da sua cidade." |
| 3 | `spark` | "Rápido e seguro" | "Pague com cartão ou Pix. Acompanhe sua entrega em tempo real." |

### Mudanças vs hoje

- Fundo `bg-creme` → `colors.surfaceDark`.
- Cada slide com cor própria (verde profundo, verde médio, ambar) → todos com **mesmo fundo dark**, ícone em `accent`. A diferença de slide vem do ícone, não da cor de fundo.
- Hero "círculo gigante com bolinha colorida dentro" (96x96 + 48x48) → ícone real do `ConsumerIcon` em círculo 96 com `accentSoft`.
- `bg-verde-profundo` no botão → `Botao variante="primario"` (accent).
- "Pular" cinza → `Botao variante="ghost"`.

---

## 2. Entrar (`(auth)/entrar.tsx`)

Já existe versão equivalente no courier (`apps/mobile-courier/app/(auth)/entrar.tsx`) que serve de gabarito direto.

### Propósito
Login (email + senha), cadastro e confirmação de email — 3 modos.

### Wireframe (modo `entrar`)

```
┌─────────────────────────────┐
│   [<]                       │  ← back se vier de boas-vindas
│                             │
│      [bag accent soft]      │  ← círculo 56x56 accentSoft, ícone bag accent
│                             │
│   Entrar como               │
│   cliente                   │  ← display 30/800/-0.5/white
│                             │
│   Acesse sua conta com      │
│   email e senha.            │  ← body 15/inkSoft/lineHeight 22
│                             │
│   EMAIL                     │
│   [   Input email    ]      │  ← Input fundoEscuro tipo="email"
│                             │
│   SENHA                     │
│   [   Input senha 👁  ]      │  ← Input fundoEscuro tipo="senha"
│                             │
│   (mensagem de erro em red)  │
│                             │
│   [    Entrar        ]      │  ← Botao primario lg
│                             │
│   Não tem conta? Criar conta│  ← texto + link em accent
└─────────────────────────────┘
```

### Estrutura

Reutilizar 1:1 a estrutura de `mobile-courier/app/(auth)/entrar.tsx` substituindo:
- `<CourierIcon>` → `<ConsumerIcon>`
- `package` → `bag`
- texto "como entregador" → "como cliente"

Os 3 modos (`entrar`, `cadastro`, `confirmar`) usam o mesmo shell visual; só muda o conteúdo do form (estes campos já existem no consumer atual). Cada modo:

- **entrar** — email + senha + botão Entrar + link "Criar conta"
- **cadastro** — nome + email + senha + botão Criar + link "Já tenho conta"
- **confirmar** — campo de código de 6 dígitos + botão Confirmar + link "Reenviar"

### Mudanças vs hoje

- Tela em `bg-creme` → `colors.surfaceDark`.
- Inputs com borda cinza → `<Input fundoEscuro>` (cinza escuro com accent quando focado).
- Botão verde profundo → `Botao primario` (accent).
- Sem hero ícone hoje → ícone `bag` em círculo accent soft.

---

## 3. Home (`(tabs)/index.tsx`)

### Propósito
Catálogo principal: header de localização, banner, categorias, lista de lojas por seção.

### Wireframe alvo

```
┌─────────────────────────────────────────┐
│ HeaderTela variante="principal"         │
│  [📍 ink/40] OLÁ, PEDRO       [bell]    │
│            Divinópolis ▼                 │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ [Search ink-soft] O que procura...  │ │  ← search pill, surface, radius pill
│ └─────────────────────────────────────┘ │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ [bike accent]  Pedido em rota       │ │  ← Card escuro, banner pedido ativo (se houver)
│ │                Saiu para entrega  ▷ │ │
│ └─────────────────────────────────────┘ │
│                                          │
│  BannerCarousel (3 banners, dark)        │
│                                          │
│  ◉ Hambúrguer   Mercado   Farmácia ...   │  ← linha horizontal de Chips
│                                          │
│  Praça de Alimentação                    │  ← h2 ink
│  Restaurantes, fast food e cafés         │  ← bodySm inkMuted
│  ┌──────┐ ┌──────┐ ┌──────┐  →           │  ← LojaCardH scroll horizontal
│  │      │ │      │ │      │              │
│                                          │
│  Essenciais do Dia a Dia                 │  ← h2
│  ...                                      │
└─────────────────────────────────────────┘
            (tab bar flutuante)
```

### Mudanças estruturais

#### "Pisos" — repensados

Hoje o home tem 5 "pisos" (Térreo, 1º…4º Piso) com:
- barrinha colorida lateral de 3px,
- nome em `fontFamily: 'serif'`,
- subcategorias (chips com emoji) ou filtros de cozinha (chips ativos).

Decisão de redesign:
- **Sai a metáfora de pisos** explícita. As seções continuam (são úteis para agrupar lojas), mas viram seções comuns com:
  - título `h2` em `ink`, sem barrinha lateral.
  - subtítulo `bodySm` em `inkMuted`.
  - **filtros e subcategorias removidos do home**. Isso vira responsabilidade da tela `buscar` (filtros de categoria) e da tela `loja` (filtros internos). O home mostra **lojas curadas**, sem ruído de filtro.
- Razão: filtros + categorias + chips de cozinha + cards de loja na mesma rolagem brigam por atenção. A cada seção, o usuário esquece o que era pra fazer. Limpa a hierarquia.

#### Header

Substitui o desenho inline pelo `<HeaderTela variante="principal">` com:
- `acaoDireita` = botão de bell (com `softColor(colors.danger)` no badge não lido)
- `aoTocarLocalizacao` = abre modal de seleção de endereço (deferido — mantém o atual stub)

#### Search

Pill `surface` com radius `pill`, ícone `search` 16 em `inkSoft`, texto placeholder `inkSoft`. Toca → `router.push('/(tabs)/buscar')`.

#### Banner de pedido ativo

Bloco já especificado em [`06-status-pedido.md` §5](./06-status-pedido.md#5-como-cada-tela-consome). Aparece sob o search se `ehAtivo(statusAtual)`.

#### Estrutura final

```tsx
<View style={{ flex: 1, backgroundColor: colors.canvas }}>
  <ScrollView contentContainerStyle={{ paddingBottom: spacing.tabBarHeight }}>
    <HeaderTela
      variante="principal"
      rotuloLocalizacao={primeiroNome ? `OLÁ, ${primeiroNome.toUpperCase()}` : 'ENTREGAR EM'}
      textoLocalizacao={cidadeAtual}
      aoTocarLocalizacao={escolherLocal}
      acaoDireita={<BotaoBell />}
    />

    <BarraBusca />                {/* TouchableOpacity pill que navega pra /buscar */}

    {ehAtivo(statusAtual) && <CardPedidoAtivo />}

    <BannerCarousel banners={BANNERS_MOCK} />

    <ChipsCategoria />            {/* horizontal scroll de Chip */}

    {SECOES.map((secao) => (
      <SecaoLojas key={secao.id} secao={secao} lojas={lojasDe(secao)} />
    ))}
  </ScrollView>
</View>
```

`<SecaoLojas>` é interno à tela. Recebe `{ titulo, subtitulo, lojas }` e renderiza:

```tsx
<View style={{ paddingTop: 28 }}>
  <View style={{ paddingHorizontal: 24, marginBottom: 14 }}>
    <Text style={typography.h2}>{titulo}</Text>
    <Text style={{ ...typography.bodySm, color: colors.inkMuted, marginTop: 2 }}>
      {subtitulo}
    </Text>
  </View>
  <ScrollView horizontal contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
    {lojas.map((loja) => (
      <LojaCardH key={loja.id} loja={loja} aoTocar={() => router.push(`/loja/${loja.slug}`)} />
    ))}
  </ScrollView>
</View>
```

### Mudanças vs hoje

| Antes | Depois |
|---|---|
| Header inline com `MapPin` em verde profundo | `<HeaderTela variante="principal">` com `pin` em `accent` sobre quadrado `ink` |
| Search com `surface` + sombra | Search pill `surface` sem sombra (visualmente mais "leve") |
| Barrinha colorida lateral 3px nos títulos | Sem barra; só `h2` |
| `fontFamily: 'serif'` | sistema, peso 800 |
| Filtros/subcategorias misturados nos pisos | Removidos do home |
| `FLOOR_METADATA` hardcoded com cores de marca antiga | Lista simples de seções (`SECOES`) — só `id`, `titulo`, `subtitulo`, regra de filtro |
| `BannerCarousel` com 3 cores hardcoded | `BannerCarousel banners={…}` com tokens |

### Manter

- Lógica de fetch (`carregarDados`, `Promise.all`).
- `RefreshControl`.
- Comportamento do bell (abre `NotificacoesPopup`).

---

## 4. Buscar (`(tabs)/buscar.tsx`)

### Propósito
Campo de busca + resultados (lojas + produtos) com debounce.

### Wireframe alvo

```
┌─────────────────────────────────────────┐
│ HeaderTela variante="voltar" titulo="Buscar"│
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ [search] termo de busca...   [×]   │ │  ← Input padrão com clearable
│ └─────────────────────────────────────┘ │
│                                          │
│ Categorias                               │  ← h3
│  ◯ Todos  ◯ Restaurantes  ◯ Mercado ... │  ← Chips horizontais
│                                          │
│ Lojas                                    │  ← label uppercase
│  ┌─────────────────────────────────┐   │
│  │ LojaCard                         │   │
│  └─────────────────────────────────┘   │
│  ...                                     │
│                                          │
│ Produtos                                 │  ← label uppercase
│  ┌─────────────────────────────────┐   │
│  │ ProdutoCard variante="lista"     │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Estrutura

```tsx
<View style={{ flex: 1, backgroundColor: colors.canvas }}>
  <HeaderTela variante="voltar" titulo="Buscar" />

  <View style={{ paddingHorizontal: 24 }}>
    <Input
      valor={termo}
      aoMudar={onChange}            // já com debounce dentro
      iconeEsquerda="search"
      placeholder="Lojas, produtos, categorias..."
      autoFocus
      acessorioDireita={termo ? <BotaoLimpar /> : null}
    />
  </View>

  {/* Categorias (chips de filtro de tipo) */}
  <ScrollView horizontal contentContainerStyle={{ paddingHorizontal: 24, gap: 8, paddingTop: 20 }}>
    {CATEGORIAS.map((c) => (
      <Chip key={c.id} rotulo={c.nome} ativo={categoriaAtiva === c.id} aoTocar={() => setCategoriaAtiva(c.id)} />
    ))}
  </ScrollView>

  {buscando && <LoadingState altura={120} />}

  {!buscando && resultadosLojas.length > 0 && (
    <Secao titulo="Lojas">
      {resultadosLojas.map((loja) => <LojaCard key={loja.id} loja={loja} aoTocar={...} />)}
    </Secao>
  )}

  {!buscando && resultadosProdutos.length > 0 && (
    <Secao titulo="Produtos">
      {resultadosProdutos.map((p) => <ProdutoCard key={p.id} produto={p} aoTocar={...} />)}
    </Secao>
  )}

  {!buscando && termo.length >= 2 && resultadosLojas.length === 0 && resultadosProdutos.length === 0 && (
    <EmptyState
      icone="search"
      titulo="Nada encontrado"
      descricao="Tente buscar por outra loja, produto ou categoria."
    />
  )}
</View>
```

### Mudanças vs hoje

| Antes | Depois |
|---|---|
| Header sem voltar | `HeaderTela variante="voltar"` |
| TextInput com classes Tailwind | `<Input>` |
| Sem chips de categoria | Chips de filtro de tipo (Todos / Lojas / Produtos / categoria) |
| Empty state texto solto | `<EmptyState>` |

---

## 5. Explorar — reels (`(tabs)/explorar.tsx`)

### Propósito
TikTok-style vertical scroll de vídeos das lojas.

### Decisão de design (já travada)
Manter base **dark fullscreen** (vídeos exigem). Realinhar **accents** (eram âmbar) para `accent` lime. Padronizar overlays e ações.

### Mudanças

| Item | Antes | Depois |
|---|---|---|
| Background da tela | `#080806` | `colors.ink` (`#111216`) |
| Botão "Comprar" (right column) | âmbar `#D4A04A` | `colors.accent` lime, ícone `bag` em `colors.ink` |
| Coração (curtir) | `coral #C75B3A` | `colors.danger` (`#FF6D5E` — não muda muito, mas vira token) |
| Ícone send (compartilhar) | branco | `colors.white` (sem mudança, mas via token) |
| Sound on/off | branco | `colors.white` |
| Avatar da loja (round) | inicial em cor derivada | inicial branca em círculo `colors.accent` quando focado, `colors.surfaceDarkSoft` quando não |
| Tag "Seguir" | branco translúcido | `colors.accent` strokeWidth 1, fundo transparente, texto `accent` |
| Texto/descrição com text-shadow | mantém (sobre vídeo é necessário) | mantém |
| Lucide icons | substituir todos por `<ConsumerIcon>` |

### Estrutura final (resumo)

```tsx
<View style={{ flex: 1, backgroundColor: colors.ink }}>
  <StatusBar style="light" />
  <FlatList vertical pagingEnabled data={REELS} renderItem={({ item }) => (
    <ReelItem reel={item} ativo={...} />
  )} />
</View>
```

`ReelItem`:
```tsx
<View style={{ width: W, height: H }}>
  <VideoView ... />
  <Gradient bottom 40% black-to-transparent />

  {/* Coluna direita */}
  <View style={{ position: 'absolute', right: 16, bottom: 120, alignItems: 'center', gap: 20 }}>
    <BotaoSomReel />          {/* volume / volume-off */}
    <BotaoCurtirReel />        {/* heart, count */}
    <BotaoComentarReel />      {/* comment, count */}
    <BotaoCompartilharReel />  {/* send */}
    <BotaoComprarReel />       {/* bag em accent */}
  </View>

  {/* Bloco inferior esquerdo */}
  <View style={{ position: 'absolute', left: 16, right: 80, bottom: 120 }}>
    <AvatarLoja />
    <Text style={{ color: colors.white, fontSize: 16, fontWeight: 700 }}>
      {reel.loja_nome}
    </Text>
    <Text style={{ color: colors.white, marginTop: 4, lineHeight: 19 }}>
      {reel.descricao}
    </Text>
    <ChipsTag tags={reel.tags} />
    {reel.produto && <BotaoVerProduto produto={reel.produto} />}
  </View>
</View>
```

### Mudanças vs hoje (resumo)

- Eliminação dos hex literais (todas as cores via tokens).
- Substituição de **todos** os ícones lucide.
- Botão "Comprar" passa a ser `<Botao variante="primario" tamanho="sm" iconeEsquerda="bag" />` em vez de pílula âmbar inline.

> Reels é o último PR (Fase 9) porque tem o maior volume de inline styles.

### Modo comentários (o "ao vivo")

Tocar no ícone de comentários não abre folha nem empurra o vídeo: o reel **muda de modo**. É a mesma tela, reorganizada em torno da conversa.

O que acontece ao abrir:

| Elemento | No reel | No modo comentários |
|---|---|---|
| Barra de navegação | visível | recolhe (`useImersao`) — o rodapé é da caixa de escrever |
| Rolagem do feed | troca de reel | **travada** (`scrollEnabled={false}`) |
| Coluna de informação | loja · descrição · produto | **descrição · produto · loja** |
| Comentários | — | stream ao vivo acima da informação |
| Coluna de ações | visível | visível (curtir sem sair da conversa) |

**Por que a ordem inverte.** No reel, a primeira pergunta é "de quem é isso?" — daí a loja no topo. Lendo comentários, a loja vira o rodapé da conversa: quem responde é ela, e o nome precisa estar colado na caixa de escrever, não a três blocos de distância. Descrição e preço sobem porque viram contexto do que se está lendo, não chamada.

As peças são **as mesmas** (`components/explorar/InfoPost.tsx`), montadas em outra ordem — nunca markup duplicado, senão os dois modos divergem no primeiro ajuste de estilo.

**O stream.** Sem balão e sem fundo: só texto branco com sombra (`SOMBRA_TEXTO`), porque fundo sólido sobre vídeo sujaria a imagem e caixa de comentário não é o assunto — o vídeo é. Regras:

- entra **um por vez** (`RITMO_MS = 2000`), por baixo, empurrando os anteriores para cima;
- no máximo 5 linhas simultâneas, esmaecendo com a idade (`1 → 0.78 → 0.55 → 0.32`), que é o que dá a leitura de "ao vivo" em vez de lista;
- resposta da loja aparece em accent, com ícone `store` e o rótulo "respondeu você";
- cada linha corta em 3 linhas de texto — cinco comentários longos empilhados cobririam o vídeo inteiro.
- a caixa **não** abre com o teclado: ao tocar em comentários se quer primeiro ler o que está rolando. Escrever é o toque seguinte.

### O laço da resposta

```
usuário comenta ──► useComentarios.comentar()
                     ├─ registra o comentário (AsyncStorage)
                     └─ agenda a resposta da loja (5,2 s)
                             ├─ entra no stream, se ainda estiver aberto
                             └─ useNotificacoes.adicionar() ──► sino da home
```

O agendamento vive **no store, fora do React** — não em `useEffect` de componente. É o que torna a promessa verdadeira: o usuário comenta, sai do Explorar, e a resposta chega mesmo assim. Um backend real troca o `setTimeout` por um canal realtime escrevendo no mesmo lugar; a UI não muda. Um post não acumula respostas pendentes (`Set` de controle), senão comentar três vezes viraria uma salva de notificações.

### Dados dos comentários

Não existe `post_comments` no schema — a view publica só o **contador**. `lib/comentarios.ts` gera um conjunto plausível e **estável** por post (mesmo id → mesmos autores, entre boots) e guarda as falas de resposta da loja. `store/useComentarios.ts` persiste só o que nasceu da interação. Quando a tabela existir, mudam essas duas funções e nada mais.

O contador do ícone soma o que foi escrito no app ao número da view — mesmo otimismo do coração.

---

## 6. Pedidos (`(tabs)/pedidos.tsx`)

### Propósito
Lista de pedidos do usuário com filtro por status (todos / ativos / histórico).

### Wireframe alvo

```
┌─────────────────────────────────────────┐
│ HeaderTela variante="simples"           │
│  Meus pedidos                           │
│                                          │
│  ◉ Todos  ○ Ativos  ○ Histórico         │  ← Chips de filtro
│                                          │
│  Ativos                                  │  ← label uppercase (só se houver)
│  ┌──────────────────────────────────┐  │
│  │ PedidoCard escuro                 │  │
│  └──────────────────────────────────┘  │
│                                          │
│  Histórico                               │  ← label uppercase
│  ┌──────────────────────────────────┐  │
│  │ PedidoCard claro                  │  │
│  └──────────────────────────────────┘  │
│  ...                                     │
└─────────────────────────────────────────┘
```

### Estrutura

```tsx
<View style={{ flex: 1, backgroundColor: colors.canvas }}>
  <HeaderTela variante="simples" titulo="Meus pedidos" />

  <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 24, paddingBottom: 16 }}>
    <Chip rotulo="Todos" ativo={filtro === 'todos'} aoTocar={() => setFiltro('todos')} />
    <Chip rotulo="Ativos" ativo={filtro === 'ativos'} aoTocar={() => setFiltro('ativos')} />
    <Chip rotulo="Histórico" ativo={filtro === 'historico'} aoTocar={() => setFiltro('historico')} />
  </View>

  {carregando ? (
    <LoadingState altura={200} />
  ) : pedidosFiltrados.length === 0 ? (
    <EmptyState
      icone="orders"
      titulo="Nada por aqui"
      descricao="Quando você fizer um pedido, ele aparece nesta lista."
      acao={{ label: 'Explorar lojas', aoTocar: () => router.push('/(tabs)') }}
    />
  ) : (
    <FlatList
      data={pedidosFiltrados}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: spacing.tabBarHeight, gap: 12 }}
      renderItem={({ item }) => (
        <PedidoCard pedido={item} aoTocar={() => router.push(`/pedido/${item.id}`)} />
      )}
      ItemSeparatorComponent={null}
      refreshControl={<RefreshControl ... />}
    />
  )}
</View>
```

### Mudanças vs hoje

- `LABELS_STATUS`/`CORES_STATUS`/`PROGRESSO_STATUS` locais → consumo via `metaDoStatus()` em `<PedidoCard>`.
- Filtros como botões custom → `<Chip>`.
- Empty state custom → `<EmptyState>`.
- `PackageSearch` lucide → `orders` ConsumerIcon.

---

## 7. Perfil (`(tabs)/perfil.tsx`)

### Propósito
Avatar + nome + lista de seções (endereços, editar, pedidos, documentos, segurança, sair).

### Wireframe alvo

```
┌─────────────────────────────────────────┐
│ HeaderTela variante="simples"           │
│  Perfil                       [edit]    │
│                                          │
│ ┌──────────────────────────────────┐  │
│ │ [P]   Pedro Chagas                │  │  ← Card escuro de identidade
│ │       pedro@email.com             │  │
│ └──────────────────────────────────┘  │
│                                          │
│ CONTA                                    │  ← label uppercase
│ ┌──────────────────────────────────┐  │
│ │ [pin] Endereços          (3)  ▷  │  │
│ │ [edit] Editar perfil          ▷  │  │
│ │ [orders] Meus pedidos         ▷  │  │
│ └──────────────────────────────────┘  │
│                                          │
│ AJUDA                                    │
│ ┌──────────────────────────────────┐  │
│ │ [file] Termos                  ▷  │  │
│ │ [shield] Privacidade           ▷  │  │
│ └──────────────────────────────────┘  │
│                                          │
│ [   Sair da conta   ]                   │  ← Botao danger
└─────────────────────────────────────────┘
```

### Estrutura

```tsx
<ScrollView style={{ flex: 1, backgroundColor: colors.canvas }} contentContainerStyle={{ paddingBottom: spacing.tabBarHeight }}>
  <HeaderTela variante="simples" titulo="Perfil" />

  <View style={{ paddingHorizontal: 16 }}>
    <Card variante="escuro" raio="lg" preenchimento="lg">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View style={{ width: 56, height: 56, borderRadius: radius.pill, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>{primeiraLetra}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.white }}>{nomeExibido}</Text>
          <Text style={{ fontSize: 13, color: colors.inkSoft, marginTop: 2 }}>{user?.email}</Text>
        </View>
      </View>
    </Card>
  </View>

  <Secao titulo="CONTA">
    <ItemPerfil icone="pin" rotulo="Endereços" badge={qtdEnderecos} aoTocar={() => abrirEnderecos()} />
    <ItemPerfil icone="edit" rotulo="Editar perfil" aoTocar={() => abrirEditar()} />
    <ItemPerfil icone="orders" rotulo="Meus pedidos" aoTocar={() => router.push('/(tabs)/pedidos')} />
  </Secao>

  <Secao titulo="AJUDA">
    <ItemPerfil icone="file" rotulo="Termos de uso" aoTocar={...} />
    <ItemPerfil icone="shield" rotulo="Privacidade" aoTocar={...} />
  </Secao>

  <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
    <Botao label="Sair da conta" variante="danger" tamanho="md" iconeEsquerda="logout" onPress={handleSair} />
  </View>
</ScrollView>
```

`<ItemPerfil>` (interno à tela):
```tsx
<TouchableOpacity onPress={aoTocar} activeOpacity={0.75} style={{
  flexDirection: 'row', alignItems: 'center', gap: 12,
  paddingVertical: 14, paddingHorizontal: 16,
  borderBottomWidth: 1, borderBottomColor: colors.line,
}}>
  <View style={{ width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.canvasAlt, alignItems: 'center', justifyContent: 'center' }}>
    <ConsumerIcon name={icone} size={18} color={colors.ink} />
  </View>
  <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.ink }}>{rotulo}</Text>
  {badge !== undefined && (
    <Text style={{ fontSize: 13, color: colors.inkMuted }}>({badge})</Text>
  )}
  <ConsumerIcon name="chevron-right" size={16} color={colors.inkSoft} />
</TouchableOpacity>
```

### Mudanças vs hoje

- Avatar `bg-verde-profundo` com inicial → quadrado `accent` com inicial em `ink`, dentro de Card escuro de identidade.
- Ícones lucide (`Edit3`, `MapPin`, `ClipboardList`, `FileText`, `Shield`, `LogOut`) → `ConsumerIcon`.
- Botão "Sair" texto vermelho linkado → `Botao variante="danger"` real.
- Seções inline → componente local `<Secao>` simples (label + lista).
- `EditarPerfil` e `GerenciarEnderecos` aparecem **em modais bottom-sheet** (vez de empurrar a tela). Refactor desses 2 componentes detalhado em [`04-componentes-dominio.md` §12](./04-componentes-dominio.md#12-editarperfil-e-gerenciarenderecos).

---

## 8. Loja (`loja/[slug].tsx`)

### Propósito
Detalhe da loja: header animado, lista de produtos por categoria, botão flutuante de carrinho.

### Wireframe alvo

```
┌─────────────────────────────────────────┐
│  ← (header transparente, fade no scroll)│
│                                          │
│   [BANNER da loja, h: 200]               │
│                                          │
│   Burguer do Bairro                      │  ← display 28
│   Hambúrguer artesanal                   │  ← bodyLg inkMuted
│                                          │
│   ⏱ 25-35 min · 🚚 R$ 4,90 · ◉ Aberto   │  ← linha de meta com ícones
│                                          │
│ ─────────────────────────────────────── │
│   Burgers                                │  ← h3
│   ┌──────────────────────────────────┐  │
│   │ ProdutoCard variante="lista"      │  │
│   └──────────────────────────────────┘  │
│   ...                                    │
│                                          │
│   Bebidas                                │
│   ...                                    │
└─────────────────────────────────────────┘
                              ┌──────────┐
                              │ 🛒  3    │   ← FAB carrinho (accent), só se totalItens > 0
                              └──────────┘
```

### Estrutura

```tsx
<View style={{ flex: 1, backgroundColor: colors.canvas }}>
  <Animated.ScrollView
    onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
    scrollEventThrottle={16}
    contentContainerStyle={{ paddingBottom: 120 }}
  >
    <BannerLoja loja={loja} />              {/* h: 200, imagem ou placeholder dark */}
    <CabecalhoLoja loja={loja} />            {/* nome, descricao, meta */}

    {secoes.map((s) => (
      <SecaoCardapio key={s.title} secao={s}>
        {s.data.map((produto) => (
          <ProdutoCard key={produto.id} produto={produto} aoTocar={() => abrirModal(produto)} />
        ))}
      </SecaoCardapio>
    ))}
  </Animated.ScrollView>

  {/* Header animado: começa transparente, vira surface ao rolar */}
  <HeaderAnimado scrollY={scrollY} titulo={loja.nome} />

  {/* FAB carrinho */}
  {totalItens > 0 && <FabCarrinho total={total} qtd={totalItens} aoTocar={() => router.push('/checkout')} />}

  <ModalProduto visivel={!!produtoSelecionado} produto={produtoSelecionado} aoFechar={...} />
</View>
```

### `HeaderAnimado` (interno)

- Range de animação: `scrollY` 0 → 120 mapeia opacidade do header de 0 → 1.
- Bg interpola `transparent` → `colors.surface`.
- Texto do título aparece no fim (opacidade 0 → 1, mesma curva).
- Botão back sempre visível (white background quando transparente, surface quando preenchido).

### `FabCarrinho`

```tsx
<TouchableOpacity
  onPress={aoTocar}
  activeOpacity={0.85}
  style={{
    position: 'absolute', bottom: 24, right: 16,
    height: 56, paddingHorizontal: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    ...shadow.floating,
  }}
>
  <ConsumerIcon name="bag" size={20} color={colors.ink} strokeWidth={2.1} />
  <Text style={{ fontSize: 15, fontWeight: '800', color: colors.ink }}>
    {qtd} {qtd === 1 ? 'item' : 'itens'} · {formatarReais(total)}
  </Text>
</TouchableOpacity>
```

### Mudanças vs hoje

- ProdutoCard inline → `<ProdutoCard>`.
- Header animado com cor verde profundo → animação para `surface` (fundo claro do app).
- FAB de carrinho hoje minúsculo (24x24) → CTA pílula com texto "3 itens · R$ 47,80" em `accent`.
- `fontFamily: 'serif'` nas seções → 800 ink.
- Skeleton ainda usa o componente — refatorado pra novo `Skeleton` base.

---

## 9. Checkout (`checkout.tsx`)

### Propósito
Revisão do carrinho + endereço + pagamento + observações + botão fazer pedido.

### Wireframe alvo

```
┌─────────────────────────────────────────┐
│ HeaderTela variante="voltar"            │
│  ← Finalizar pedido                     │
│                                          │
│  Burguer do Bairro                       │  ← h3 nome da loja
│                                          │
│  SEUS ITENS                              │
│  ┌──────────────────────────────────┐  │
│  │ ItemCarrinhoCard                  │  │
│  │ ItemCarrinhoCard                  │  │
│  └──────────────────────────────────┘  │
│                                          │
│  SeletorEndereco                         │
│                                          │
│  SeletorPagamento                        │
│                                          │
│  Observações                             │
│  ┌──────────────────────────────────┐  │
│  │ Input multilinha                  │  │
│  └──────────────────────────────────┘  │
│                                          │
│  Subtotal               R$ 38,90         │
│  Entrega                R$  4,90         │
│  ─────────────────────────────           │
│  TOTAL                  R$ 43,80         │
│                                          │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  [   Fazer pedido — R$ 43,80    ]      │  ← Botao primario fixo no fundo
└─────────────────────────────────────────┘
```

### Estrutura

```tsx
<View style={{ flex: 1, backgroundColor: colors.canvas }}>
  <HeaderTela variante="voltar" titulo="Finalizar pedido" />

  <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
    <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink, paddingHorizontal: 24 }}>
      {store_nome}
    </Text>

    <Secao titulo="SEUS ITENS">
      <Card preenchimento="sm">
        {itens.map((item) => <ItemCarrinhoCard key={item.product_id} item={item} />)}
      </Card>
    </Secao>

    <SeletorEndereco
      enderecoSelecionado={enderecoSelecionado}
      enderecos={consumer?.enderecos ?? []}
      aoSelecionar={setEnderecoSelecionado}
      aoAdicionar={salvarEndereco}
    />

    <SeletorPagamento
      metodoSelecionado={formaPagamento}
      aoSelecionar={setFormaPagamento}
    />

    {formaPagamento === 'dinheiro' && (
      <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
        <Input
          rotulo="Troco para"
          tipo="numero"
          valor={trocoPara}
          aoMudar={setTrocoPara}
          placeholder="R$ 50,00"
        />
      </View>
    )}

    <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
      <Input
        rotulo="Observações"
        valor={observacoes}
        aoMudar={setObservacoes}
        multilinha
        placeholder="Ex.: tirar a cebola, deixar na portaria..."
      />
    </View>

    <ResumoPreco subtotal={subtotal} entrega={store_taxa_entrega} total={total} />
  </ScrollView>

  <BotaoFixo>
    <Botao
      label={`Fazer pedido — ${formatarReais(total)}`}
      variante="primario"
      tamanho="lg"
      iconeDireita="check"
      carregando={processando}
      onPress={handleFazerPedido}
    />
  </BotaoFixo>

  {processando && <LoadingState modo="tela" variante="escuro" mensagem="Processando pagamento" />}
</View>
```

`<BotaoFixo>` (interno):
```tsx
<View style={{
  position: 'absolute', bottom: 0, left: 0, right: 0,
  backgroundColor: colors.surface,
  borderTopWidth: 1, borderTopColor: colors.line,
  paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12,
}}>
  {children}
</View>
```

`<ResumoPreco>` (interno):
```tsx
<View style={{ paddingHorizontal: 24, paddingTop: 24, gap: 8 }}>
  <LinhaResumo rotulo="Subtotal" valor={formatarReais(subtotal)} />
  <LinhaResumo rotulo="Entrega" valor={entrega === 0 ? 'Grátis' : formatarReais(entrega)} />
  <View style={{ height: 1, backgroundColor: colors.line, marginVertical: 8 }} />
  <LinhaResumo rotulo="Total" valor={formatarReais(total)} destacado />
</View>
```

### Stripe — appearance

A integração com Stripe Payment Sheet recebe um objeto `appearance`. Atualizar:

```tsx
appearance: {
  colors: {
    primary: consumerDesign.colors.accent,
    background: consumerDesign.colors.canvas,
    componentBackground: consumerDesign.colors.surface,
    componentBorder: consumerDesign.colors.line,
    componentText: consumerDesign.colors.ink,
    primaryText: consumerDesign.colors.ink,
    secondaryText: consumerDesign.colors.inkMuted,
    placeholderText: consumerDesign.colors.inkSoft,
    icon: consumerDesign.colors.ink,
  },
  shapes: {
    borderRadius: 14, // radius.sm
  },
}
```

### Mudanças vs hoje

- TextInput de troco/observações inline → `<Input>`.
- Botão "Fazer pedido" inline grande verde profundo → `<Botao variante="primario">` no `<BotaoFixo>`.
- Loading full-screen com Lottie cinza → `<LoadingState modo="tela" variante="escuro">`.
- Stripe appearance com `#1A4D3A` → tokens.

---

## 10. Pedido — tracking (`pedido/[id].tsx`)

### Propósito
Acompanhar pedido: timeline de status, mapa do entregador (se em rota), itens, contatos.

### Wireframe alvo

```
┌─────────────────────────────────────────┐
│ HeaderTela variante="voltar"            │
│  ← Acompanhamento                       │
│                                          │
│ ┌──────────────────────────────────┐   │
│ │  [chef accent]                    │   │  ← Card escuro de status atual
│ │   EM PREPARO                       │   │
│ │   Seu pedido está sendo preparado.│   │
│ └──────────────────────────────────┘   │
│                                          │
│ Timeline:                                │
│  ✓ Pedido recebido                       │  ← concluido (accent + check)
│  ✓ Confirmado                            │
│  ● Em preparo (atual, com pulse)         │
│  ○ Aguardando entregador                 │
│  ○ Saiu para entrega                     │
│  ○ Entregue                              │
│                                          │
│ ┌──────────────────────────────────┐   │
│ │  [Mapa h: 240]                    │   │  ← só se status === 'saiu_para_entrega'
│ └──────────────────────────────────┘   │
│                                          │
│ ENTREGADOR                               │
│ ┌──────────────────────────────────┐   │
│ │ João da Silva    [phone] [chat]  │   │
│ └──────────────────────────────────┘   │
│                                          │
│ ITENS                                    │
│ ┌──────────────────────────────────┐   │
│ │ ItemCarrinhoCard (read-only)      │   │
│ └──────────────────────────────────┘   │
│                                          │
│ Subtotal · Entrega · Total               │
└─────────────────────────────────────────┘
```

### Estrutura

```tsx
<View style={{ flex: 1, backgroundColor: colors.canvas }}>
  <HeaderTela variante="voltar" titulo="Acompanhamento" />

  <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
    <View style={{ paddingHorizontal: 16 }}>
      <Card variante="escuro" raio="lg" preenchimento="lg">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <CirculoIconeStatus meta={meta} />
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.label, color: colors.inkSoft }}>{meta.rotuloLongo.toUpperCase()}</Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.white, marginTop: 4 }}>
              {meta.rotuloLongo}
            </Text>
            <Text style={{ fontSize: 14, color: colors.inkSoft, marginTop: 4, lineHeight: 20 }}>
              {meta.descricao}
            </Text>
          </View>
        </View>
      </Card>
    </View>

    <TimelinePedido statusAtual={statusAtual} />

    {statusAtual === 'saiu_para_entrega' && courierLocalizacao && (
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <Card preenchimento="sm" semBorda>
          <MapaEntregador localizacao={courierLocalizacao} enderecoEntrega={pedido.endereco} />
        </Card>
      </View>
    )}

    {pedido.delivery_assignments?.[0] && <BlocoEntregador entregador={...} />}

    <Secao titulo="ITENS">
      <Card preenchimento="sm">
        {pedido.order_items.map((item) => <ItemCarrinhoCard key={item.product_id} item={item} readonly />)}
      </Card>
    </Secao>

    <ResumoPreco subtotal={pedido.subtotal} entrega={pedido.taxa_entrega} total={pedido.total} />
  </ScrollView>
</View>
```

`<TimelinePedido>` consome `timelineDoStatus(statusAtual)` e renderiza conforme [`06-status-pedido.md` §5](./06-status-pedido.md#5-como-cada-tela-consome).

### Mudanças vs hoje

- `LABELS_STATUS`/`DESCRICAO_STATUS`/`ORDEM_STATUS` locais → `metaDoStatus()`/`timelineDoStatus()`.
- Card de status atual com cor de status → Card escuro com ícone em `softColor(meta.cor)`.
- Mapa do entregador com `pinColor: '#1A4D3A'` → tokens.
- `ItemCarrinhoCard` ganha prop `readonly` (boolean) que oculta botões `+`/`-`.

---

## 11. Seguindo (`(tabs)/seguindo.tsx`)

### Propósito

O Explorar é descoberta: feed de todas as lojas, tela cheia, som ligado, algoritmo do shopping. **Seguindo é curadoria**: só as lojas que o usuário escolheu, em ordem cronológica, som mudo por padrão. Uma tela existe para achar o que não se conhece; a outra, para não perder o que já se ama.

### Como se chega

1. **Perfil → "Lojas que sigo"** (com contador) — caminho descoberto por leitura.
2. **Atalho do Início** — 1 toque no slot do Início alterna para cá, 2 toques voltam ([`05-shell-app.md` §1](./05-shell-app.md#atalho-do-início--seguindo)). Caminho de repetição, para quem já usa.

### Wireframe

```
┌──────────────────────────────────┐
│ ‹   Seguindo              🔍     │  HeaderTela variante="voltar"
├──────────────────────────────────┤
│ (◯)  (◯)  (◯)  (◯)  (+)          │  RailSeguindo — anel accent + Descobrir
│ Café  Barb  Ateliê  Pet  Descob   │  toque longo = deixar de seguir
├──────────────────────────────────┤
│ ┌──────────────────────────────┐ │
│ │ (◯) Café Aroma      [Seguindo]│ │  cabeçalho: avatar, nome, "2 h"
│ │     2 h                       │ │
│ │ ┌──────────────────────────┐  │ │
│ │ │      mídia 4:5           │  │ │  vídeo toca só no card mais visível
│ │ │      🔇 / 28s            │  │ │  toque duplo curte
│ │ └──────────────────────────┘  │ │
│ │ ♥ 623   💬 51   ➤     [🛍 R$ 9,90]│ │
│ │ **Café Aroma** Lote novo do…  │ │
│ │ #cafe #torraartesanal         │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

### Uma superfície, duas perguntas

Nada de segmentado "Feed | Lojas": abas empurram o conteúdo para baixo e obrigam a escolher antes de ver qualquer coisa. As duas perguntas convivem na mesma rolagem — o **rail** responde "quem eu sigo", o **feed** responde "o que publicaram".

Consequência assumida: gerenciar quem se segue perde a lista dedicada. O unfollow vive em dois lugares — o botão "Seguindo" no cabeçalho de cada card e o **toque longo no avatar do rail** (com `Alert` de confirmação), que é a única saída para uma loja que ainda não publicou nada.

### Dados

- Mesma view do Explorar (`public_explore_feed`), filtrada por `.in('loja_slug', seguidas)`, mesma paginação keyset por `publicado_em`. Contrato compartilhado em `lib/posts.ts` — **não duplicar o tipo nem o mapeamento na tela**.
- Nome e logo das lojas vêm de um `select` em `stores` com `.in('slug', ...)`; a tela funciona sem eles (cai na inicial sobre `ink`).
- Quem segue o quê: `store/useSeguidas.ts` (zustand + AsyncStorage). **Local por ora** — não existe `store_follows` no schema. Quando existir, o store vira cache otimista e a UI não muda.

### Regras de comportamento

- **Remover não recarrega.** Se o conjunto seguido só perdeu slugs, a tela filtra os posts em memória em vez de refazer o fetch: deixar de seguir no meio da rolagem não pode jogar o usuário de volta ao topo. Só adição dispara recarga.
- **Vídeo toca em um card só** (o mais visível, `itemVisiblePercentThreshold: 60`) e pausa ao sair da aba (`useFocusEffect`).
- **Mudo por padrão** (`mutado` inicia `true`), ao contrário do Explorar: feed de card se lê rolando, não assistindo.
- **Mídia 4:5, não 9:16.** Reel inteiro tomaria a tela e apagaria a diferença entre as duas telas.
- Três estados vazios distintos: sem hidratar (esqueleto), sem seguir ninguém (`EmptyState` + CTA Explorar), seguindo mas sem posts ("Nada novo por aqui").

### Componentes

| Componente | Papel |
|---|---|
| `components/BotaoSeguir.tsx` | único ponto de escrita em `useSeguidas`; peles `reel` (sobre vídeo) e `claro` (sobre surface) |
| `components/seguindo/CardPost.tsx` | card do feed + `Avatar` (logo ou inicial) |
| `components/seguindo/RailSeguindo.tsx` | trilho horizontal das lojas seguidas + item "Descobrir" |

### Pendências assumidas

- Comentários são **contador, não botão** — não existe tela de comentários (igual ao Explorar).
- Compartilhar usa `Share` nativo com texto; ganha deep link quando o post tiver URL pública.

---

## 12. Favoritos (`(tabs)/favoritos.tsx`)

### Propósito

**Curtir é favoritar.** O coração do Explorar e do card de Seguindo não incrementa um contador efêmero: ele guarda o post aqui. Fundir "curtir" e "salvar" numa ação só é decisão de produto — num app de shopping, duas ações parecidas na mesma barra de ícones só criariam dúvida sobre qual usar.

### Como se chega

1. **Perfil → "Favoritos"** (com contador).
2. **Atalho da barra** — 1 toque no slot de Pedidos alterna para cá, 2 voltam ([`05-shell-app.md` §1](./05-shell-app.md#slots-com-atalho-início--seguindo-pedidos--favoritos)).

### Wireframe

```
┌──────────────────────────────────┐
│ ‹   Favoritos             🔍     │  HeaderTela variante="voltar"
├──────────────────────────────────┤
│ ┌────────────┐  ┌────────────┐   │  grade 2×, tile 4:5
│ │♥        ▶ │  │♥           │   │  ♥ aceso = salvo · ▶ = vídeo
│ │            │  │            │   │
│ │ [R$ 32,90] │  │            │   │  preço só quando há produto
│ │ Burger Ho… │  │ Ateliê Ca… │   │
│ │ 2 d        │  │ 3 d        │   │
│ └────────────┘  └────────────┘   │
│  Toque longo para remover.       │
└──────────────────────────────────┘
```

### Grade, não feed

Seguindo já é uma coluna de cards para **ler**; repetir o formato aqui daria duas telas iguais com conteúdos diferentes. De uma coleção se quer bater o olho e **reconhecer** — daí a grade 2×, mídia grande, nome da loja e preço. Mesma proporção 4:5 da mídia do card, para a coleção parecer a mesma biblioteca vista de longe.

- **Toque abre a loja** (`/loja/[slug]`): é onde a curtida vira compra, e não existe tela de detalhe de post.
- **Toque longo remove**, com `Alert` — mesmo gesto do rail de Seguindo. O coração do tile é selo de estado, não botão: se fosse botão, competiria com o toque que abre a loja.

### Dados — por que guardar o post inteiro

`store/useFavoritos.ts` (zustand + AsyncStorage) persiste o **snapshot completo do post**, não só o id:

- a tela abre instantânea e funciona offline;
- post despublicado pelo lojista não abre buraco na coleção de quem salvou;
- `public_explore_feed` não garante que um id continue existindo.

O snapshot envelhece (preço, contadores), então a tela refresca em segundo plano o que ainda está no ar — `carregarPosts({ ids })` → `atualizarSnapshots()`. Falha de rede **não** vira erro visível: já existe conteúdo na mão. `favoritadoEm` é preservado no refresh, senão a coleção reordenaria debaixo do dedo de quem está rolando.

Local por ora, como [`useSeguidas`](#11-seguindo-tabsseguindotsx): não existe `post_likes` no schema.

### Regra compartilhada do coração

O hook `useCurtida(post)` (mesmo arquivo do store) devolve `{ favorito, curtidas, alternar, favoritar }` e é o **único** lugar que sabe somar +1 ao contador do backend, que não conhece a curtida local. Cada tela mantém sua própria animação (pulso no reel, pulso + explosão no toque duplo do card) — só a regra é compartilhada, porque a apresentação é legitimamente diferente nas duas.

---

## Padrões transversais

### Conteúdo abaixo da tab bar
Toda tela em `(tabs)` que tenha rolagem precisa reservar `paddingBottom: spacing.tabBarHeight` no `contentContainerStyle`. Já documentado em [`05-shell-app.md` §1](./05-shell-app.md#compensação-de-altura-nas-telas).

### "Secao" como wrapper local
Várias telas têm o padrão "label uppercase + bloco". Padronizar como componente interno repetível por tela (ou promover a `components/ui/Secao.tsx` se aparecer em 5+ telas):

```tsx
function Secao({ titulo, children, semBorda = false }: { titulo: string; children: React.ReactNode; semBorda?: boolean }) {
  return (
    <View style={{ paddingTop: 24 }}>
      <Text style={{ ...typography.label, color: colors.inkMuted, paddingHorizontal: 24, marginBottom: 12 }}>
        {titulo.toUpperCase()}
      </Text>
      <View style={{ paddingHorizontal: semBorda ? 0 : 16 }}>{children}</View>
    </View>
  )
}
```

Decisão: começa local em cada tela; promove pra `ui/` na Fase 8 se ficar repetitivo.

### Nada de lucide nos arquivos refatorados
Validação: ao final de cada PR de tela, rodar `grep "lucide-react-native" apps/mobile-consumer/app/{tela}.tsx` e garantir resultado vazio.

### Nada de classe Tailwind morta
Validação: `grep -E "(verde-profundo|verde-medio|verde-100|verde-500|creme|ambar|coral|gold|warm|ink-[0-9]+)"` nos arquivos refatorados deve retornar vazio.

## Critério de aceite (por tela)

Cada tela é considerada pronta quando:
1. Consome `<HeaderTela>` (se aplicável).
2. Não importa de `lucide-react-native`.
3. Não usa classes Tailwind mortas.
4. Não tem hex literal (exceto exceções de [`01-tokens.md` §11](./01-tokens.md#11-casos-limite-exceções-permitidas)).
5. Reserva `spacing.tabBarHeight` no fim de listas/scrolls em `(tabs)`.
6. Empty state e loading state usam `<EmptyState>`/`<LoadingState>`.
7. Status de pedido (se aplicável) consome `metaDoStatus()`/`timelineDoStatus()`.
8. Build passa: `pnpm --filter mobile-consumer typecheck`.
9. Screenshot anexado no PR.

## Próximos

- [`08-roadmap.md`](./08-roadmap.md) — sequência de PRs com escopo, dependências e checklist por fase.
