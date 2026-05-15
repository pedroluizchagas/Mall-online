# Stage 4 — Corte de domínio Vercel (runbook)

Maior risco operacional. Um domínio pertence a **um único projeto Vercel**.
Mover o wildcard + cada domínio custom por tenant tem janela de downtime
(unbind → rebind → emissão de SSL). Mitigar com ensaio, script back-to-back e
janela de baixo tráfego. CNAMEs Cloudflare NÃO mudam (apontam
`cname.vercel-dns.com`).

## Ordem (minimiza downtime)

1. **(Código)** Stages 0–3 mergeados em `apps/storefront`. **Não tocar**
   `apps/web/middleware.ts` ainda — web continua servindo o wildcard.
2. **(Vercel UI)** Criar projeto Vercel novo. Root Directory `apps/storefront`,
   build `pnpm turbo run build --filter=storefront`. Setar env vars (Stage 1).
   Deploy → URL `*.vercel.app`.
3. **(Ensaio — OBRIGATÓRIO)** Apontar um domínio de teste único
   `staging-loja.mallevo.com.br` ao projeto storefront. Smoke-test e2e
   completo. Validar emissão de SSL e tempo real de propagação. **Só avançar
   se o ensaio for limpo.**
4. **(Janela de corte — baixo tráfego)** Mover `*.mallevo.com.br` do projeto
   web → storefront: remover de web e adicionar em storefront **back-to-back**
   (script via API Vercel). Mover também cada domínio custom por tenant
   (`{slug}.mallevo.com.br`). Monitorar emissão de cert por domínio.
5. **(Verificar)** `app.mallevo.com.br` permanece em web;
   `admin.mallevo.com.br` em admin (não afetados — estavam em
   `IGNORED_SUBDOMAINS`). Confirmar que continuam no ar.
6. **(Código, após passo 4 confirmado)** PR removendo de
   `apps/web/middleware.ts` o bloco de subdomínio (`getSubdomain`,
   `if(slug){rewrite}`, `MAIN_DOMAINS`/`IGNORED_SUBDOMAINS`), **mantendo**
   refresh de token + onboarding. Deletar stub
   `apps/web/app/loja/[slug]/page.tsx`. Remover
   `*.mallevo.com.br`/`*.mallevo.localhost` de `apps/web/next.config.mjs`
   `allowedOrigins`. Deploy web.
7. **(Env)** Copiar Project ID do storefront → atualizar `VERCEL_PROJECT_ID`
   no projeto web (provisionamento de novos tenants roda lá — D6). Redeploy web.
8. **(Verificar)** Provisionar tenant de teste novo pelo Dashboard
   ponta-a-ponta; confirmar CNAME no Cloudflare + domínio anexado ao **projeto
   storefront**.

## Rollback

Se o passo 4 falhar (cert travado / tráfego caindo): re-adicionar
`*.mallevo.com.br` ao projeto web (que ainda tem o rewrite intacto até o passo
6) restaura o estado anterior. Por isso o passo 6 só acontece **depois** do 4
confirmado estável.

## Critérios de aceite

- [ ] Ensaio `staging-loja` e2e limpo antes do corte real.
- [ ] Wildcard + domínios custom no projeto storefront, SSL ativo.
- [ ] `app.`/`admin.` intactos durante e depois.
- [ ] `apps/web/middleware.ts` sem bloco de subdomínio, com token refresh/onboarding intactos.
- [ ] Stub `loja/[slug]` removido; `allowedOrigins` do web limpo.
- [ ] `VERCEL_PROJECT_ID` do web aponta para projeto storefront.
- [ ] Tenant novo provisionado e-2-e aponta para storefront.

## Notas

- Passos de Vercel UI / DNS são **operacionais** — executados por humano com
  acesso à conta Vercel/Cloudflare, não pelo agente executor. O agente entrega
  só o código dos passos 1 e 6 e, se útil, o script back-to-back do passo 4.
- Documentar a janela e o resultado em `docs/storefront/00-INDEX.md` (status).
