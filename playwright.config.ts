import { defineConfig } from '@playwright/test'

const widths = [320, 360, 375, 390, 412, 430, 768, 1024, 1280, 1440]

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    channel: 'chrome',
    headless: true,
    trace: 'retain-on-failure',
    navigationTimeout: 15_000,
  },
  projects: widths.map((width) => ({
    name: `${width}px`,
    use: { viewport: { width, height: 900 } },
  })),
  webServer: {
    command: 'npm run dev:test',
    url: 'http://127.0.0.1:4173/urunler',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
