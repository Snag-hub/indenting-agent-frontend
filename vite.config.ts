import { defineConfig, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import path from 'path'

// Vitest config lives under the `test` key. Vitest 0.34's config typings target an
// older Vite than this project uses, so we extend Vite's own UserConfig with a
// loosely-typed `test` block rather than importing defineConfig from 'vitest/config'
// (which would mis-type the plugins array against the bundled older Vite).
const config: UserConfig & { test: Record<string, unknown> } = {
  plugins: [TanStackRouterVite({ routesDirectory: './src/routes' }), react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'react'
          if (id.includes('@tanstack/react-query') || id.includes('@tanstack/react-router') || id.includes('@tanstack/react-table')) return 'tanstack'
          if (id.includes('react-hook-form') || id.includes('@hookform/resolvers') || id.includes('/zod/')) return 'forms'
          if (id.includes('lucide-react') || id.includes('date-fns')) return 'ui'
          return undefined
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5163', changeOrigin: true },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
}

export default defineConfig(config)
