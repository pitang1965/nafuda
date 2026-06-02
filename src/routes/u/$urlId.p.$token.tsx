import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { eq, and, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { getPublicProfile } from "../../server/functions/profile";
import { createConnection } from "../../server/functions/connection";
import { InitialsAvatar } from "../../components/InitialsAvatar";
import { SnsLinkButton } from "../../components/SnsLinkButton";
import { NafudaFrame } from "../../components/NafudaFrame";
import { getNafudaStyle } from "../../lib/nafuda-styles";
import { auth } from "../../server/auth";
import { db } from "../../server/db/client";
import { urlIds, personas, connections } from "../../server/db/schema";

const getSessionData = createServerFn({ method: "GET" })
  .inputValidator(z.object({ shareToken: z.string() }))
  .handler(async ({ data }) => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user)
      return {
        user: null,
        myUrlId: null,
        myPersonas: [],
        existingConnection: null,
      };

    const [urlIdRow, myPersonas] = await Promise.all([
      db
        .select({ urlId: urlIds.urlId })
        .from(urlIds)
        .where(eq(urlIds.userId, session.user.id))
        .limit(1),
      db
        .select({
          id: personas.id,
          displayName: personas.displayName,
          isDefault: personas.isDefault,
        })
        .from(personas)
        .where(and(eq(personas.userId, session.user.id)))
        .orderBy(personas.createdAt),
    ]);

    const toPersonaRow = await db
      .select({ id: personas.id })
      .from(personas)
      .where(eq(personas.shareToken, data.shareToken))
      .limit(1);

    let existingConnection: {
      connectedAt: Date;
      eventName: string | null;
      venueName: string | null;
    } | null = null;
    if (toPersonaRow[0]) {
      const fromP = alias(personas, "fp");
      const toP = alias(personas, "tp");
      const connRow = await db
        .select({
          connectedAt: connections.connectedAt,
          eventName: connections.eventName,
          venueName: connections.venueName,
        })
        .from(connections)
        .innerJoin(fromP, eq(connections.fromPersonaId, fromP.id))
        .innerJoin(toP, eq(connections.toPersonaId, toP.id))
        .where(
          or(
            // 自分 → 相手
            and(
              eq(fromP.userId, session.user.id),
              eq(connections.toPersonaId, toPersonaRow[0].id),
            ),
            // 相手 → 自分
            and(
              eq(connections.fromPersonaId, toPersonaRow[0].id),
              eq(toP.userId, session.user.id),
            ),
          ),
        )
        .limit(1);
      existingConnection = connRow[0] ?? null;
    }

    return {
      user: session.user,
      myUrlId: urlIdRow[0]?.urlId ?? null,
      myPersonas,
      existingConnection,
    };
  });

// Specific persona by share token — public route, no auth required
export const Route = createFileRoute("/u/$urlId/p/$token")({
  loader: async ({ params }) => {
    const [profile, sessionData] = await Promise.all([
      getPublicProfile({ data: { shareToken: params.token } }),
      getSessionData({ data: { shareToken: params.token } }),
    ]);
    const isOwnProfile = sessionData.myUrlId === params.urlId;
    return {
      profile,
      session: sessionData,
      urlId: params.urlId,
      shareToken: params.token,
      isOwnProfile,
    };
  },
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const { profile, session, urlId, shareToken, isOwnProfile } =
    Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const [canGoBack] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      document.referrer !== "" &&
      new URL(document.referrer).origin === window.location.origin
    );
  });
  const [connected, setConnected] = useState(
    () => !!session.existingConnection,
  );
  const [connMeta, setConnMeta] = useState<{
    connectedAt: string;
    eventName: string | null;
    venueName: string | null;
  } | null>(() =>
    session.existingConnection
      ? {
          connectedAt: String(session.existingConnection.connectedAt),
          eventName: session.existingConnection.eventName,
          venueName: session.existingConnection.venueName,
        }
      : null,
  );
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const style = getNafudaStyle(profile?.styleId)

  useEffect(() => {
    if (!style?.fontUrl) return
    if (document.querySelector(`link[data-nafuda-font="${style.id}"]`)) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = style.fontUrl
    link.setAttribute('data-nafuda-font', style.id)
    document.head.appendChild(link)
  }, [style?.fontUrl, style?.id])

  if (!profile)
    return (
      <div className="p-6 text-sm text-gray-500">
        なふだが見つかりません
      </div>
    );

  const handleConnectClick = async () => {
    if (!session.user) {
      await navigate({
        to: "/login",
        search: { redirect: `/u/${urlId}/p/${shareToken}` },
      });
      return;
    }
    if (session.myPersonas.length === 0) {
      await navigate({
        to: "/profile/wizard",
        search: { redirect: `/u/${urlId}/p/${shareToken}` },
      });
    } else if (session.myPersonas.length === 1) {
      await doConnect(session.myPersonas[0].id);
    } else {
      setShowPicker(true);
    }
  };

  const doConnect = async (fromPersonaId: string) => {
    setShowPicker(false);
    setConnecting(true);
    setError(null);
    try {
      const result = await createConnection({
        data: { targetShareToken: shareToken, fromPersonaId },
      });
      setConnected(true);
      if (result.connection) {
        setConnMeta({
          connectedAt: String(result.connection.connectedAt),
          eventName: result.connection.eventName ?? null,
          venueName: result.connection.venueName ?? null,
        });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "エラーが発生しました";
      setError(message);
    } finally {
      setConnecting(false);
    }
  };

  const textColor = style?.textColor
  const subtextColor = style?.subtextColor

  return (
    <div className={style ? "min-h-screen bg-gray-900" : "min-h-screen"}>
      <div className="mx-auto sm:max-w-sm w-full min-h-screen flex flex-col">
      {canGoBack && (
        <div
          className="p-4 flex items-center"
          style={style ? { borderBottom: '1px solid rgba(255,255,255,0.12)' } : { borderBottom: '1px solid #e5e7eb' }}
        >
          <button
            onClick={() => router.history.back()}
            className="transition-colors"
            style={{ color: style ? 'rgba(255,255,255,0.65)' : undefined }}
            aria-label="戻る"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>
      )}

      {/* なふだ領域 */}
      <div
        className="flex-1 relative"
        style={{
          background: style?.background ?? undefined,
          fontFamily: style?.fontFamily ?? undefined,
          color: textColor ?? undefined,
        }}
      >
        {style?.frameId && <NafudaFrame frameId={style.frameId} />}
        <div className="p-6 flex flex-col items-center gap-4 relative z-20">
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt=""
            className="w-20 h-20 rounded-full object-cover"
            style={style ? { boxShadow: `0 0 0 3px ${style.textColor}40` } : undefined}
          />
        ) : (
          <InitialsAvatar name={profile.displayName} size={80} />
        )}
        <h1
          className="text-2xl font-bold"
          style={{ color: textColor ?? undefined }}
        >
          {profile.displayName}
        </h1>
        {profile.bio && (
          <p
            className="text-sm text-center whitespace-pre-wrap max-w-sm"
            style={{ color: subtextColor ?? '#4b5563' }}
          >
            {profile.bio}
          </p>
        )}
        {profile.oshiTags.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center">
            {profile.oshiTags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-xs"
                style={
                  style
                    ? { background: style.tagBg, color: style.tagText }
                    : { background: '#fce7f3', color: '#be185d' }
                }
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        {profile.snsLinks.length > 0 && (
          <div className="w-full max-w-sm flex flex-col gap-2">
            {profile.snsLinks.map((link) => (
              <SnsLinkButton
                key={link.id}
                platform={link.platform}
                url={link.url}
                colorOverride={style ? {
                  border: `${style.textColor}50`,
                  text: style.textColor,
                  hoverBg: `${style.textColor}15`,
                } : undefined}
              />
            ))}
          </div>
        )}

        {/* 「つながる」ボタン: 自分のプロフィールでは非表示 */}
        {!isOwnProfile && (
          <div className="w-full max-w-sm mt-2">
            {connected ? (
              <div className="w-full flex flex-col items-center gap-1.5">
                <div
                  className="w-full text-center px-6 py-3 rounded-xl text-sm font-medium"
                  style={
                    style
                      ? { background: `${style.textColor}20`, color: style.subtextColor }
                      : { background: '#f3f4f6', color: '#6b7280' }
                  }
                >
                  つながり済み ✓
                </div>
                {connMeta && (
                  <p className="text-xs text-center" style={{ color: subtextColor ?? '#9ca3af' }}>
                    {new Date(connMeta.connectedAt).toLocaleDateString(
                      "ja-JP",
                      { year: "numeric", month: "long", day: "numeric" },
                    )}
                    {connMeta.eventName && ` · ${connMeta.eventName}`}
                    {!connMeta.eventName &&
                      connMeta.venueName &&
                      ` · ${connMeta.venueName}`}
                  </p>
                )}
              </div>
            ) : showPicker ? (
              <PersonaPicker
                personas={session.myPersonas}
                onSelect={doConnect}
                onCancel={() => setShowPicker(false)}
              />
            ) : (
              <button
                onClick={handleConnectClick}
                disabled={connecting}
                className="w-full px-6 py-3 bg-pink-500 text-white rounded-xl text-sm font-medium hover:bg-pink-600 transition-colors disabled:opacity-50"
              >
                {connecting ? "つながっています..." : "つながる"}
              </button>
            )}
            {error && (
              <p className="text-xs text-red-500 text-center mt-2">{error}</p>
            )}
          </div>
        )}

        <Link
          to="/"
          className="mt-4 text-xs underline underline-offset-2 transition-colors"
          style={{ color: subtextColor ?? '#9ca3af' }}
        >
          なふだとは？
        </Link>
      </div>
      </div>{/* /なふだ領域 */}
      </div>
    </div>
  );
}

function PersonaPicker({
  personas,
  onSelect,
  onCancel,
}: {
  personas: { id: string; displayName: string; isDefault: boolean }[];
  onSelect: (id: string) => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-gray-600 text-center">
        どのなふだとしてつながりますか？
      </p>
      {personas.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          className="w-full px-4 py-3 bg-pink-500 text-white rounded-xl text-sm font-medium hover:bg-pink-600 transition-colors flex items-center justify-between"
        >
          <span>{p.displayName}</span>
          {p.isDefault && (
            <span className="text-xs text-pink-200">デフォルト</span>
          )}
        </button>
      ))}
      <button
        onClick={onCancel}
        className="w-full px-4 py-2 text-gray-400 text-sm"
      >
        キャンセル
      </button>
    </div>
  );
}
