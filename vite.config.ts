import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { devApiPlugin } from './src/server/devApi.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), devApiPlugin()],
})
