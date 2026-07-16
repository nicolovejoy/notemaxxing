import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules', '.next', 'drizzle'],
    // Every DB test spins a fresh PGlite and runs the real migrations in its
    // beforeEach. That's ~200ms warm, but well past the default 10s hook budget
    // when a file's tests run serially on a loaded machine — it flaked at 31
    // tests in one file. Raise the ceiling rather than share databases between
    // tests; isolation is what makes these trustworthy.
    hookTimeout: 30_000,
  },
})
