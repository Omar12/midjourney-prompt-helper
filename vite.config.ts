import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  // --- Tauri additions below ---
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: {
    // macOS uses Safari/WebKit; target safari15 for WKWebView compatibility.
    // esbuild 0.28.1 (installed for this project) does not implement the
    // destructuring-downlevel transform for safari10-14 (verified empirically:
    // esbuild.transform() throws "not supported yet" for those targets but
    // succeeds at safari15+). This app is macOS-only per D-04; safari15
    // (macOS Monterey, 2021+) is a reasonable floor for a locally-run dev build.
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari15',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
})
