# Plano de execução — Perfil do consumidor profissional (mobile-consumer)

> **Para o executor (Opus 5):** plano preparado pelo Fable 5 com análise do
> código em `claude/partner-app` (2026-08-28). Siga as fases NA ORDEM — cada
> fase termina com commit próprio e o app compilando (`pnpm lint` no
> mobile-consumer).
>
> **Pedido do usuário (2026-08-28):**
> 1. Foto de perfil do usuário (upload).
> 2. Endereços com rótulo **Casa / Trabalho / Outro** e endereço **padrão**.
> 3. Pop-up no checkout quando o endereço de entrega estiver **longe da
>    localização atual** do usuário, pedindo confirmação.
> 4. Cadastro mais completo, no nível de outros apps de venda (iFood/Rappi:
>    nome completo, celular, CPF, data de nascimento).
> 5. Melhorias que a análise apontar (ver Fases A e F — hidratação do perfil,
>    exclusão de conta, termos/privacidade).
>
> **Escopo:** `apps/mobile-consumer`, `packages/types`, `packages/lib`,
> `supabase/` (1 migration + 1 edge function). **NÃO tocar** em
> `apps/storefront`, `apps/web`, `apps/mobile-partner`, `apps/mobile-courier`
> (o courier é só REFERÊNCIA de padrão). A TabBar do shell
> (`app/(tabs)/_layout.tsx`) continua INTOCÁVEL.

---

## 0. Diagnóstico (feito — não redescobrir)

### O que existe hoje

- **Tela de perfil** `apps/mobile-consumer/app/(tabs)/perfil.tsx`: card de
  identidade (inicial do nome num círculo — SEM foto), seções CONTA
  (Endereços / Editar perfil / Lojas que sigo / Favoritos / Meus pedidos,
  com editor e endereços expandindo inline via `SecaoAtiva`), AJUDA (Termos
  e Privacidade com `onPress` **vazio/TODO**, linhas 220–234), botão Sair.
- **Editar perfil** `components/EditarPerfil.tsx`: só **nome + telefone**.
- **Endereços no perfil** `components/GerenciarEnderecos.tsx`: só **listar e
  remover**. O empty state manda o usuário "adicionar no próximo pedido" —
  não dá para cadastrar endereço pelo perfil.
- **Endereços no checkout** `components/SeletorEndereco.tsx`: modal com
  lista + formulário de novo endereço (ViaCEP em `buscarCep`, geocodificação
  Nominatim via `lib/geocode.ts` ao salvar — reaproveitar, não reescrever).
  O formulário vive DENTRO desse arquivo (linhas 373–441) e não é acessível
  pelo perfil.
- **Checkout** `app/checkout.tsx:98-100`: auto-seleciona `enderecos[0]` —
  não existe conceito de endereço padrão.
- **Cadastro** `app/(auth)/entrar.tsx:51-71`: coleta SÓ email + senha
  (`options.data: { role: 'consumer' }`). **Nome nunca é coletado.**
- **Schema** `consumers` (migration `20240101...` linhas 135–146): `nome`,
  `telefone`, `foto_url`, `enderecos JSONB`. RLS select/insert/update
  próprio (migration `20240106...` linhas 248–264). **Sem** policy DELETE.
- **Tipo `Endereco`** `packages/types/src/domain.ts:29-40`: `apelido` texto
  livre, `latitude/longitude` opcionais. Sem tipo casa/trabalho, sem padrão.
- **`ConsumerProfile`** em `packages/lib/src/stores/useAuthStore.ts:5-11`
  (o `@/store/useAuthStore` do app é só um shim de re-export).
- **Types do Supabase** são MANTIDOS À MÃO em
  `packages/types/src/supabase.ts` (tabela `consumers` na linha ~118) — toda
  coluna nova precisa ser refletida ali em Row/Insert/Update.
- `expo-location ~19.0.8` **já instalado** e com permissões configuradas no
  `app.json` (iOS infoPlist + Android permissions + plugin), mas **nunca
  usado** no app.
- `expo-image-picker` NÃO está no mobile-consumer (está no partner e no
  courier, `~17.0.11`).

### Padrões prontos para copiar

- **Upload de avatar**: `apps/mobile-courier/app/(tabs)/perfil.tsx:28-83` —
  `ImagePicker.launchImageLibraryAsync` (aspect 1:1, quality 0.8) → POST
  `FormData` em `/storage/v1/object/<bucket>/<uid>/perfil.jpg` com header
  `x-upsert: true` → `getPublicUrl` + cache-bust `?t=${Date.now()}` →
  `update` na tabela → atualizar o store. Copiar esse fluxo inteiro.
- **Migration de bucket de avatar**:
  `supabase/migrations/20260428000002_courier_avatars_bucket.sql` — bucket
  público, INSERT/UPDATE na própria pasta (`(storage.foldername(name))[1] =
  auth.uid()::text`), SELECT público.

### Bugs/lacunas que este plano corrige (além do pedido)

1. **Nenhum código cria a linha em `consumers`.** Não há `.insert()` no app
   nem trigger nas migrations — só a policy `consumers_insert_proprio`
   esperando ser usada. Se a linha não existir, o checkout quebra
   ("Consumidor não encontrado" em `create-pagarme-order/index.ts:79`).
2. **O perfil não é hidratado no boot.** `setConsumer` só roda no
   pull-to-refresh de perfil.tsx. A saudação da Home
   (`app/(tabs)/index.tsx:454-458`, `consumer?.nome`) fica vazia até o
   usuário puxar o refresh na aba Perfil.
3. **Exclusão de conta não existe** — exigência da App Store (5.1.1(v)) e do
   Google Play para apps com cadastro. Bloqueia publicação.
4. `orders.consumer_id REFERENCES consumers(id)` **sem ON DELETE** (NO
   ACTION) e `consumers.user_id NOT NULL ... ON DELETE CASCADE`: deletar o
   auth user de quem já pediu falharia. A migration da Fase 0 resolve
   (user_id vira anulável com ON DELETE SET NULL).

---

## 1. Decisões de produto (fechadas — não reabrir)

- **Cadastro**: nome completo passa a ser coletado no signup (obrigatório) +
  telefone (opcional). CPF e data de nascimento entram como campos do
  "Editar perfil" (opcionais, com validação real) — não travar o signup com
  eles. É o conjunto que iFood/Rappi pedem; CPF ainda será útil para
  antifraude/NF no Pagar.me.
- **Endereço**: ganha `tipo: 'casa' | 'trabalho' | 'outro'` (chips no
  formulário, ícone na listagem) e `padrao: boolean`. O primeiro endereço
  salvo vira padrão automaticamente; "Usar como padrão" desmarca os demais.
  Checkout auto-seleciona o padrão (fallback: `[0]`).
- **Pop-up de distância**: dispara ao tocar em "Pagar/Fazer pedido" (não ao
  selecionar endereço), só para entrega (não agendamento), só se o endereço
  tem lat/lng, limiar **2 km**. Sem permissão de localização, sem
  coordenada, timeout ou erro → segue SILENCIOSAMENTE (nunca bloquear
  venda). Pergunta no máximo 1× por sessão de checkout.
- **Foto**: bucket público `consumer-avatars` (padrão courier), caminho
  `{uid}/perfil.jpg`, sempre upsert — sem lixo acumulado.
- **Exclusão de conta**: anonimiza `consumers` (mantém pedidos para fins
  fiscais/contábeis) e deleta o auth user via edge function com service
  role. Texto claro de irreversibilidade + dupla confirmação.

---

## 2. Fases — commit por fase

### Fase 0 — Fundação: migration única + types + dependência

**Migration** `supabase/migrations/<timestamp>_consumer_perfil_completo.sql`
(timestamp real no formato dos vizinhos, ex. `20260828120000_...`):

1. Bucket `consumer-avatars`: copiar o SQL de
   `20260428000002_courier_avatars_bucket.sql` trocando o id do bucket e os
   nomes das policies (`consumer_avatars_*`). Acrescentar policy de DELETE
   próprio (o dono pode remover a própria foto):
   `FOR DELETE TO authenticated USING (bucket_id = 'consumer-avatars' AND
   (storage.foldername(name))[1] = auth.uid()::text)`.
2. `ALTER TABLE consumers ADD COLUMN cpf TEXT, ADD COLUMN data_nascimento
   DATE;` (comentar: CPF armazenado só dígitos; validação no app).
3. Preparo da exclusão de conta:
   ```sql
   ALTER TABLE consumers ALTER COLUMN user_id DROP NOT NULL;
   ALTER TABLE consumers DROP CONSTRAINT consumers_user_id_fkey;
   ALTER TABLE consumers
     ADD CONSTRAINT consumers_user_id_fkey
     FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
   ```
   (conferir o nome real da constraint com `\d consumers` — se o db push
   reclamar, usar o nome que o Postgres gerou). O UNIQUE em `user_id`
   continua válido (NULLs múltiplos são permitidos).

**Types e tipos compartilhados:**

- `packages/types/src/supabase.ts` → tabela `consumers`: adicionar
  `cpf: string | null` e `data_nascimento: string | null` em Row, e as
  variantes opcionais em Insert/Update; `user_id` vira `string | null` no
  Row.
- `packages/types/src/domain.ts` → `Endereco`: adicionar
  `tipo?: 'casa' | 'trabalho' | 'outro'` e `padrao?: boolean` (comentar que
  são opcionais para compatibilidade com JSONB legado e com o storefront,
  que NÃO entra neste plano).
- `packages/lib/src/stores/useAuthStore.ts` → `ConsumerProfile`: adicionar
  `cpf?: string | null` e `data_nascimento?: string | null`.

**Dependência:** `expo-image-picker: ~17.0.11` no
`apps/mobile-consumer/package.json` (mesma versão do partner/courier) +
`pnpm install`.

**Avisar o usuário no fim da fase:** falta ele rodar `supabase db push` (e
depois da Fase F, `supabase functions deploy delete-account`).

Commit: `feat(consumer): fundacao do perfil completo (migration, types, deps)`

---

### Fase A — Perfil sempre existe e sempre carregado

Novo `apps/mobile-consumer/lib/perfil.ts`:

```
garantirConsumer(user: User): Promise<void>
```

- `select('id, nome, telefone, foto_url, cpf, data_nascimento, enderecos')`
  por `user_id`;
- se não existir (`PGRST116`/data null): `insert` com `user_id: user.id`,
  `nome: user.user_metadata?.nome ?? user.email?.split('@')[0] ?? 'Cliente'`,
  `telefone: user.user_metadata?.telefone ?? null`, e re-select;
- `useAuthStore.getState().setConsumer(...)` com `enderecos` normalizado
  (`Array.isArray ? ... : []` — padrão do storefront `lib/auth.ts:39-41`);
- try/catch: falha aqui não pode derrubar o boot.

Chamar em `app/_layout.tsx` dentro do `onAuthStateChange`, junto do
`registrarPushToken` (linha 32). Atualizar também o select do onRefresh em
`perfil.tsx:38` para incluir `cpf, data_nascimento`.

Resultado colateral: a saudação da Home passa a funcionar no primeiro boot.

Commit: `fix(consumer): perfil hidratado no boot e criado no primeiro login`

---

### Fase B — Foto do usuário

Em `perfil.tsx`, o card de identidade ganha foto:

- círculo 56px: se `consumer.foto_url` → `<Image>` (com estado de erro
  caindo para a inicial, padrão `avatarErro` do courier); senão inicial
  atual;
- badge de câmera (ícone `camera`, círculo pequeno sobreposto no canto
  inferior direito do avatar, fundo `colors.accent`) — todo o avatar é
  `TouchableOpacity`;
- ao tocar: `Alert.alert('Foto de perfil', undefined, [...])` com "Tirar
  foto", "Escolher da galeria", e — se já tem foto — "Remover foto"
  (destructive), "Cancelar";
- galeria/câmera: copiar o fluxo de
  `apps/mobile-courier/app/(tabs)/perfil.tsx:28-83` trocando bucket para
  `consumer-avatars`, tabela para `consumers` (update por `id` do consumer)
  e store para `setConsumer`. Câmera usa
  `ImagePicker.requestCameraPermissionsAsync` +
  `launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true,
  aspect: [1, 1], quality: 0.8 })`;
- remover: `supabase.storage.from('consumer-avatars').remove([caminho])` +
  `update({ foto_url: null })` + store;
- overlay `ActivityIndicator` sobre o avatar enquanto envia.

Extrair a lógica para `lib/avatar.ts` (`enviarAvatar`, `removerAvatar`) se o
componente passar de ~80 linhas novas — perfil.tsx já é grande.

Commit: `feat(consumer): foto de perfil com upload no bucket consumer-avatars`

---

### Fase C — Cadastro completo

**Signup (`app/(auth)/entrar.tsx`):**

- No modo `cadastrar`, acima do email: `Input rotulo="Nome completo"`
  (obrigatório — validar não-vazio e ≥ 2 palavras? NÃO: só não-vazio, nome
  único é válido no Brasil) e `Input rotulo="Celular (opcional)"
  tipo="telefone"`;
- passar em `options.data`: `{ role: 'consumer', nome: nome.trim(),
  telefone: telefone.trim() || null }` — a Fase A já usa `user_metadata`
  no primeiro insert;
- estados novos zerados ao alternar modo.

**Novo `apps/mobile-consumer/lib/validacao.ts`:**

- `validarCPF(cpf: string): boolean` — dígitos verificadores (rejeitar
  sequências repetidas tipo `111.111.111-11`);
- `mascaraCPF`, `mascaraData` (DD/MM/AAAA), `mascaraTelefone` — funções puras
  string→string;
- `validarDataNascimento(ddmmaaaa: string): string | null` — retorna ISO
  `YYYY-MM-DD` ou null; data real, idade entre 13 e 120 anos.

**`components/EditarPerfil.tsx`:**

- campos novos: CPF (máscara, `tipo="numero"`, salvar SÓ dígitos, validar
  com `validarCPF` quando preenchido) e Data de nascimento (máscara,
  exibir em DD/MM/AAAA a partir do ISO do banco, salvar ISO);
- email do auth exibido como linha informativa não-editável (texto
  `colors.inkMuted`, legenda "Email não pode ser alterado");
- erros por campo (o `Input` já tem prop `erro`);
- update inclui `cpf: cpfDigitos || null, data_nascimento: iso || null`;
  refletir no `setConsumer`.

Commit: `feat(consumer): cadastro com nome/telefone e perfil com cpf/nascimento`

---

### Fase D — Endereços 2.0 (Casa/Trabalho, padrão, CRUD no perfil)

**Ícones:** adicionar `briefcase` (Trabalho) e `star` (padrão) ao
`components/ConsumerIcon.tsx` — seguir o estilo dos paths existentes
(stroke 24×24, sem fill). Mapeamento de tipo: `casa→home`,
`trabalho→briefcase`, `outro→pin` (helper local `iconePorTipo`).

**Novo `components/FormularioEndereco.tsx`** — extrair o formulário que hoje
vive em `SeletorEndereco.tsx:373-441` e evoluir:

- props: `{ inicial?: Endereco, salvando: boolean, onSalvar: (e: Endereco)
  => void, onCancelar: () => void }` — o formulário NÃO fala com o Supabase;
  quem salva é o chamador;
- chips no topo: Casa / Trabalho / Outro (define `tipo`; ao escolher,
  preenche `apelido` sugerido "Casa"/"Trabalho" se o campo estiver vazio);
- campos atuais (apelido, CEP com ViaCEP, rua+número, complemento, bairro)
  + cidade e estado visíveis/editáveis (hoje ficam travados em
  Divinópolis/MG por default escondido);
- validação: rua, número, bairro, cidade obrigatórios;
- a geocodificação (`geocodificarEndereco`) continua no momento do salvar,
  no chamador — mover a chamada para o helper abaixo.

**Novo `lib/enderecos.ts`** — única porta de escrita de endereços:

- `salvarEnderecos(novos: Endereco[]): Promise<boolean>` — update
  `consumers.enderecos` por `user_id` + `setConsumer`;
- `adicionarEndereco(e)`, `editarEndereco(indice, e)`,
  `removerEndereco(indice)`, `definirPadrao(indice)`;
- regras: primeiro endereço da lista ganha `padrao: true`; `definirPadrao`
  seta true no índice e false nos demais; remover o padrão promove o `[0]`
  restante; `adicionar/editar` geocodifica (reusar `geocodificarEndereco`,
  falha não bloqueia — comentário do SeletorEndereco atual explica o
  porquê, preservar);
- migrar `GerenciarEnderecos` e `SeletorEndereco` para usar esses helpers
  (remover os updates diretos duplicados nos dois arquivos).

**`components/GerenciarEnderecos.tsx`:**

- cada card: ícone por tipo, badge "Padrão" (pill `accentSoft` + texto
  `accent`) quando `padrao`, ações **Editar** e **Remover**, e "Usar como
  padrão" quando não for o padrão;
- botão "Adicionar endereço" no fim (e no empty state, substituindo o texto
  que manda para o checkout) — abre `Modal` bottom-sheet com
  `FormularioEndereco` (mesmo chrome visual do modal do SeletorEndereco:
  handle, título, `maxHeight: '85%'`);
- Editar abre o mesmo modal pré-preenchido.

**`components/SeletorEndereco.tsx`:**

- lista do modal mostra ícone por tipo + badge Padrão;
- o formulário inline é substituído pelo `FormularioEndereco` (o arquivo
  encolhe — remover `novoEndereco/buscarCep/salvarEndereco` locais em favor
  de `lib/enderecos.ts`);
- endereço recém-criado continua sendo selecionado automaticamente.

**`app/checkout.tsx:98-100`:** auto-seleção vira
`enderecos.find(e => e.padrao) ?? enderecos[0]`.

Commit: `feat(consumer): enderecos com tipo casa/trabalho, padrao e crud no perfil`

---

### Fase E — Pop-up de endereço longe da localização atual

**Novo `apps/mobile-consumer/lib/localizacao.ts`:**

- `distanciaMetros(a: {latitude, longitude}, b: {latitude, longitude}):
  number` — Haversine (R = 6371 km), função pura;
- `obterLocalizacaoAtual(): Promise<Coordenadas | null>` —
  `Location.requestForegroundPermissionsAsync()`; se negado → null;
  `Location.getCurrentPositionAsync({ accuracy:
  Location.Accuracy.Balanced })` com `Promise.race` contra timeout de 5 s →
  null no timeout/erro. Nunca lança.

**`app/checkout.tsx`:**

- constante `LIMIAR_DISTANCIA_M = 2000` comentada (por que 2 km: acima do
  raio de um bairro, abaixo de "outra cidade" — pega troca de endereço
  esquecida sem incomodar quem pede do trabalho para casa);
- ref `confirmouDistancia = useRef(false)`;
- em `handleFazerPedido`, após `validar()` e ANTES de
  `setProcessando(true)`: se NÃO for agendamento, endereço tem lat/lng e
  `!confirmouDistancia.current` → `obterLocalizacaoAtual()`; se veio
  coordenada e `distanciaMetros(...) > LIMIAR` → `Alert.alert` e `return`:
  - título: `Você está longe deste endereço`;
  - mensagem: `Sua localização atual está a ~{km} km de
    "{apelido ?? rua}". Confirma a entrega neste endereço?` (km com 1
    decimal, `toFixed(1)` trocando ponto por vírgula);
  - botões: `Revisar endereço` (style cancel, só fecha) e
    `Confirmar entrega` (seta `confirmouDistancia.current = true` e chama
    `handleFazerPedido()` de novo);
- trocar de endereço no seletor reseta `confirmouDistancia.current = false`
  (no `onSelecionar`);
- qualquer null no caminho (sem permissão, timeout, sem coords no endereço)
  → segue direto para o pagamento, sem log visível ao usuário.

Commit: `feat(consumer): confirmacao quando endereco de entrega esta longe da localizacao`

---

### Fase F — Conta: termos, privacidade e exclusão

**Links (perfil.tsx, seção AJUDA):** os dois TODOs passam a abrir URL com
`Linking.openURL` (import de `react-native`). Criar `lib/links.ts` com
`URL_TERMOS` e `URL_PRIVACIDADE` lendo
`process.env.EXPO_PUBLIC_TERMS_URL/EXPO_PUBLIC_PRIVACY_URL` com fallback
`https://mallevo.com.br/termos` e `.../privacidade` — comentar que as
páginas ainda serão publicadas e o env permite trocar sem rebuild (via EAS
Update).

**Edge function `supabase/functions/delete-account/index.ts`** (seguir o
boilerplate de auth/CORS das functions vizinhas, ex.
`create-pagarme-order`):

1. valida JWT do chamador (client com o token do header);
2. com `getSupabaseAdmin()` (service role):
   - busca `consumers` por `user_id`;
   - se existir: `update` anonimizando — `nome: 'Conta excluída'`,
     `telefone/cpf/data_nascimento/foto_url: null`, `enderecos: []`
     (pedidos são preservados — FK `orders.consumer_id` continua íntegra);
   - remove `{uid}/perfil.jpg` do bucket `consumer-avatars` (ignorar erro);
   - `auth.admin.deleteUser(user.id)` — o FK `ON DELETE SET NULL` da Fase 0
     desliga a linha anonimizada do auth user;
3. responde `{ ok: true }`.

**UI (perfil.tsx):** nova seção "CONTA — ZONA DE PERIGO" (ou item abaixo de
Sair): botão "Excluir minha conta" (variante danger/ghost). Fluxo: primeiro
`Alert` explicando que é irreversível e que os dados pessoais serão
apagados (pedidos anonimizados) → segundo `Alert` de confirmação final →
chama a function com `Authorization: Bearer <access_token>` (mesmo padrão
de fetch do checkout.tsx:179-191) → `signOut` + limpar stores + redirect
para `/(auth)/entrar` (reusar a sequência do `handleSair`).

**Avisar o usuário:** `supabase functions deploy delete-account`.

Commit: `feat(consumer): exclusao de conta e links de termos/privacidade`

---

## 3. QA final (checklist para reportar ao usuário)

- [ ] Signup novo: nome/telefone pedidos, linha em `consumers` criada, Home
      saúda pelo primeiro nome já no primeiro boot.
- [ ] Login em conta antiga SEM linha em `consumers`: linha criada com nome
      derivado do email; nada quebra.
- [ ] Foto: galeria, câmera, remover, avatar persiste após matar o app
      (cache-bust ok), erro de rede mostra Alert e não trava.
- [ ] Editar perfil: CPF inválido bloqueado com erro no campo; data
      31/02/2000 bloqueada; salvar vazio (opcionais) funciona.
- [ ] Endereços: adicionar pelo PERFIL (não só checkout), editar, remover,
      trocar padrão; chips Casa/Trabalho refletem ícone na lista; primeiro
      endereço vira padrão sozinho; checkout pré-seleciona o padrão.
- [ ] Endereços legados (JSONB sem `tipo`/`padrao`) renderizam sem crash.
- [ ] Pop-up de distância: endereço com coords a > 2 km → pergunta 1 vez;
      "Confirmar entrega" segue o pagamento; permissão negada → compra
      normal sem pop-up; pedido agendado (services) → nunca pergunta.
- [ ] Excluir conta: pedidos antigos continuam visíveis no painel do
      lojista/admin como "Conta excluída"; login com a conta apagada falha.
- [ ] `pnpm lint` limpo no mobile-consumer; storefront NÃO foi tocado.
- [ ] Lembrar o usuário: `supabase db push` + `supabase functions deploy
      delete-account` + testar em device (Expo Go cobre tudo; image-picker
      funciona no Go).

## 4. Fora de escopo (registrado, não fazer agora)

- Cartões salvos / carteira (tokenização recorrente Pagar.me).
- Verificação de celular por SMS.
- Preferências granulares de notificação.
- Login social (Apple/Google) — exigiria config de OAuth e entra melhor
  junto do build de produção.
- Replicar endereços 2.0 no storefront web.
