import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    watch: {
      // Linux inotify is small on some machines; do not watch editor/agent dirs.
      ignored: ['**/.git/**', '**/.cursor/**'],
    },
  },
  preview: {
    host: true,
    port: 4173,
  },
})
