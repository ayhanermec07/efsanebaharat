import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import sourceIdentifierPlugin from 'vite-plugin-source-identifier'

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
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
}))
