import { defineConfig, devices } from '@playwright/test'

/**
 * E2E do dashboard contra o Supabase LOCAL (supabase start + db reset com
 * supabase/seed.sql). Nunca aponta para produção: as variáveis vêm de
 * `scripts/qa-local.sh`, que lê `supabase status -o env`.
 *
 * Rodar: `pnpm qa:local` na raiz (sobe Supabase, reseta com o seed, executa).
 */
const PORT = 3100
const baseURL = `http://127.0.0.1:${PORT}`

// Chaves padrão do Supabase CLI local (iguais em toda instalação), usadas
// só quando o script não exportou as suas.
const LOCAL_URL = process.env.QA_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const LOCAL_ANON =
  process.env.QA_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const LOCAL_SERVICE =
  process.env.QA_SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL,
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  // Variáveis de ambiente vencem os .env* do Next — os dois apps sobem
  // apontando para o Supabase local, sem tocar nos .env.local de produção.
  webServer: [
    {
      command: `pnpm exec next dev -p ${PORT}`,
      url: baseURL,
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: LOCAL_URL,
        SUPABASE_URL: LOCAL_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: LOCAL_ANON,
        SUPABASE_SERVICE_ROLE_KEY: LOCAL_SERVICE,
        // O preview de Minha Loja embute o storefront local (abaixo).
        NEXT_PUBLIC_STOREFRONT_URL_TEMPLATE: 'http://{slug}.mallevo.localhost:3002',
      },
    },
    {
      // Storefront contra o mesmo seed: é o que o iframe do preview carrega.
      command: 'pnpm --filter storefront exec next dev -p 3002',
      url: 'http://localhost:3002/termos',
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: LOCAL_URL,
        SUPABASE_URL: LOCAL_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: LOCAL_ANON,
        SUPABASE_SERVICE_ROLE_KEY: LOCAL_SERVICE,
      },
    },
  ],
})
