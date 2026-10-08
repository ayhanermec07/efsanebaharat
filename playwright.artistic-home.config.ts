import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e', testMatch: 'artistic-home.spec.ts', outputDir: './test-results/artistic-home', timeout: 30_000, workers: 1, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4193', channel: 'chrome', headless: true, trace: 'retain-on-failure' },
  projects: [390, 1440].map(width => ({ name: `${width}px`, use: { viewport: { width, height: width < 768 ? 844 : 1024 } } })),
  webServer: { command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4193 --strictPort', url: 'http://127.0.0.1:4193',
    env: { VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_ANON_KEY: 'artistic-ui-local-fixture' }, reuseExistingServer: false },
})
