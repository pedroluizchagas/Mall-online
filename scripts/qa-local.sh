#!/usr/bin/env bash
# QA local da convergência: Supabase local + seed demo + e2e do dashboard.
# Pré-requisito: Docker daemon rodando (sudo systemctl start docker).
set -euo pipefail
cd "$(dirname "$0")/.."

if ! docker ps >/dev/null 2>&1; then
  echo "Docker não está rodando. Inicie com: sudo systemctl start docker" >&2
  exit 1
fi

echo "▶ supabase start"
supabase start >/dev/null
echo "▶ supabase db reset (migrations + supabase/seed.sql)"
supabase db reset

# Exporta as chaves do Supabase local para o Playwright (playwright.config.ts).
eval "$(supabase status -o env | sed -n 's/^API_URL=/export QA_SUPABASE_URL=/p; s/^ANON_KEY=/export QA_SUPABASE_ANON_KEY=/p; s/^SERVICE_ROLE_KEY=/export QA_SUPABASE_SERVICE_ROLE_KEY=/p')"

echo "▶ e2e do dashboard (apps/web)"
pnpm --filter web e2e "$@"
echo "✔ capturas em apps/web/test-results/shots/"
