import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import fs from 'node:fs'

function nafudaPwaPlugin(): Plugin {
  return {
    name: 'nafuda-pwa',
    apply: 'build',
    writeBundle() {
      const swSrc = path.resolve('src/sw.js')
      const swDest = path.resolve('dist/sw.js')
      fs.copyFileSync(swSrc, swDest)
      console.log('[nafuda-pwa] sw.js copied to dist/')
    },
  }
}

export default defineConfig(({ command }) => ({
  plugins: [
    cloudflare({
      // Dev uses a Workers-style wrangler config (with `main`) so the plugin
      // installs request middleware.  Build uses the Pages config as-is.
      configPath: command === 'serve' ? 'wrangler-dev.toml' : undefined,
      viteEnvironment: { name: 'ssr' },
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    nafudaPwaPlugin(),
  ],
  ssr: {
    noExternal: ['emblor'],
  },
}))
