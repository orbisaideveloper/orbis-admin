import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiTarget = 'http://127.0.0.1:3001'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: apiTarget,
      },
      '/health': {
        target: apiTarget,
      },
    },
  },
  preview: {
    allowedHosts: ['orbis-admin-staging.onrender.com'],
  },
})
