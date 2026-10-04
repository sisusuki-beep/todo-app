import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // 開発時は /api をバックエンド(FastAPI)へ転送する
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
