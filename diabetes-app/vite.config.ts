import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// `base` is set for GitHub Pages project sites (served from /<repo>/). It can be
// overridden via VITE_BASE; defaults to root for local dev.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
})
