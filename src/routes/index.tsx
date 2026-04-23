import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    // Session check happens in _protected layout; just redirect to home
    // Unauthenticated users will be caught by _protected.tsx beforeLoad
    throw redirect({ to: '/home' })
  },
})
