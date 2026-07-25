import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ command, mode }) => ({
  plugins: mode === 'test' ? [react()] : [react(), cloudflare({
    inspectorPort: false,
    ...(command === 'serve' && process.env.CLOUDFLARE_REMOTE !== 'true' ? { configPath: './wrangler.demo.jsonc' } : {}),
  })],
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
}))
