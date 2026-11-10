import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { devApiPlugin } from './src/server/devApi.ts'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true, // expõe na rede local para celulares e outros computadores
    port: 5173,
  },
  plugins: [react(), tailwindcss(), devApiPlugin()],
})
