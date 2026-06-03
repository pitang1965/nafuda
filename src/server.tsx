import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";

const startFetch = createStartHandler(defaultStreamHandler);

const BASE_URL = import.meta.env.VITE_BASE_URL ?? "https://nafuda.me";
// Share token is 32 hex chars (16 random bytes)
const PROFILE_URL_RE = /^\/u\/[^/]+\/p\/([a-f0-9]{32})$/;

function escapeAttr(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

async function fetchOgpData(shareToken: string) {
  const { db } = await import("./server/db/client");
  const { personas } = await import("./server/db/schema");
  const { eq } = await import("drizzle-orm");
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
      const description = profile.bio ?? `${profile.displayName}のプロフィール`;
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
            el.append(tags, { html: true });
          },
        })
        .transform(response);
    }

    return response;
  }

  return startFetch(request);
}

export default { fetch: handleRequest };
