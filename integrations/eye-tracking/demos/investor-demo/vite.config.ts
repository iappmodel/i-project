import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // lightningcss minify rejects @keyframes in bundled CSS; skip minify instead of pinning esbuild.
    cssMinify: false,
  },
})
