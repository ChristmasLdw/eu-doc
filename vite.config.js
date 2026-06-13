import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/eu-doc/',
  server: {
    proxy: {
      '/eu-doc/api': {
        target: 'http://localhost:3007',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/eu-doc\/api/, '/api')
      },
      '/eu-doc/certificates': {
        target: 'http://localhost:3007',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/eu-doc/, '')
      },
      '/eu-doc/uploads': {
        target: 'http://localhost:3007',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/eu-doc/, '')
      }
    }
  }
})
