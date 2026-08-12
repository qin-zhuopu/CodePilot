import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/': path.resolve(__dirname, './src/') + '/',
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Development proxy: browser -> Vite (5173) -> NestJS backend (4000) -> Next.js API (3000)
      //
      // This double-hop exists only in dev mode because:
      // 1. Vite dev server handles HMR and static asset serving for the React app
      // 2. The NestJS backend is the single API entry point (auth, rate limiting, etc.)
      // 3. The Next.js backend hosts the actual API logic
      //
      // In production, the NestJS backend should serve the built Vite static assets
      // (via @nestjs/serve-static or a reverse proxy like nginx/caddy) so there is
      // no double-hop -- the browser talks directly to the backend at a single origin.
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
