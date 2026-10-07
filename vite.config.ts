import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import { validateProductionConfig } from './scripts/production-config.mjs'
import sourceIdentifierPlugin from 'vite-plugin-source-identifier'

export default defineConfig(({ command, mode }) => {
  const environment = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }
  if (command === 'build' && mode === 'production') {
    validateProductionConfig(environment as Record<string, string>)
  }
  return ({
  plugins: [
    react(),
    {
      name: 'media-preconnect',
      transformIndexHtml: (html: string) => html.replace('<!-- media-preconnect -->',
        environment.VITE_MEDIA_TRANSFORMS === 'true' && environment.VITE_MEDIA_BASE_URL
          ? `<link rel="preconnect" href="${new URL(environment.VITE_MEDIA_BASE_URL).origin}" />` : ''),
    },
    // Source identifiers assist local development but add significant work
    // during a production bundle build.
    ...(command === 'serve' ? [
      sourceIdentifierPlugin({
        enabled: true,
        attributePrefix: 'data-matrix',
        includeProps: true,
      })
    ] : [])
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    hmr: {
      overlay: true,
    },
    watch: {
      usePolling: false,
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})
})
