import { createAuthClient } from "better-auth/react";
import { genericOAuthClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL ?? "https://nafuda.me",
  plugins: [genericOAuthClient()],
});

// Re-export commonly used hooks for convenience
// signOut は出さない: ログアウトは必ずキャッシュも消す logout() を通す
export const { useSession } = authClient;

// ログアウト後に /me のオフライン用キャッシュを消す（共有端末で前の人のなふだを出さない）。
// キャッシュ名は src/sw.js の PAGE_CACHE と揃えること。
export async function logout() {
  try {
    await authClient.signOut();
  } finally {
    // signOut が失敗（オフライン等）しても必ず消す
    if (typeof caches !== "undefined") {
      await caches.delete("nafuda-pages-v2").catch(() => {});
    }
  }
}
