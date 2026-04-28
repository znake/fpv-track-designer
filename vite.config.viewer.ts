import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { fileURLToPath, URL } from 'node:url'
import { existsSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'

function renameViewerHtmlToIndex(): Plugin {
  return {
    name: 'rename-viewer-html-to-index',
    writeBundle(options) {
      if (!options.dir) return

      const viewerPath = join(options.dir, 'viewer.html')
      const indexPath = join(options.dir, 'index.html')
      if (!existsSync(viewerPath)) return

      if (existsSync(indexPath)) {
        rmSync(indexPath)
      }
      renameSync(viewerPath, indexPath)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), renameViewerHtmlToIndex()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist-viewer',
    rollupOptions: {
      input: fileURLToPath(new URL('./viewer.html', import.meta.url)),
    },
  },
})
