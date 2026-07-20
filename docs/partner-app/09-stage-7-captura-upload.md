# Stage 7 — Captura, Compressão e Upload (Fotos e Vídeos)

> O coração do pilar Conteúdo: fotografar/gravar/escolher → comprimir →
> revisar → legenda + produto → publicar, sem sair do celular. Depende dos
> Stages 0–2.

## Fluxo (uma tela com passos, não wizard longo)

```
[Permissões] -> [Capturar foto | Gravar vídeo | Galeria] -> [Preview] -> [Detalhes] -> [Upload] -> [Publicado]
```

### 1. Permissões

`expo-camera` (câmera + microfone) e biblioteca de mídia. Pedir no momento do
uso, com fallback claro se negado (texto + botão "Abrir ajustes" via
`Linking.openSettings()`). Sem permissão de câmera, ainda permitir caminho
"Galeria".

### 2. Captura

- **Câmera** (`CameraView`, vertical fullscreen — mesma lente visual do
  Explorar do consumer, base dark): alternância **Foto | Vídeo** no shutter
  (tap = foto; modo vídeo = gravar), timer, **corte automático em 60 s**
  (limite do schema: `duracao_seg BETWEEN 1 AND 120`, alvo de produto 60 s),
  front/back, flash.
- **Galeria**: `expo-image-picker` (`mediaTypes: All`, `videoMaxDuration:
  60`, permite trim nativo onde houver).

Saída dos dois caminhos: um `uri` local + o `tipo` (`video` | `foto`).

### 3. Compressão (client-side)

**Vídeo** — `react-native-compressor` antes de qualquer upload:

- Alvo: **H.264 + AAC, .mp4**, ~1080p (downscale se maior), bitrate ~6–8 Mbps,
  resultado tipicamente **5–25 MB** (cap duro do bucket = 50 MB).
- Padronizar **H.264/AAC** é obrigatório: o consumer toca via `expo-video`
  (`VideoView`); HEVC/codecs exóticos podem não renderizar. Validar playback no
  consumer com amostras reais antes de fechar o stage.
- Mostrar progresso de compressão (passo separado do upload).
- Thumbnail: `expo-video-thumbnails` no segundo ~1 → `.jpg` (~720p).

**Foto** — `expo-image-manipulator`: redimensionar para ≤ 1440 px no maior
lado, JPEG qualidade ~0.85 (resultado típico < 1 MB). `thumb` = versão ~720p
da própria imagem (a `GaleriaGrid` do consumer usa thumb).

### 4. Preview + detalhes

- Preview: vídeo com `expo-video` (loop, mute toggle); foto fullscreen —
  espelha o `ReelItem` do consumer para o lojista ver "como vai aparecer".
- Campos:
  - `descricao` (≤ 600, contador) — opcional mas incentivado.
  - `tags` (chips; normalizar para `#minuscula-sem-espaco`; máx ~5).
  - `produto` (opcional): busca em `products` da loja ativa (RLS já filtra),
    seleção única → `product_id`.
- `store_id` = `lojaAtivaId` (Stage 2). Loja exibida no topo (read-only +
  trocar).

### 5. Upload

Caminho dos objetos (case-sensível, exatamente o prefixo das policies):

```
explore-media/{tenant_id}/{store_id}/{uuid}.mp4   (vídeo)
explore-media/{tenant_id}/{store_id}/{uuid}.jpg   (foto do post OU thumb do vídeo)
```

- **Vídeo**: upload **resumível (TUS)** do `supabase-js`, não `upload()`
  multipart. Vídeo primeiro, thumb depois; só seguir para o passo 6 com os
  **dois** objetos confirmados (HTTP ok do Storage).
- **Foto**: ≤ ~1 MB — upload simples é aceitável; thumb em seguida (ou thumb
  = próprio original, se ficar dentro do alvo; registrar a escolha no RESUMO).
- `useUploadStore` (Zustand) controla 1 publicação por vez: estado
  (`comprimindo | enviando | criando-registro | concluido | erro`), `progress`
  0–1, ação `cancelar`, ação `tentarNovamente` (vídeo retoma do offset, não
  do zero).
- Resiliência: retry com backoff em falha de rede; se o app for pra background
  durante o envio, retomar ao voltar (o TUS guarda offset). Bloquear navegação
  com upload ativo (aviso).

### 6. Criar registro `store_posts`

Após os objetos confirmados, `insert` em `store_posts` (RLS
`store_posts_insert_proprio` valida tenant+loja):

```ts
await supabase.from('store_posts').insert({
  store_id: lojaAtivaId,
  tenant_id: tenant.id,
  product_id: produtoSelecionado?.id ?? null,
  tipo,                               // 'video' | 'foto'
  media_path: mediaPath,
  media_url: pub(mediaPath),          // getPublicUrl
  thumb_path: thumbPath,
  thumb_url: pub(thumbPath),
  descricao, tags,
  duracao_seg: tipo === 'video' ? duracaoSeg : null,
  largura, altura, bytes,
  status: 'published',                // ver decisão de moderação no Stage 0
  publicado_em: new Date().toISOString(),
})
```

- `status`: `published` direto **se** a decisão de moderação do Stage 0 for
  `approved` por padrão; senão `processing`/`pending` e o post aparece em
  "Meu conteúdo" como "em análise". Não duplicar a decisão — ler o que o
  Stage 0 fechou.
- **Atomicidade prática**: se o `insert` falhar após o upload, o objeto fica
  órfão. Mitigar: (a) registro logo após confirmação; (b) Stage 8 detecta
  objeto sem registro e oferece "retomar publicação" / limpeza; (c) job de
  limpeza de órfãos > 24 h é item de roadmap, não MVP.

### 7. Sucesso

Confirmação + atalho "Ver em Meu conteúdo" (Stage 8) e "Publicar outro".

## Considerações

- **Sem transcode server-side** (decisão §7 do `01`). Toda normalização é a
  compressão client. Se a validação de codec no consumer falhar de forma
  recorrente, escalar para a opção B do `01` — mas isso é mudança de
  arquitetura, não conserto dentro do stage.
- **Tamanho**: cap de 50 MB no bucket é a rede de segurança; o alvo real de
  compressão fica bem abaixo. Se estourar, recomprimir mais agressivo antes de
  bloquear o lojista.
- **Offline**: sem conexão, permitir capturar/comprimir e enfileirar; enviar
  quando voltar (estado persistido em `useUploadStore`). Fila multi-item é
  pós-MVP; MVP garante 1 upload robusto.

## Critérios de aceite

- [ ] Foto, vídeo gravado (60 s) e mídia da galeria geram o mesmo fluxo até
      publicar.
- [ ] Compressão de vídeo produz .mp4 H.264/AAC < 50 MB com progresso
      visível; foto sai ≤ 1440 px / ~< 1 MB.
- [ ] Thumbnail .jpg gerado e enviado junto (vídeo e foto).
- [ ] Upload de vídeo resumível: matar a rede no meio e retomar conclui sem
      reiniciar.
- [ ] Objetos no prefixo `{tenant_id}/{store_id}/`; RLS rejeita prefixo de
      outro tenant (teste negativo).
- [ ] Registro `store_posts` criado com `tipo` correto e visível na view
      `public_explore_feed`.
- [ ] Vídeo publicado **toca no `apps/mobile-consumer`** via `expo-video`
      (validação de codec real); foto renderiza nítida.
