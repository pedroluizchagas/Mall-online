# 08 — Workflow Tech Lead

Ciclo de execução supervisionada. O tech lead (arquiteto) é dono do design;
o agente executor implementa um stage por vez.

## Ciclo por stage

```
Tech lead entrega o prompt do stage (07-prompts-execucao.md)
        │
        ▼
Executor implementa → commita na branch → produz RESUMO
        │
        ▼
Usuário devolve o RESUMO ao tech lead
        │
        ▼
Tech lead valida RESUMO contra o doc do stage (critérios de aceite)
        │
        ├─ Conforme  → atualiza status em 00-INDEX.md → próximo stage
        ├─ Ajuste    → gera prompt de correção (escopo cirúrgico) → repete
        └─ Stage 4 ok → decide merge para main
```

## Formato obrigatório do RESUMO (executor → tech lead)

O executor termina todo stage com este bloco:

```
## RESUMO — Stage <N>

### Feito
- <arquivo:linha> — o que foi implementado/alterado e por quê
- ...

### Migrations / schema (se houver)
- <arquivo> — o que muda, rollback, idempotência

### Decisões tomadas
- <decisão> — alternativa descartada e motivo

### Decisões PENDENTES (precisam do tech lead)
- <ambiguidade> — opções A/B, recomendação

### Validação
- [ ] critério de aceite 1 — como foi verificado (comando/output)
- [ ] ...
- comandos rodados: pnpm --filter ... typecheck/build → resultado

### Fora de escopo (deixado para depois)
- <item> — qual stage/subestágio cobre

### Diff
- commits: <hashes/mensagens>
- arquivos tocados: <lista>
```

## Checklist de revisão do tech lead

Para cada RESUMO:

1. **Escopo:** ficou dentro do stage? Nada de `main`, nada de stage futuro
   adiantado, nada de refactor não pedido?
2. **Decisões:** as "tomadas" respeitam D1–D6 de `01-arquitetura-e-decisoes.md`?
   As "pendentes" são reais ou o executor deveria ter seguido o doc?
3. **Critérios de aceite:** todos marcados E verificados com evidência (não só
   "ok")? Em especial:
   - Stage 0: anon lê views mas NÃO tabelas base; nenhuma policy de
     orders/consumers tocada; mobile/web compilam sem mudança de comportamento.
   - Stage 3: pedido grava `origem='storefront'`; PAN/CVV nunca no nosso
     backend; entrega via `@mallevo/lib`.
   - Stage 4: token refresh/onboarding intactos no web.
4. **Segurança:** nenhuma coluna sensível em view pública; nenhum segredo
   commitado; sessão não vaza entre hosts.
5. **Verificar, não confiar:** ler o diff real dos pontos críticos, não só o
   texto do resumo.

Decisão: **conforme** (avança) · **ajuste** (prompt cirúrgico de correção,
referenciando o item exato) · **bloqueado** (decisão de produto volta ao usuário
via pergunta).

## Critério de merge para `main`

Mergear só quando:
- Stages 0–4 conformes e validados.
- `pnpm -w typecheck` / build de `storefront`, `web`, `mobile-consumer` limpos.
- Corte de domínio (Stage 4) confirmado estável em produção (ensaio + cut ok).
- `00-INDEX.md` com todos os stages marcados ✅.

O merge em si é ação de alto impacto: o tech lead confirma com o usuário antes
de mergear/abrir PR para `main`. Stages intermediários ficam na branch
`claude/storefront-architecture-plan-51Y30` (ou PR draft), não em `main`.

## Atualização de status

Ao fechar cada stage como conforme, o tech lead atualiza a tabela de status em
`docs/storefront/00-INDEX.md` (⬜ → 🟡 em execução → ✅ concluído).
