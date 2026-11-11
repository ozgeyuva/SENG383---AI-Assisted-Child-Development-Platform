import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { env } from 'node:process'

export default defineConfig({
  plugins: [react()],
  test: {
  environment: 'jsdom',
},
  server: {
    proxy: {
      '/api': {
        target: env.E2E_API_URL || 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
})