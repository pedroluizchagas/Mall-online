# 06 — Onboarding e extração de cor

> Absorve e estrutura o antigo `experiencia-onboarding-loja-parceiros.md`. Define como o lojista **chega** ao seu StoreTheme: confirmação de dados → branding → escolha de template (sugerido pelo nicho) → paleta (sugerida pela logo).

## 6.1 A experiência (visão do produto)

Do doc original: *"Os parceiros navegam por um onboarding como o de criação de conta, para a criação da loja ficar mais fácil e fluida."* O fluxo encadeia o que já existe com a nova etapa de tema:

```
1. Confirmar dados básicos   (já preenchidos no cadastro — só confirma e avança)
2. Branding                  (logo, banner, marca d'água, descrição)
3. Escolher template visual  (arquétipos do nicho, com sugestão destacada)
4. Ajustar paleta            (sugerida a partir da logo; editável livremente)
5. Preview + publicar        (vê a loja no tema antes de ativar)
```

A etapa 3–4 é o coração do StoreTheme. As etapas 1–2 já têm base no dashboard atual e no `minha-loja-editor.tsx`.

## 6.2 Etapa 3 — escolha de template (arquétipo)

- Mostrar **apenas os arquétipos compatíveis com o nicho** da loja (mapa em [02 §2.3]), com o **default destacado** como "recomendado para o seu negócio".
- Cada opção é um **card de preview** vivo (mini-mockup com a logo/banner já enviados aplicados ao arquétipo) — não um nome abstrato.
- O lojista pode escolher uma alternativa compatível; o avançado pode liberar todos (decisão de produto).
- Reaproveitar a UI de seleção já existente em `apps/web/components/dashboard/minha-loja-editor.tsx` (hoje lista `market/boutique/artesanal/neon` como cards) — trocar o conteúdo para os 6 arquétipos.

## 6.3 Etapa 4 — paleta a partir da logo

Do doc original: *"As cores serão puxadas de acordo com a logo; se a logo tiver cores neutras, apresentamos as cores que fazem sentido para o negócio — apenas como sugestão; o usuário pode alterar como quiser."*

Pipeline sugerido:
1. **Extrair cores dominantes** da logo no upload (quantização — ex.: lib tipo `node-vibrant`/`colorthief`, server-side no fluxo de upload que já existe).
2. **Classificar:** se as dominantes têm saturação/contraste suficientes → propor como `accent` (+ derivar `accentInk` por contraste). Se neutras → cair na **paleta default do arquétipo** ([03 §3.3]).
3. **Apresentar 2–3 paletas sugeridas** + opção "personalizar" (color pickers para `accent`, `bg`, `ink`).
4. O resultado vira os **overrides** salvos em `stores.theme` ([03 §3.4]).

Sempre sugestão: nada é imposto. A validação de contraste ([05 §5.5]) roda no momento do save.

## 6.4 Wizard por nicho (reaproveita DashboardTemplate)

O `DashboardTemplate` já define `onboarding.wizardSteps` por nicho (ex.: fashion pergunta "O que você vende?" e "Tem loja física?"). Essas respostas:
- Já alimentam a configuração funcional da loja (uso atual).
- **Podem refinar a sugestão de arquétipo** — ex.: fashion + "streetwear" → sugerir `raw` em vez do default `editorial`. Esse mapeamento fino é opcional (fase 2 do roadmap).

## 6.5 Persistência

Ao concluir, o onboarding chama a action de publicar tema — evolução de `apps/web/lib/actions/loja-vitrine.ts` (hoje grava `{template,paleta}`), agora gravando o `StoreTheme v2` ([03 §3.4]). O preview (etapa 5) usa exatamente o `resolveTheme` ([04](04-theme-engine.md)) que o storefront/app usarão — garantindo "o que vejo é o que publico".

## 6.6 Edição posterior

Tudo isso continua acessível fora do onboarding, na página **Minha Loja** do dashboard (`minha-loja-editor.tsx`), para o lojista reabrir e ajustar template/paleta/branding quando quiser.
</content>
