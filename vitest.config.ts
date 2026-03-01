import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/extensions/**'],
      reporter: ['text', 'lcov', 'json-summary'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@lib': new URL('./src/lib', import.meta.url).pathname,
      '@extensions': new URL('./src/extensions', import.meta.url).pathname,
    },
  },
});
