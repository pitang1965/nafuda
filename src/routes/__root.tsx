import {
  createRootRoute,
  Outlet,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect } from "react";
import "../index.css";
import { initAnalytics } from "../lib/analytics";

function RootDocument({ children }: { children: ReactNode }) {
  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator && typeof window !== "undefined") {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .then((reg) => console.log("[SW] Registered:", reg.scope))
          .catch((err) => console.warn("[SW] Registration failed:", err));
      });
    }
  }, []);

  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-2xl font-semibold text-gray-700">404</p>
        <p className="mt-2 text-sm text-gray-500">ページが見つかりません</p>
        <a
          href="/"
          className="mt-4 inline-block text-sm text-blue-500 underline"
        >
          トップへ戻る
        </a>
      </div>
    </div>
  );
}

const BASE_URL = import.meta.env.VITE_BASE_URL ?? 'https://nafuda.me'
const SITE_DESCRIPTION = 'なふだはQRコードをスキャンするだけで自己紹介・SNSリンク・プロフィールを手軽にシェアできるデジタル名刺サービスです。推し活・趣味・仕事など様々なシーンでご利用いただけます。今すぐ無料で始めましょう。'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { title: 'なふだ' },
      { name: 'description', content: SITE_DESCRIPTION },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: 'なふだ — QRコードでつながるデジタル名刺' },
      { property: 'og:description', content: SITE_DESCRIPTION },
      { property: 'og:image', content: `${BASE_URL}/icons/icon-512.png` },
      { property: 'og:url', content: BASE_URL },
      { property: 'og:site_name', content: 'なふだ' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: () => (
    <RootDocument>
      <Outlet />
    </RootDocument>
  ),
  notFoundComponent: NotFound,
});
