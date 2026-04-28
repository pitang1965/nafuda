import ssrHandler from './dist/server/server.js';

const STATIC_EXTENSIONS =
  /\.(css|js|mjs|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|avif|webmanifest|txt|xml|map)$/i;

export default {
  async fetch(request, env, ctx) {
    if (env.ASSETS) {
      const { pathname } = new URL(request.url);
      // Only proxy clearly static files to ASSETS — never HTML pages.
      // Cloudflare Pages ASSETS serves index.html as SPA fallback for unknown
      // paths, so forwarding HTML requests would bypass SSR entirely.
      if (pathname.startsWith('/assets/') || STATIC_EXTENSIONS.test(pathname)) {
        const response = await env.ASSETS.fetch(request);
        if (response.status !== 404) return response;
      }
    }
    return ssrHandler.fetch(request, env, ctx);
  },
};
