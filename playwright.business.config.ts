import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e', testMatch: 'business-information.spec.ts', timeout: 30_000, workers: 1, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4176', channel: 'chrome', headless: true, trace: 'retain-on-failure' },
  projects: [360, 390, 768, 1440].map(width => ({ name: `${width}px`, use: { viewport: { width, height: 900 } } })),
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4176 --strictPort',
    url: 'http://127.0.0.1:4176',
    env: { VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_ANON_KEY: 'business-ui-local-fixture' },
    reuseExistingServer: false,
  },
})
