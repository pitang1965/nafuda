import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export function createRouter() {
  return createTanStackRouter({ routeTree, scrollRestoration: true });
}

// SSR時のみ、server.tsx が発行した CSP nonce を router.options.ssr.nonce に載せる。
// これで TanStack Start が注入するハイドレーション用インラインスクリプトに nonce 属性が付く。
// node:async_hooks を使う csp-nonce.ts はクライアントバンドルに含めてはいけないため、
// import.meta.env.SSR で静的に分岐した動的 import からのみ読み込む（クライアントビルドでは
// このブランチごと除去される）。
export async function getRouter() {
  const nonce = import.meta.env.SSR
    ? (await import("./lib/csp-nonce")).getNonce()
    : undefined;
  return createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    ...(nonce ? { ssr: { nonce } } : {}),
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
