import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Node environment for backend unit + integration tests.
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    // Integration tests boot the container and share module-level singletons,
    // so run test files sequentially to keep the shared store deterministic.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
