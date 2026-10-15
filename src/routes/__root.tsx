import {
  createRootRoute,
  Outlet,
  HeadContent,
  Scripts,
  useRouter,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect } from "react";
import "../index.css";
import { initAnalytics, setInternalUser } from "../lib/analytics";
import { useSession } from "../lib/auth-client";
import { EmptyState } from "../components/EmptyState";
import { LocaleProvider, useLocale, useT } from "../lib/i18n/context";
import { resolveLocale } from "../lib/i18n/detect";
import { DEFAULT_LOCALE, type Locale } from "../lib/i18n/types";
import { dictionaries } from "../lib/i18n/dictionaries";
import { translate } from "../lib/i18n/translate";

// 初期ロケールの決定（ADR-0029: URLには持たせず Cookie / Accept-Language のみで決まる）。
// SSR 時は getRequest() でリクエストヘッダーを読み、クライアント側の再実行（初回水和や
// クライアントナビゲーション）では document.cookie / navigator.language を使う。
// router.tsx の CSP nonce と同じ「import.meta.env.SSR で分岐する動的 import」パターン。
async function resolveInitialLocale(): Promise<Locale> {
  if (import.meta.env.SSR) {
    const { getServerLocale } = await import("../lib/i18n/server");
    return getServerLocale();
  }
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  return resolveLocale(document.cookie, navigator.language);
}

// ログイン中ユーザーが内部ユーザー（自分）なら is_internal を付与し、PostHog で除外できるようにする。
function useInternalUserTag() {
  const { data: session } = useSession();
  const uid = session?.user?.id;
  useEffect(() => {
    const raw = (import.meta.env.VITE_POSTHOG_INTERNAL_USER_IDS ?? "") as string;
    const ids = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setInternalUser(!!uid && ids.includes(uid));
  }, [uid]);
}

// <html lang> は LocaleProvider の実ロケールを読んで出す（切替時に React が再レンダーして
// 追従する）。LocaleProvider は Document の外側に置く必要がある（html 自体を包むため）。
function Document({ children }: { children: ReactNode }) {
  // CSP script-src はリクエストごとの nonce のみ許可（router.tsx参照）。
  // このインラインスクリプトにも同じ nonce を付けないとブロックされる。
  const nonce = useRouter().options.ssr?.nonce;
  const { locale } = useLocale();

  useEffect(() => {
    initAnalytics();
  }, []);

  useInternalUserTag();

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
    <html lang={locale}>
      <head>
        {/* beforeinstallprompt はReactハイドレーション前に発火するため、ここで早期キャプチャ */}
        <script
          nonce={nonce}
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

function RootDocument({
  children,
  locale,
}: {
  children: ReactNode;
  locale: Locale;
}) {
  return (
    <LocaleProvider initialLocale={locale}>
      <Document>{children}</Document>
    </LocaleProvider>
  );
}

function NotFound() {
  const t = useT();
  return (
    <EmptyState
      icon="🔍"
      title={t("notFound.title")}
      description={t("notFound.description")}
      cta={{ label: t("notFound.cta"), to: "/" }}
      showBack
    />
  );
}

const BASE_URL = import.meta.env.VITE_BASE_URL ?? "https://nafuda.me";

function RootComponent() {
  const { locale } = Route.useRouteContext();
  return (
    <RootDocument locale={locale}>
      <Outlet />
    </RootDocument>
  );
}

export const Route = createRootRoute({
  beforeLoad: async () => ({ locale: await resolveInitialLocale() }),
  // ランディングページ（"/"）向けのタイトル・説明文。ログイン画面など、自前の head
  // を持たない他ページのフォールバックにもなる。辞書の dictionaries を直接引く
  // （この head() は React 外で実行されるため useT フックは使えない）。
  head: ({ match }) => {
    const dict = dictionaries[match.context.locale];
    const title = translate(dict, "common.siteTitle");
    const description = translate(dict, "common.siteDescription");
    const siteName = translate(dict, "common.brandName");
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:image", content: `${BASE_URL}/icons/icon-512.png` },
        { property: "og:url", content: BASE_URL },
        { property: "og:site_name", content: siteName },
        { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
    };
  },
  component: RootComponent,
  notFoundComponent: NotFound,
});
