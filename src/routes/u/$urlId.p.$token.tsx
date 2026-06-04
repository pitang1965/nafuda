import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { getPublicProfile } from "../../server/functions/profile";
import { InitialsAvatar } from "../../components/InitialsAvatar";
import { SnsLinkButton } from "../../components/SnsLinkButton";
import { NafudaFrame } from "../../components/NafudaFrame";
import { getNafudaStyle } from "../../lib/nafuda-styles";
import { buildOgpDescription } from "../../lib/ogp";

const BASE_URL = import.meta.env.VITE_BASE_URL ?? "https://nafuda.me";

// 閲覧専用: なふだを見せる（コネクション生成しない）
export const Route = createFileRoute("/u/$urlId/p/$token")({
  loader: ({ params }) =>
    getPublicProfile({ data: { shareToken: params.token } }),
  head: ({ loaderData: profile, params }) => {
    if (!profile) return {};
    const title = `${profile.displayName}のなふだ`;
    const description = buildOgpDescription(profile.displayName, profile.bio);
    const image = profile.avatarUrl ?? `${BASE_URL}/icons/icon-512.png`;
    const url = `${BASE_URL}/u/${params.urlId}/p/${params.token}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "profile" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:image", content: image },
        { property: "og:url", content: url },
        { property: "og:site_name", content: "なふだ" },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: image },
      ],
    };
  },
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const profile = Route.useLoaderData();
  const router = useRouter();
  const [canGoBack] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      document.referrer !== "" &&
      new URL(document.referrer).origin === window.location.origin
    );
  });

  const style = getNafudaStyle(profile?.styleId);
  const textColor = style?.textColor;
  const subtextColor = style?.subtextColor;

  useEffect(() => {
    if (!style?.fontUrl) return;
    if (document.querySelector(`link[data-nafuda-font="${style.id}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = style.fontUrl;
    link.setAttribute("data-nafuda-font", style.id);
    document.head.appendChild(link);
  }, [style?.fontUrl, style?.id]);

  if (!profile)
    return (
      <div className="p-6 text-sm text-gray-500">なふだが見つかりません</div>
    );

  return (
    <div className={style ? "min-h-screen bg-gray-900" : "min-h-screen"}>
      <div className="mx-auto sm:max-w-sm w-full min-h-screen flex flex-col">
        {canGoBack && (
          <div
            className="p-4 flex items-center"
            style={
              style
                ? { borderBottom: "1px solid rgba(255,255,255,0.12)" }
                : { borderBottom: "1px solid #e5e7eb" }
            }
          >
            <button
              onClick={() => router.history.back()}
              className="transition-colors"
              style={{ color: style ? "rgba(255,255,255,0.65)" : undefined }}
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
                style={
                  style
                    ? { boxShadow: `0 0 0 3px ${style.textColor}40` }
                    : undefined
                }
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
                style={{ color: subtextColor ?? "#4b5563" }}
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
                        : { background: "#fce7f3", color: "#be185d" }
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
                    title={link.title}
                    colorOverride={
                      style
                        ? {
                            border: `${style.textColor}50`,
                            text: style.textColor,
                            hoverBg: `${style.textColor}15`,
                          }
                        : undefined
                    }
                  />
                ))}
              </div>
            )}

            <Link
              to="/"
              className="mt-4 text-xs underline underline-offset-2 transition-colors"
              style={{ color: subtextColor ?? "#9ca3af" }}
            >
              なふだとは？
            </Link>
          </div>
        </div>
        {/* /なふだ領域 */}
      </div>
    </div>
  );
}
