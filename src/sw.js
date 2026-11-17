const ASSET_CACHE = 'nafuda-assets-v1'
const PAGE_CACHE = 'nafuda-pages-v2'

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
  // redirect:'manual' でリダイレクト先コンテンツを /me キャッシュに書き込まない。
  // サーバーが /login へリダイレクトした場合はブラウザがそのまま追跡し URL が変わる。
  if (url.pathname === '/me' || url.pathname.startsWith('/me/')) {
    event.respondWith(
      fetch(request, { redirect: 'manual' })
        .then(response => {
          if (response.ok && !response.redirected) {
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
          // 一時的な 404/500 を永続化しない。R2 のアバター等は別ドメインの opaque 応答で
          // 成否が見えないが、オフライン /me 表示に要るので保存する
          // shortcut: opaque は R2 側の 404/500 も保存してしまう、R2 に CORS を設定し <img crossOrigin> にしたら response.ok だけにする
          if (response.ok || response.type === 'opaque') caches.open(ASSET_CACHE).then(c => c.put(request, response.clone()))
          return response
        })
      })
    )
  }
})
