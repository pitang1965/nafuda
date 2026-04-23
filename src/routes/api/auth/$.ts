// Catch-all route for all /api/auth/* requests — proxies to Better Auth handler
// Uses createFileRoute with server.handlers (TanStack Start v1 server routes API)
// Note: createAPIFileRoute from @tanstack/react-start/api is NOT available in v1.167
import { createFileRoute } from '@tanstack/react-router'
import { auth } from '../../../server/auth'

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => auth.handler(request),
    },
  },
})
