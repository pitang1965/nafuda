import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest, removeResponseHeader } from '@tanstack/react-start/server'
import { auth } from '../server/auth'

// auth.api.getSession sets cookies on the h3Event response (including session_data for
// cookieCache, and Set-Cookie: Max-Age=0 via deleteSessionCookie when session is invalid).
// When the session is null we strip Set-Cookie from the h3Event before the redirect so that
// the cookie-deletion command does not reach the browser — the session token stays intact
// and the user can re-authenticate without losing their cookie.
// When the session is valid, Set-Cookie (e.g. session_data refresh) flows normally.
const getSession = createServerFn({ method: 'GET' })
  .handler(async () => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
      removeResponseHeader('set-cookie')
    }
    return session
  })

export const Route = createFileRoute('/_protected')({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) {
      throw redirect({ to: '/login' })
    }
    return { session }
  },
  component: () => <Outlet />,
})
