import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";
import { withSentry } from "@sentry/cloudflare";
import { buildOgpDescription } from "./lib/ogp";
import { runWithNonce } from "./lib/csp-nonce";

type CloudflareEnv = { SENTRY_DSN?: string };

const startFetch = createStartHandler(defaultStreamHandler);

const BASE_URL = import.meta.env.VITE_BASE_URL ?? "https://nafuda.me";
// Share token is 32 hex chars (16 random bytes)
const PROFILE_URL_RE = /^\/u\/[^/]+\/p\/([a-f0-9]{32})$/;

function escapeAttr(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

// SentryのDSNから、CSP違反レポート専用の受け口URL（Security Header Reports）を導出する。
// 例: https://<key>@o<org>.ingest.<region>.sentry.io/<projectId>
//   → https://o<org>.ingest.<region>.sentry.io/api/<projectId>/security/?sentry_key=<key>
function sentrySecurityReportUri(dsn: string): string | undefined {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\//, "");
    if (!url.username || !projectId) return undefined;
    return `https://${url.host}/api/${projectId}/security/?sentry_key=${url.username}`;
  } catch {
    return undefined;
  }
}

// CSP は Report-Only で先行導入し、違反レポートで許可漏れがないことを確認してから
// Content-Security-Policy（enforce）へ切り替える。report-uri は SENTRY_DSN から導出した
// Sentry の Security Header Reports 受け口（未設定＝ローカル開発では report-uri 自体を付けない）。
// script-src はリクエストごとの nonce のみ許可（'unsafe-inline' は付けない）。
// style-src は motion / radix-ui 等が要素に直接 style 属性を書き込むため
// 'unsafe-inline' を残す（style 属性には nonce が効かないため）。
// R2 の 2 バケット（本番/staging）と realtime WS（本番/staging）を両方許可しているのは
// このビルド成果物が両環境で使い回されるため。
function buildCsp(nonce: string): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://pub-005c2707053246c7961f7082094d34f8.r2.dev https://pub-4b271ae313654596b3a0f88236892b5b.r2.dev",
    "connect-src 'self' wss://nafuda-realtime.pitang1965.workers.dev wss://nafuda-realtime-staging.pitang1965.workers.dev",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ];
  const dsn = process.env.SENTRY_DSN;
  const reportUri = dsn && sentrySecurityReportUri(dsn);
  if (reportUri) directives.push(`report-uri ${reportUri}`);
  return directives.join("; ");
}

// SSR 応答へのセキュリティヘッダ付与。Cloudflare Pages の public/_headers は
// 静的アセットにしか適用されず、Functions（この SSR ハンドラ）の応答には効かない
// ため、ここで付ける。HSTS はゾーン設定（Cloudflare ダッシュボード）側で有効化する。
// Referrer-Policy: プロフィール URL はパスに shareToken を含むため、外部リンク遷移時の
// Referer をオリジンのみに制限する（モダンブラウザ既定値だが明示する）。
function withSecurityHeaders(res: Response, nonce: string): Response {
  const headers = new Headers(res.headers);
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Content-Security-Policy-Report-Only", buildCsp(nonce));
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

// PostHog リバースプロキシ。ブラウザが us.i.posthog.com に直接繋ぐと広告ブロッカーに
// 計測をブロックされるため、自ドメイン経由でリレーする（PostHog公式推奨の構成）。
// 同一オリジンのリクエストになるため、better-auth のセッション Cookie が意図せず
// PostHog 側へ転送されないよう明示的に除去する。
const POSTHOG_API_HOST = "us.i.posthog.com";
const POSTHOG_ASSET_HOST = "us-assets.i.posthog.com";

async function proxyToPostHog(request: Request, url: URL): Promise<Response> {
  const relayPath = url.pathname.slice("/relay".length) || "/";
  const isAsset = relayPath.startsWith("/static/") || relayPath.startsWith("/array/");
  const targetHost = isAsset ? POSTHOG_ASSET_HOST : POSTHOG_API_HOST;

  const originHeaders = new Headers(request.headers);
  originHeaders.delete("cookie");
  originHeaders.delete("authorization");
  originHeaders.delete("host");
  originHeaders.set(
    "X-Forwarded-For",
    request.headers.get("CF-Connecting-IP") ?? "",
  );

  const originRequest = new Request(
    `https://${targetHost}${relayPath}${url.search}`,
    {
      method: request.method,
      headers: originHeaders,
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : await request.arrayBuffer(),
    },
  );

  return fetch(originRequest);
}

async function fetchOgpData(shareToken: string) {
  const { getDb } = await import("./server/db/client");
  const { personas } = await import("./server/db/schema");
  const { eq } = await import("drizzle-orm");
  const db = getDb();
  const rows = await db
    .select({
      displayName: personas.displayName,
      bio: personas.bio,
      avatarUrl: personas.avatarUrl,
    })
    .from(personas)
    .where(eq(personas.shareToken, shareToken))
    .limit(1);
  return rows[0] ?? null;
}

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;

  if (url.hostname === "nafuda-dxn.pages.dev") {
    return Response.redirect(`https://nafuda.me${pathname}${url.search}`, 301);
  }

  if (pathname.startsWith("/relay/")) {
    return proxyToPostHog(request, url);
  }

  // Route /api/auth/* directly to better-auth before TanStack Start's router.
  // TanStack Router's catch-all ($.ts) sets routeParams["**"] which makes
  // isExactMatch=false, so server.handlers on that route never execute.
  if (pathname.startsWith("/api/auth/")) {
    try {
      const { auth } = await import("./server/auth");
      return auth.handler(request);
    } catch (e) {
      console.error("[server] /api/auth error:", e);
      return new Response(String(e), { status: 500 });
    }
  }

  // OGP injection for public profile pages.
  // defaultStreamHandler streams HTML in chunks; social media crawlers may miss
  // tags injected via React's head(). HTMLRewriter guarantees the tags are in
  // the initial response regardless of streaming behavior.
  const profileMatch = pathname.match(PROFILE_URL_RE);
  if (profileMatch) {
    const shareToken = profileMatch[1];
    const [response, profile] = await Promise.all([
      startFetch(request),
      fetchOgpData(shareToken).catch(() => null),
    ]);

    if (profile) {
      const title = `${profile.displayName}のなふだ`;
      const description = buildOgpDescription(profile.displayName, profile.bio);
      const image = profile.avatarUrl ?? `${BASE_URL}/icons/icon-512.png`;
      const ogUrl = `${BASE_URL}${pathname}`;

      const tags = [
        `<meta name="description" content="${escapeAttr(description)}" />`,
        `<meta property="og:type" content="profile" />`,
        `<meta property="og:title" content="${escapeAttr(title)}" />`,
        `<meta property="og:description" content="${escapeAttr(description)}" />`,
        `<meta property="og:image" content="${escapeAttr(image)}" />`,
        `<meta property="og:url" content="${escapeAttr(ogUrl)}" />`,
        `<meta property="og:site_name" content="なふだ" />`,
        `<meta name="twitter:card" content="summary" />`,
        `<meta name="twitter:title" content="${escapeAttr(title)}" />`,
        `<meta name="twitter:description" content="${escapeAttr(description)}" />`,
        `<meta name="twitter:image" content="${escapeAttr(image)}" />`,
      ].join("\n");

      return new HTMLRewriter()
        .on("head", {
          element(el) {
            el.prepend(tags, { html: true });
          },
        })
        .transform(response);
    }

    return response;
  }

  return startFetch(request);
}

// Sentry（エラー監視）でラップする。nafuda は Cloudflare Pages（advanced mode）で
// デプロイしており、wrangler.toml に `main` が無く sentryCloudflareVitePlugin の
// 自動検出（wrangler設定からworker entryを特定する方式）が効かない
// （この default export は vite build 後さらに worker-entry.js から import される）。
// そのためプラグイン任せにせず、ここで withSentry() を直接呼ぶ。
// SENTRY_DSN は wrangler.toml の [vars]（本番）にのみ設定し、wrangler-dev.toml と
// [env.preview.vars]（staging）には設定しない。未設定の環境では dsn: undefined で
// SDK が自動的に無効化される（LINE/Facebook 等を資格情報の有無で有効化する既存方針と同じ）。
export default withSentry<CloudflareEnv>(
  (env) => ({ dsn: env.SENTRY_DSN }),
  {
    fetch: async (request: Request) => {
      const nonce = generateNonce();
      const response = await runWithNonce(nonce, () => handleRequest(request));
      return withSecurityHeaders(response, nonce);
    },
  },
);
