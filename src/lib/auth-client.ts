import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient()

// Re-export commonly used hooks for convenience
export const { useSession, signIn, signOut } = authClient
