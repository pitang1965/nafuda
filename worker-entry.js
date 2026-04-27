import ssrHandler from './dist/server/server.js';

export default {
  async fetch(request, env, ctx) {
    // Cloudflare Pages ASSETS binding serves static files from dist/client.
    // Try it first for every request; fall through to SSR only on 404.
    if (env.ASSETS) {
      const response = await env.ASSETS.fetch(request.clone());
      if (response.status !== 404) return response;
    }
    return ssrHandler.fetch(request, env, ctx);
  },
};
