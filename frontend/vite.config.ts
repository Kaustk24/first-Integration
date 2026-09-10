import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// Vite config — https://vitejs.dev/config/
const BACKEND_TARGET = process.env.VITE_BACKEND_PROXY_TARGET || 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Proxy API calls straight through to the FastAPI backend during `npm run dev`,
    // so the frontend can call relative paths like `/predict/RELIANCE` with zero CORS setup.
    proxy: {
      '/predict': { target: BACKEND_TARGET, changeOrigin: true },
      '/api': { target: BACKEND_TARGET, changeOrigin: true },
      '/health': { target: BACKEND_TARGET, changeOrigin: true },
      '/fyers': { target: BACKEND_TARGET, changeOrigin: true },
      '/retrain': { target: BACKEND_TARGET, changeOrigin: true },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
  },
})
