import ssrHandler from './dist/server/server.js';

const STATIC_EXTENSIONS =
  /\.(css|js|mjs|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|avif|mp4|webm|mp3|m4a|wav|ogg|pdf|webmanifest|txt|xml|map)$/i;

export default {
  async fetch(request, env, ctx) {
    // Cloudflare Workers with nodejs_compat does not expose env bindings via
    // process.env automatically.  Inject string vars so server code that uses
    // process.env (auth.ts, db/client.ts) can read them.
    for (const [key, val] of Object.entries(env)) {
      if (typeof val === 'string') process.env[key] = val
    }

    if (env.ASSETS) {
      const { pathname } = new URL(request.url);
      // Only proxy clearly static files to ASSETS — never HTML pages.
      // Cloudflare Pages ASSETS serves index.html as SPA fallback for unknown
      // paths, so forwarding HTML requests would bypass SSR entirely.
      if (pathname.startsWith('/assets/') || STATIC_EXTENSIONS.test(pathname)) {
        const response = await env.ASSETS.fetch(request);
        if (response.status !== 404) return response;
        // Missing asset: return a plain 404 instead of the SSR 404 page.
        // Cloudflare edge-caches responses for these extensions (zone default
        // 4h), so an SSR-rendered 404 without cache-control would get pinned.
        return new Response('Not Found', {
          status: 404,
          headers: { 'cache-control': 'no-store' },
        });
      }
    }
    return ssrHandler.fetch(request, env, ctx);
  },
};
