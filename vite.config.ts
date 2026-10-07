import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the build works from any path (GitHub Pages, Netlify, a sub-folder).
  base: './',
  plugins: [react()],
})
