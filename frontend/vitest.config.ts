import {defineConfig} from 'vitest/config'
import {fileURLToPath} from 'node:url'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules', '.next', 'storybook-static'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
      // Next.js aliases this to its own compiled no-op for server code running
      // outside the client bundle; vitest needs the same alias since the bare
      // `server-only` package isn't an installed dependency.
      'server-only': fileURLToPath(
        new URL('../node_modules/next/dist/compiled/server-only/empty.js', import.meta.url),
      ),
    },
  },
})
