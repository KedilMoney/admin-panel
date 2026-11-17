import path from 'node:path';
import { defineConfig } from 'vitest/config';

/** Vitest-only tests; other `*.test.ts` files use Node's test runner. */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/lib/planner-icon-artwork.test.ts'],
  },
});
