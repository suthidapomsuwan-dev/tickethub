import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { env } from 'node:process'

// https://vite.dev/config/
export default defineConfig({
  base: env.GITHUB_ACTIONS ? '/tickethub/' : '/',
  plugins: [react()],
})
