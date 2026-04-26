import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> }

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// /me ページ: NetworkFirst（オフライン時はキャッシュから応答）
registerRoute(
  ({ url }) => url.pathname === '/me' || url.pathname.startsWith('/me'),
  new NetworkFirst({
    cacheName: 'nafuda-pages',
    networkTimeoutSeconds: 3,
    plugins: [],
  })
)

// 静的アセット: CacheFirst（JS/CSS/画像）
registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style' || request.destination === 'image',
  new CacheFirst({
    cacheName: 'nafuda-assets',
  })
)
