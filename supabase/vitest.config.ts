import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test databases share the server's roles, so the files run one at a time.
    fileParallelism: false,
    include: ['tests/**/*.test.ts'],
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
});
