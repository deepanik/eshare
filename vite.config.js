import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Explicitly define env prefix (Vite defaults to 'VITE_' but being explicit helps)
  envPrefix: 'VITE_',
})
