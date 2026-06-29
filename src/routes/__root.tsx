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
import { EmptyState } from "../components/EmptyState";

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
        {/* beforeinstallprompt はReactハイドレーション前に発火するため、ここで早期キャプチャ */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__pwaPrompt=e;});`,
          }}
        />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
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
    <EmptyState
      icon="🔍"
      title="ページが見つかりません"
      description="お探しのページは存在しないか、移動した可能性があります。"
      cta={{ label: "トップへ戻る", to: "/" }}
      showBack
    />
  );
}

const BASE_URL = import.meta.env.VITE_BASE_URL ?? "https://nafuda.me";
const SITE_DESCRIPTION =
  "なふだは、勉強会・オフ会・飲みの席など“仕事じゃない”出会いのためのSNS名刺アプリ。QRコードを見せるだけで、X・Instagramなどのつながりを、いつ・どこで出会ったかの文脈ごと残せます。推し活にもぴったり。今すぐ無料で始めましょう。";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { title: "なふだ｜“仕事じゃない”出会いのSNS名刺アプリ" },
      { name: "description", content: SITE_DESCRIPTION },
      { property: "og:type", content: "website" },
      {
        property: "og:title",
        content: "なふだ — “仕事じゃない”出会いのSNS名刺アプリ",
      },
      { property: "og:description", content: SITE_DESCRIPTION },
      { property: "og:image", content: `${BASE_URL}/icons/icon-512.png` },
      { property: "og:url", content: BASE_URL },
      { property: "og:site_name", content: "なふだ" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
  }),
  component: () => (
    <RootDocument>
      <Outlet />
    </RootDocument>
  ),
  notFoundComponent: NotFound,
});
