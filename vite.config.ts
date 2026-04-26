import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { injectManifest } from 'workbox-build'
import path from 'node:path'

function nafudaPwaPlugin(): Plugin {
  return {
    name: 'nafuda-pwa',
    apply: 'build',
    async writeBundle() {
      const swSrc = path.resolve('src/sw.ts')
      const swDest = path.resolve('dist/sw.js')
      const globDirectory = path.resolve('dist')

      try {
        const { count, size, warnings } = await injectManifest({
          swSrc,
          swDest,
          globDirectory,
          globPatterns: ['**/*.{js,css,html,png,svg,webmanifest,ico}'],
        })
        console.log(`[nafuda-pwa] SW generated: ${count} files (${Math.round(size / 1024)}KB)`)
        if (warnings.length) console.warn('[nafuda-pwa] Warnings:', warnings)
      } catch (err) {
        console.error('[nafuda-pwa] SW generation failed:', err)
        throw err
      }
    },
  }
}

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    nafudaPwaPlugin(),
  ],
  ssr: {
    noExternal: ['emblor'],
  },
})
