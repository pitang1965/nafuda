import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '../server/auth'

// Server function to check session — uses getRequest() per TanStack Start v1 API
// Note: createServerFn handler does NOT receive context.request; use getRequest() instead
const getSession = createServerFn({ method: 'GET' })
  .handler(async () => {
    const request = getRequest()
    const session = await auth.api.getSession({
      headers: request.headers,
    })
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
