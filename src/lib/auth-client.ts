import { createAuthClient } from "better-auth/react";
import { genericOAuthClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL ?? "https://nafuda.me",
  plugins: [genericOAuthClient()],
});

// Re-export commonly used hooks for convenience
export const { useSession, signIn, signOut } = authClient;
