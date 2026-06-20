import {
  createFileRoute,
  redirect,
  Outlet,
  useMatches,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest, removeResponseHeader } from "@tanstack/react-start/server";
import { auth } from "../server/auth";
import { AppHeader } from "../components/AppHeader";
import { BottomNav } from "../components/BottomNav";

// 各保護ルートが staticData で宣言するメタ。title はヘッダーに表示し、
// hideChrome を立てたルート（初回ウィザード等）はシェルを外して全画面表示する。
// hideBottomNav はヘッダーを残したままボトムナビだけ外す（アカウント等の二次画面用）。
declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    title?: string;
    hideChrome?: boolean;
    hideBottomNav?: boolean;
  }
}

// auth.api.getSession sets cookies on the h3Event response (including session_data for
// cookieCache, and Set-Cookie: Max-Age=0 via deleteSessionCookie when session is invalid).
// When the session is null we strip Set-Cookie from the h3Event before the redirect so that
// the cookie-deletion command does not reach the browser — the session token stays intact
// and the user can re-authenticate without losing their cookie.
// When the session is valid, Set-Cookie (e.g. session_data refresh) flows normally.
const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    removeResponseHeader("set-cookie");
  }
  return session;
});

export const Route = createFileRoute("/_protected")({
  beforeLoad: async ({ location }) => {
    const session = await getSession();
    if (!session) {
      throw redirect({
        to: "/login",
        search: { redirect: location.pathname + location.searchStr },
      });
    }
    return { session };
  },
  component: ProtectedLayout,
});

function ProtectedLayout() {
  const matches = useMatches();
  const hideChrome = matches.some((m) => m.staticData?.hideChrome);
  const hideBottomNav = matches.some((m) => m.staticData?.hideBottomNav);
  const title =
    [...matches].reverse().find((m) => m.staticData?.title)?.staticData
      ?.title ?? "";

  // 初回ウィザード等は独自の多段フローを持つため、シェル（ヘッダー/ボトムナビ）を
  // 被せず全画面で表示する。
  if (hideChrome) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="mx-auto flex min-h-screen w-full flex-col bg-white sm:max-w-sm sm:shadow-sm">
        <AppHeader title={title} />
        <main className="flex flex-1 flex-col">
          <Outlet />
        </main>
        {!hideBottomNav && <BottomNav />}
      </div>
    </div>
  );
}
