import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/universe': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/var': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/es': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/risk': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
