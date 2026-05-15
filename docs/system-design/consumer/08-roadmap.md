# 08 — Roadmap de execução

> Sequência ordenada de PRs para implementar o redesign do `mobile-consumer`. Cada fase é um PR fechado, com escopo claro, dependências explícitas e critério de aceite verificável.

## Princípios do roadmap

1. **Foundation primeiro.** Tokens + ícones + status são pré-requisito de tudo. Sem eles, qualquer refactor de tela vira gambiarra.
2. **Componentes antes de telas.** Primitivos e componentes de domínio entram antes das telas que os consomem. Reduz repetição de revisão.
3. **Shell antes de telas internas.** Tab bar e header novos primeiro — assim cada tela já adapta para o novo shell num único PR.
4. **Telas em ordem de complexidade.** Home antes de loja antes de checkout antes de pedido. Cada uma valida componentes anteriores.
5. **Reels por último.** Tem o maior volume de inline styles e a maior superfície de risco visual. Faz por último com tudo já estável.
6. **Cada PR tem que ser revertível.** Se o PR 5 for revertido, os PRs 1-4 continuam estáveis.

## Visão geral das fases

| # | Fase | Arquivos tocados | Tamanho estimado | Bloqueia |
|---|---|---|---|---|
| 1 | Foundation | `lib/consumer-design.ts`, `lib/status-pedido.ts`, `components/ConsumerIcon.tsx`, `tailwind.config.js`, `app.json` | M | tudo |
| 2 | Base components | `components/ui/*.tsx` (8 arquivos) | M | 3+ |
| 3 | Shell | `app/_layout.tsx`, `app/(auth)/_layout.tsx`, `app/(tabs)/_layout.tsx`, `components/HeaderTela.tsx`, `components/SplashAnimado.tsx` | M | 4+ |
| 4 | Home + Buscar | `app/(tabs)/index.tsx`, `app/(tabs)/buscar.tsx`, `components/LojaCard.tsx`, `components/LojaCardH.tsx`, `components/BannerCarousel.tsx`, **delete** `components/CategoriaChip.tsx` | L | — |
| 5 | Loja + Modal | `app/loja/[slug].tsx`, `components/ProdutoCard.tsx` (novo), `components/ModalProduto.tsx` | L | 6 |
| 6 | Checkout | `app/checkout.tsx`, `components/ItemCarrinhoCard.tsx`, `components/SeletorEndereco.tsx`, `components/SeletorPagamento.tsx` | L | 7 |
| 7 | Pedidos + tracking | `app/(tabs)/pedidos.tsx`, `app/pedido/[id].tsx`, `components/PedidoCard.tsx` (novo), `components/MapaEntregador.tsx` | L | — |
| 8 | Perfil + (auth) | `app/(tabs)/perfil.tsx`, `app/(auth)/boas-vindas.tsx`, `app/(auth)/entrar.tsx`, `components/EditarPerfil.tsx`, `components/GerenciarEnderecos.tsx` | M | — |
| 9 | Reels + cleanup | `app/(tabs)/explorar.tsx`, `components/NotificacoesPopup.tsx`, **remove** `lucide-react-native` do package.json | L | — |

> Tamanho: S < 200 linhas alteradas, M 200-600, L 600+.

---

## Fase 1 — Foundation

### Objetivo
Estabelecer as fundações sem tocar em nenhuma tela. Após este PR, todas as telas continuam funcionando inalteradas, mas o **vocabulário** novo está disponível.

### Escopo
- Criar `apps/mobile-consumer/lib/consumer-design.ts` ([01-tokens.md §2](./01-tokens.md#2-conteúdo-final-do-arquivo)).
- Criar `apps/mobile-consumer/lib/status-pedido.ts` ([06-status-pedido.md §4](./06-status-pedido.md#4-conteúdo-do-arquivo)).
- Criar `apps/mobile-consumer/components/ConsumerIcon.tsx` ([02-iconografia.md §6](./02-iconografia.md#6-implementação-dos-paths-svg)).
- Reescrever `apps/mobile-consumer/tailwind.config.js` ([01-tokens.md §9](./01-tokens.md#9-tailwind-config--espelho-dos-tokens)).
- Atualizar `apps/mobile-consumer/app.json`:
  - `splash.backgroundColor`: `#FFF8ED` → `#111216`
  - `android.adaptiveIcon.backgroundColor`: `#1A4D3A` → `#111216`

### O que NÃO faz
- Não toca em nenhum arquivo de `app/` ou `components/` que não seja o `ConsumerIcon.tsx` novo.
- Não substitui ainda nenhum import de `lucide-react-native`.
- Não deleta nada do tailwind antigo até o app inteiro migrar (Fase 9). **Importante**: nesta fase, `tailwind.config.js` deve manter classes antigas (`verde-*`, `creme`, etc.) **co-existindo** com as novas. Caso contrário, todas as telas quebram.

### Estratégia de coexistência
```js
// tailwind.config.js durante a transição (Fases 1-8)
module.exports = {
  theme: {
    extend: {
      colors: {
        // novos (Fase 1)
        canvas: '#F3F3F1', surface: '#FFFFFF', /* ... */ accent: '#D8FF3E', /* ... */

        // antigos (deprecated — removidos na Fase 9)
        verde: { profundo: '#1A4D3A', medio: '#4CAF82', 500: '#287D5C', 100: '#E8F5EE' },
        ambar: '#D4A04A', coral: '#C75B3A', gold: '#C5975B',
        creme: '#F4F0EB', warm: '#E8E0D4',
        ink: { 900: '#1C1C19', 700: '#3D3D36', 500: '#6B6B60', 400: '#8A8A7E', 300: '#B0B0A5', 200: '#D0D0C5' },
      },
    },
  },
}
```

A Fase 9 remove o bloco antigo. Até lá, os dois convivem.

### Critério de aceite
- [ ] `apps/mobile-consumer/lib/consumer-design.ts` exporta `consumerDesign` com colors, radius, spacing (incluindo `tabBarHeight`), typography, motion, shadow, opacity.
- [ ] `apps/mobile-consumer/lib/status-pedido.ts` exporta `META_STATUS`, `metaDoStatus`, `timelineDoStatus`, `ehAtivo`, `ehFinalizado`, `progressoDoStatus`, `ORDEM_FLUXO`.
- [ ] `apps/mobile-consumer/components/ConsumerIcon.tsx` exporta `ConsumerIcon` e `ConsumerIconName`, com 46 ícones implementados.
- [ ] `apps/mobile-consumer/tailwind.config.js` aceita classes novas e mantém antigas.
- [ ] `apps/mobile-consumer/app.json` atualizado.
- [ ] `pnpm --filter mobile-consumer typecheck` passa.
- [ ] App roda no simulador exatamente igual a antes (smoke test).

### Estimativa
~600 linhas de código novo (`ConsumerIcon` é o maior, ~300 linhas).

---

## Fase 2 — Base components

### Objetivo
Os 8 primitivos visuais ([03-componentes-base.md](./03-componentes-base.md)) ficam disponíveis. Nenhuma tela ainda os consome.

### Escopo
- Criar `apps/mobile-consumer/components/ui/Botao.tsx`.
- Criar `apps/mobile-consumer/components/ui/Input.tsx`.
- Criar `apps/mobile-consumer/components/ui/Card.tsx`.
- Criar `apps/mobile-consumer/components/ui/Badge.tsx`.
- Criar `apps/mobile-consumer/components/ui/Chip.tsx`.
- Criar `apps/mobile-consumer/components/ui/Skeleton.tsx`.
- Criar `apps/mobile-consumer/components/ui/EmptyState.tsx`.
- Criar `apps/mobile-consumer/components/ui/LoadingState.tsx`.

### O que NÃO faz
- **Não deleta** os componentes antigos (`components/Botao.tsx`, `components/Skeleton.tsx`). Eles continuam em uso. A Fase 4+ migra cada consumidor para `components/ui/Botao` e, quando o último consumidor migrar, os antigos são removidos no PR final da Fase 9.
- **Não migra** `components/CategoriaChip.tsx` para `Chip`. Isso fica na Fase 4 (Home).

### Por que dois `Botao` ao mesmo tempo?
Telas migram em ondas. Coexistir evita um PR mega que troque tudo simultaneamente. `Botao` antigo (verde profundo, classNames) e `ui/Botao` (lime accent, tokens) vivem em paralelo até a Fase 8.

### Critério de aceite
- [ ] 8 arquivos em `components/ui/` criados conforme spec.
- [ ] Nenhum hex literal nos arquivos (consumir `consumerDesign`).
- [ ] Nenhum `from 'lucide-react-native'` nos arquivos.
- [ ] APIs em PT-BR conforme [03-componentes-base.md](./03-componentes-base.md).
- [ ] `pnpm --filter mobile-consumer typecheck` passa.
- [ ] **Smoke test**: criar uma tela `app/_dev-ui.tsx` (apagada antes do merge) que renderiza um exemplo de cada primitivo. Validar visualmente. **No merge final, essa tela é removida.**

### Estimativa
~800 linhas de código novo.

---

## Fase 3 — Shell

### Objetivo
Tab bar flutuante, header reutilizável e splash refatorados. Aqui o app **muda visualmente pela primeira vez** — usuário vê tab bar nova mesmo nas telas ainda não refatoradas.

### Escopo
- Reescrever `apps/mobile-consumer/app/(tabs)/_layout.tsx` ([05-shell-app.md §1](./05-shell-app.md#1-tab-bar-flutuante-port-literal-do-courier)).
- Criar `apps/mobile-consumer/components/HeaderTela.tsx` ([05-shell-app.md §2](./05-shell-app.md#2-header-de-tela-novo-componente)).
- Refatorar `apps/mobile-consumer/components/SplashAnimado.tsx` ([05-shell-app.md §6](./05-shell-app.md#6-splash-splashanimado--native)).
- Refatorar `apps/mobile-consumer/app/_layout.tsx` (canvas no `GestureHandlerRootView`).
- Refatorar `apps/mobile-consumer/app/(auth)/_layout.tsx` (background `surfaceDark`).

### Risco e mitigação
| Risco | Mitigação |
|---|---|
| Tab bar flutuante deixa conteúdo escondido nas telas atuais | Adicionar `paddingBottom: spacing.tabBarHeight` em todas as telas de `(tabs)` neste mesmo PR (alteração mínima — só adiciona padding, sem refatorar). |
| Loading screen do tabs pisca diferente | Substituir `<ActivityIndicator>` direto por `<LoadingState modo="tela">`. |
| Telas auth ficam em `surfaceDark` mas o conteúdo ainda é "verde profundo" | Visualmente fica feio por 1 PR. Aceitar — Fase 8 corrige. |

### Critério de aceite
- [ ] Tab bar flutuante renderiza em todas as 4 tabs.
- [ ] `(auth)` em fundo dark.
- [ ] Splash em `colors.ink`.
- [ ] Listas/scrolls em `(tabs)` não escondem conteúdo atrás da tab bar (paddingBottom adicionado).
- [ ] Nenhum `from 'lucide-react-native'` em `app/(tabs)/_layout.tsx` (importava 4 ícones — todos viraram `<ConsumerIcon>`).
- [ ] `pnpm --filter mobile-consumer typecheck` passa.

### Estimativa
~400 linhas alteradas.

---

## Fase 4 — Home + Buscar

### Objetivo
Tela inicial (a mais importante) e busca refatoradas. Substitui o conceito de "pisos" por seções limpas.

### Escopo
- Refatorar `apps/mobile-consumer/app/(tabs)/index.tsx` ([07-telas.md §3](./07-telas.md#3-home-tabsindextsx)).
- Refatorar `apps/mobile-consumer/app/(tabs)/buscar.tsx` ([07-telas.md §4](./07-telas.md#4-buscar-tabsbuscar-tsx)).
- Refatorar `apps/mobile-consumer/components/LojaCard.tsx`.
- Refatorar `apps/mobile-consumer/components/LojaCardH.tsx`.
- Refatorar `apps/mobile-consumer/components/BannerCarousel.tsx` (aceita `banners` como prop).
- Criar `apps/mobile-consumer/lib/banners-mock.ts` (3 banners hardcoded por enquanto).
- **Deletar** `apps/mobile-consumer/components/CategoriaChip.tsx`.

### Decisões de produto que entram aqui
- Remoção do conceito visual "pisos / Térreo / 1º Piso". Lojas continuam agrupadas em seções, mas com títulos comuns ("Praça de Alimentação", "Essenciais do Dia a Dia", etc.).
- Remoção dos filtros de cozinha e subcategorias do home — viram responsabilidade da `buscar`.
- `FLOOR_METADATA` deixa de existir; entra `SECOES` (sem cores, sem barrinha).

### Critério de aceite
- [ ] Home renderiza com `<HeaderTela variante="principal">`.
- [ ] Banner de pedido ativo aparece quando `ehAtivo(statusAtual)`.
- [ ] Lojas em scroll horizontal por seção.
- [ ] Buscar com `<Input>`, `<Chip>`, `<EmptyState>`.
- [ ] `LojaCard` e `LojaCardH` sem placeholder colorido (placeholder dark com inicial accent).
- [ ] `CategoriaChip.tsx` removido do filesystem; nenhum `import` órfão.
- [ ] Nenhum hex literal nas telas refatoradas.
- [ ] Nenhum `from 'lucide-react-native'` nas telas refatoradas.
- [ ] `pnpm --filter mobile-consumer typecheck` passa.
- [ ] Screenshot comparativo no PR.

### Estimativa
~1200 linhas alteradas (home tem 700+).

---

## Fase 5 — Loja + Modal

### Objetivo
Detalhe da loja com FAB de carrinho novo e ProdutoCard extraído.

### Escopo
- Refatorar `apps/mobile-consumer/app/loja/[slug].tsx` ([07-telas.md §8](./07-telas.md#8-loja-lojaslugtsx)).
- Criar `apps/mobile-consumer/components/ProdutoCard.tsx`.
- Refatorar `apps/mobile-consumer/components/ModalProduto.tsx` ([04-componentes-dominio.md §6](./04-componentes-dominio.md#6-modalproduto)).

### Critério de aceite
- [ ] Header animado em `surface` no scroll (era verde profundo).
- [ ] FAB do carrinho com label `"X itens · R$ Y"` em accent.
- [ ] `ProdutoCard` componente reutilizável; sem JSX inline em `loja/[slug].tsx`.
- [ ] `ModalProduto` em bottom-sheet com handle, CTA `<Botao>`.
- [ ] Modal secundário "trocar loja" usa `<Card>` + `<Botao>`.
- [ ] `pnpm --filter mobile-consumer typecheck` passa.
- [ ] Screenshot comparativo no PR.

### Estimativa
~700 linhas alteradas.

---

## Fase 6 — Checkout

### Objetivo
Fluxo de checkout refatorado, com Stripe appearance ajustado e botão fixo no fundo.

### Escopo
- Refatorar `apps/mobile-consumer/app/checkout.tsx` ([07-telas.md §9](./07-telas.md#9-checkout-checkouttsx)).
- Refatorar `apps/mobile-consumer/components/ItemCarrinhoCard.tsx` ([04-componentes-dominio.md §4](./04-componentes-dominio.md#4-itemcarrinhocard)).
- Refatorar `apps/mobile-consumer/components/SeletorEndereco.tsx`.
- Refatorar `apps/mobile-consumer/components/SeletorPagamento.tsx` ([04-componentes-dominio.md §9](./04-componentes-dominio.md#9-seletorpagamento)).

### Atenção especial
- Stripe `appearance` recebe tokens. Validar que Payment Sheet renderiza ok no iOS e Android.
- LoadingState `modo="tela" variante="escuro"` substitui o splash full-screen com Lottie.
- `BotaoFixo` interno respeita `insets.bottom`.

### Critério de aceite
- [ ] Checkout abre, fluxo até pagamento funciona end-to-end (cartão de teste Stripe).
- [ ] Stripe Payment Sheet em fundo claro com primary `accent`.
- [ ] Botão "Fazer pedido" fixo no fundo, primário.
- [ ] `pnpm --filter mobile-consumer typecheck` passa.
- [ ] Screenshot comparativo no PR.

### Estimativa
~900 linhas alteradas.

---

## Fase 7 — Pedidos + tracking

### Objetivo
Lista de pedidos e tela de tracking consumindo `lib/status-pedido.ts`. Eliminação total de mapas locais de status.

### Escopo
- Refatorar `apps/mobile-consumer/app/(tabs)/pedidos.tsx` ([07-telas.md §6](./07-telas.md#6-pedidos-tabspedidostsx)).
- Refatorar `apps/mobile-consumer/app/pedido/[id].tsx` ([07-telas.md §10](./07-telas.md#10-pedido--tracking-pedidoidtsx)).
- Criar `apps/mobile-consumer/components/PedidoCard.tsx`.
- Refatorar `apps/mobile-consumer/components/MapaEntregador.tsx` (cor de pinos via tokens).
- Refatorar banner de pedido ativo no home (já feito na Fase 4 se foi feito; senão, fazer aqui).

### Critério de aceite
- [ ] `grep -nE "(LABELS_STATUS|CORES_STATUS|PROGRESSO_STATUS|DESCRICAO_STATUS|ORDEM_STATUS)" apps/mobile-consumer/` retorna apenas matches em `lib/status-pedido.ts`.
- [ ] `<PedidoCard>` extrai card de pedido reutilizável; ativos em `Card variante="escuro"`.
- [ ] `<TimelinePedido>` consome `timelineDoStatus()`.
- [ ] `MapaEntregador` com `pinColor: colors.accent / colors.ink`.
- [ ] Filtros (Todos/Ativos/Histórico) usam `<Chip>`.
- [ ] Empty state de pedidos usa `<EmptyState>`.
- [ ] `pnpm --filter mobile-consumer typecheck` passa.
- [ ] Screenshot comparativo no PR.

### Estimativa
~800 linhas alteradas.

---

## Fase 8 — Perfil + (auth)

### Objetivo
Telas de auth (boas-vindas, entrar) ficam em fundo dark com accent, e perfil ganha card de identidade dark.

### Escopo
- Refatorar `apps/mobile-consumer/app/(auth)/boas-vindas.tsx` ([07-telas.md §1](./07-telas.md#1-boas-vindas-authboas-vindastsx)).
- Refatorar `apps/mobile-consumer/app/(auth)/entrar.tsx` ([07-telas.md §2](./07-telas.md#2-entrar-authentrartsx)).
- Refatorar `apps/mobile-consumer/app/(tabs)/perfil.tsx` ([07-telas.md §7](./07-telas.md#7-perfil-tabsperfiltsx)).
- Refatorar `apps/mobile-consumer/components/EditarPerfil.tsx`.
- Refatorar `apps/mobile-consumer/components/GerenciarEnderecos.tsx`.
- **Deletar** `apps/mobile-consumer/components/Botao.tsx` antigo (último consumidor migrou agora).
- **Deletar** `apps/mobile-consumer/components/Skeleton.tsx` antigo (idem).

### Atenção especial
- Tela `boas-vindas` não usa mais cores diferentes por slide; todos no mesmo background.
- Telas auth ficam em `colors.surfaceDark` — `<Input fundoEscuro>`.
- `EditarPerfil` e `GerenciarEnderecos` viram bottom-sheets (em vez de empurrar a tela inteira).

### Critério de aceite
- [ ] Boas-vindas em dark com 3 ícones diferentes.
- [ ] Entrar em dark com `<Input fundoEscuro>`.
- [ ] Perfil com card de identidade dark + lista por seções.
- [ ] `Botao.tsx` e `Skeleton.tsx` antigos deletados; nenhum import órfão.
- [ ] `pnpm --filter mobile-consumer typecheck` passa.
- [ ] Screenshot comparativo no PR.

### Estimativa
~700 linhas alteradas.

---

## Fase 9 — Reels + cleanup

### Objetivo
Última tela (reels) realinhada e cleanup final do tailwind antigo + remoção de `lucide-react-native`.

### Escopo
- Refatorar `apps/mobile-consumer/app/(tabs)/explorar.tsx` ([07-telas.md §5](./07-telas.md#5-explorar--reels-tabsexplorartsx)).
- Refatorar `apps/mobile-consumer/components/NotificacoesPopup.tsx` ([04-componentes-dominio.md §11](./04-componentes-dominio.md#11-notificacoespopup)).
- Limpar `apps/mobile-consumer/tailwind.config.js`: remover bloco antigo (`verde.*`, `creme`, `ambar`, `coral`, `gold`, `warm`, `ink-{200..900}`).
- Remover `lucide-react-native` de `apps/mobile-consumer/package.json`.
- Atualizar `pnpm-lock.yaml`.

### Validação final
Antes de mergear, rodar:
```bash
# Nenhum import lucide
grep -r "from 'lucide-react-native'" apps/mobile-consumer/ --include="*.tsx" --include="*.ts"

# Nenhum hex literal fora dos pontos permitidos
grep -rE "#[0-9A-Fa-f]{6}" apps/mobile-consumer/app/ apps/mobile-consumer/components/ --include="*.tsx"

# Nenhuma classe Tailwind morta
grep -rE "(verde-profundo|verde-medio|verde-100|verde-500|bg-creme|text-creme|bg-ambar|text-ambar|bg-coral|text-coral|bg-gold|bg-warm|ink-[0-9]+)" apps/mobile-consumer/ --include="*.tsx"

# Nenhum hex de status duplicado
grep -nE "(LABELS_STATUS|CORES_STATUS|PROGRESSO_STATUS|DESCRICAO_STATUS|ORDEM_STATUS)" apps/mobile-consumer/ --exclude-dir=lib
```

Todos os 4 comandos devem retornar **vazio** (exceto matches em `lib/consumer-design.ts`, `lib/status-pedido.ts` e exceções de [01-tokens.md §11](./01-tokens.md#11-casos-limite-exceções-permitidas)).

### Critério de aceite
- [ ] Reels em fundo `colors.ink`, accents lime, sem lucide.
- [ ] `NotificacoesPopup` em bottom-sheet dark.
- [ ] `tailwind.config.js` sem bloco antigo.
- [ ] `lucide-react-native` removido do `package.json` e do lockfile.
- [ ] 4 comandos de validação acima retornam vazio.
- [ ] `pnpm --filter mobile-consumer typecheck` passa.
- [ ] Screenshot comparativo no PR.

### Estimativa
~1500 linhas alteradas (reels é a maior tela do app, 970+ linhas).

---

## Dependências entre fases

```
Fase 1 (Foundation)
   │
   ├──> Fase 2 (Base components)
   │       │
   │       ├──> Fase 3 (Shell)
   │       │       │
   │       │       ├──> Fase 4 (Home + Buscar)
   │       │       │       │
   │       │       │       └──> Fase 5 (Loja + Modal)
   │       │       │               │
   │       │       │               └──> Fase 6 (Checkout)
   │       │       │                       │
   │       │       │                       └──> Fase 7 (Pedidos + tracking)
   │       │       │
   │       │       └──> Fase 8 (Perfil + auth)
   │       │
   │       └──> Fase 9 (Reels + cleanup) — depende de TODAS as anteriores
```

- Fases 4 e 8 podem ser feitas **em paralelo** (não compartilham arquivos).
- Fases 5, 6, 7 são sequenciais (cada uma depende da anterior).
- Fase 9 só pode entrar quando todas as outras estiverem mergeadas.

## Estratégia de revisão

Cada PR de tela deve incluir:
1. Screenshot **antes** (current main).
2. Screenshot **depois** (a branch).
3. Lista do que mudou em bullets curtos.
4. Resultados dos comandos de validação relevantes para o escopo.

Reviewer prioriza:
- Coerência com a documentação (este folder).
- Ausência de hex literais e imports lucide nos arquivos tocados.
- Consistência com fases anteriores.

## Critério de pronto do redesign inteiro

O projeto está concluído quando:

- [ ] Todas as 9 fases mergeadas em `main`.
- [ ] `lucide-react-native` ausente de `apps/mobile-consumer/package.json`.
- [ ] `tailwind.config.js` do consumer só com tokens novos.
- [ ] `pnpm --filter mobile-consumer typecheck` passa.
- [ ] App roda no iOS e Android sem warnings de estilo.
- [ ] Todos os comandos de validação da Fase 9 retornam vazio.
- [ ] Documento `docs/system-design/consumer/00-visao-geral.md` atualizado com "Status: implementado em DD/MM/AAAA".

## Tracking

Sugestão: criar um issue épico no GitHub com checklist das 9 fases, vinculado a este `08-roadmap.md`. Cada PR fecha um item.

## Pós-redesign

Itens fora do escopo desta documentação que ficam para depois:

1. **Splash native asset**: gerar `assets/splash.png` com a marca em accent sobre fundo dark. Hoje fica como está; troca quando tiver design entregue.
2. **Lottie animado novo**: substituir `assets/shopping cart.json` por animação coerente com a paleta nova.
3. **App icon**: refresh do ícone e adaptive icon Android.
4. **Backend de banners**: hoje `BANNERS_MOCK` em `lib/banners-mock.ts`; quando vier do banco, é só trocar a fonte de dados.
5. **Backend de notificações**: hoje `NotificacoesPopup` lê mock; conexão com Supabase fica para outra iniciativa.
6. **Pacote `@mallevo/design`** (se ficar valendo a pena consolidar tokens compartilhados entre courier e consumer): considerar em revisão pós-projeto.
7. **Testes visuais**: adicionar Storybook ou testes de regressão visual com Maestro/Detox em fases posteriores.
