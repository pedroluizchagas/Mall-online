import path from 'node:path'
import { defineConfig } from 'vitest/config'

/**
 * Testes de unidade do dashboard (Fase 6): helpers puros das server actions
 * — origem da mídia (A-03) e diff do que sai do Storage (A-04). O e2e
 * autenticado continua no Playwright (`e2e/*.spec.ts`, exige Docker).
 * Espelha apps/storefront/vitest.config.ts.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.test.ts'],
    exclude: ['node_modules', '.next', 'e2e'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      '@mallevo/lib': path.resolve(__dirname, '../../packages/lib/index.ts'),
      '@mallevo/types': path.resolve(__dirname, '../../packages/types/index.ts'),
    },
  },
})
