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
      // Pages のデプロイ対象は dist/client（wrangler.toml の pages_build_output_dir）。
      // dist/ 直下に置くと本番に配信されず /sw.js が 404 になる。
      const swSrc = path.resolve('src/sw.js')
      const swDest = path.resolve('dist/client/sw.js')
      fs.mkdirSync(path.dirname(swDest), { recursive: true })
      fs.copyFileSync(swSrc, swDest)
      console.log('[nafuda-pwa] sw.js copied to dist/client/')
    },
  }
}

export default defineConfig(({ command }) => ({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
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
  build: {
    target: ['es2020', 'chrome87', 'firefox78', 'safari14', 'edge88'],
    rollupOptions: {
      external: ['cloudflare:workers'],
    },
  },
  optimizeDeps: {
    exclude: ['@better-auth/kysely-adapter'],
  },
  ssr: {
    noExternal: ['emblor', 'react-hook-form'],
    // Dev では workerd が cloudflare: モジュールを解決するため external 指定は
    // 不要（プラグインの環境検証で拒否される）。ビルド時のみ必要。
    ...(command === 'build' ? { external: ['cloudflare:workers'] } : {}),
  },
}))
