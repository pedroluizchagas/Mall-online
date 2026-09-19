import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.test.ts'],
    exclude: ['node_modules', '.next'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      '@mallevo/lib': path.resolve(__dirname, '../../packages/lib/index.ts'),
      '@mallevo/types': path.resolve(__dirname, '../../packages/types/index.ts'),
    },
  },
})
