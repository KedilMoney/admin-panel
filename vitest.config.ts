import { defineConfig } from 'vitest/config';

/** Vitest-only tests; other `*.test.ts` files use Node's test runner. */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/lib/planner-icon-artwork.test.ts'],
  },
});