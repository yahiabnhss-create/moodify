import { defineConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react(), command === 'serve' ? basicSsl() : null].filter(Boolean),
}))
