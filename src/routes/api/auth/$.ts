// Catch-all route for all /api/auth/* requests — proxies to Better Auth handler
import { createFileRoute } from '@tanstack/react-router'

async function getAuthHandler(request: Request): Promise<Response> {
  // Dynamic import so module-level throws (missing env vars, DB init) are catchable
  const { auth } = await import('../../../server/auth')
  return auth.handler(request)
}

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          return await getAuthHandler(request)
        } catch (e) {
          console.error('[/api/auth] GET error:', e)
          return new Response(String(e), { status: 500 })
        }
      },
      POST: async ({ request }) => {
        try {
          return await getAuthHandler(request)
        } catch (e) {
          console.error('[/api/auth] POST error:', e)
          return new Response(String(e), { status: 500 })
        }
      },
    },
  },
})
