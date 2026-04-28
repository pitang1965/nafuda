const ASSET_CACHE = 'nafuda-assets-v1'
const PAGE_CACHE = 'nafuda-pages-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== ASSET_CACHE && k !== PAGE_CACHE)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // /me: NetworkFirst — オフライン時はキャッシュから応答
  if (url.pathname === '/me' || url.pathname.startsWith('/me/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            caches.open(PAGE_CACHE).then(c => c.put(request, response.clone()))
          }
          return response
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // 静的アセット (JS/CSS/画像): CacheFirst
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          caches.open(ASSET_CACHE).then(c => c.put(request, response.clone()))
          return response
        })
      })
    )
  }
})
