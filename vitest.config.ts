import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: false,
    setupFiles: ['./tests/setup/testDb.ts'],
    environment: 'node',
    isolate: false,
    threads: true,
    testTimeout: 20000,
  },
})
