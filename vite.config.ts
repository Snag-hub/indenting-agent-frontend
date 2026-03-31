import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import path from 'path'

export default defineConfig({
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
})
