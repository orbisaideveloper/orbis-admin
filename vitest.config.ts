import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
    setupFiles: ['./vitest.setup.ts'],
    include: [
      './apps/web/src/**/*.test.{ts,tsx}',
      './apps/api/src/**/*.test.ts',
      './packages/contracts/src/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'apps/web/src/App.tsx',
        'apps/web/src/main.tsx',
        'apps/web/src/model.ts',
        'apps/api/src/index.ts',
        'packages/contracts/src/health.ts',
      ],
      thresholds: {
        lines: 100,
        statements: 100,
        functions: 100,
        branches: 100,
      },
    },
  },
})
