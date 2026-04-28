import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'

const startFetch = createStartHandler(defaultStreamHandler)

async function handleRequest(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url)

  // Route /api/auth/* directly to better-auth before TanStack Start's router.
  // TanStack Router's catch-all ($.ts) sets routeParams["**"] which makes
  // isExactMatch=false, so server.handlers on that route never execute.
  if (pathname.startsWith('/api/auth/')) {
    try {
      const { auth } = await import('./server/auth')
      return auth.handler(request)
    } catch (e) {
      console.error('[server] /api/auth error:', e)
      return new Response(String(e), { status: 500 })
    }
  }

  return startFetch(request)
}

export default { fetch: handleRequest }
