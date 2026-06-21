import {
  createFileRoute,
  useRouter,
  useCanGoBack,
} from "@tanstack/react-router";
import { getPublicProfile } from "../../server/functions/profile";
import { NafudaCardView } from "../../components/NafudaCardView";
import { getNafudaStyle } from "../../lib/nafuda-styles";
import { buildOgpDescription } from "../../lib/ogp";
import { PwaInstallBanner } from "../../components/PwaInstallBanner";
import { EmptyState } from "../../components/EmptyState";

const BASE_URL = import.meta.env.VITE_BASE_URL ?? "https://nafuda.me";

// 閲覧専用: なふだを見せる（コネクション生成しない）
export const Route = createFileRoute("/u/$urlId/p/$token")({
  loader: async ({ params }) => {
    const profile = await getPublicProfile({
      data: { shareToken: params.token },
    });
    if (!profile) return null;
    const avatarUrl = profile.avatarUrl?.startsWith("/")
      ? `${BASE_URL}${profile.avatarUrl}`
      : profile.avatarUrl;
    const galleryPhotos = profile.galleryPhotos.map((p) => ({
      ...p,
      imageUrl: p.imageUrl.startsWith("/")
        ? `${BASE_URL}${p.imageUrl}`
        : p.imageUrl,
    }));
    const nafudaLinks = profile.nafudaLinks.map((l) => ({
      ...l,
      avatarUrl: l.avatarUrl?.startsWith("/")
        ? `${BASE_URL}${l.avatarUrl}`
        : l.avatarUrl,
    }));
    return { ...profile, avatarUrl, galleryPhotos, nafudaLinks };
  },
  head: ({ loaderData: profile, params }) => {
    if (!profile) return { meta: [{ title: "なふだが見つかりません" }] };
    const title = `${profile.displayName}のなふだ`;
    const description = buildOgpDescription(profile.displayName, profile.bio);
    const rawImage = profile.avatarUrl ?? `${BASE_URL}/icons/icon-512.png`;
    const image = rawImage.startsWith("/")
      ? `${BASE_URL}${rawImage}`
      : rawImage;
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
  // アプリ内遷移（公開→公開の「他のなふだ」、イベントページ等）では履歴があり戻れる。
  // QR からのコールドロードでは履歴が無く戻り先も無いので出さない（ADR-0019）。
  const canGoBack = useCanGoBack();

  const style = getNafudaStyle(profile?.styleId);

  if (!profile)
    return (
      <EmptyState
        icon="📛"
        title="なふだが見つかりません"
        description="削除されたか、URLが間違っている可能性があります。"
        cta={{ label: "トップへ戻る", to: "/" }}
        showBack
      />
    );

  return (
    <div className={style ? "min-h-screen bg-gray-900" : "min-h-screen"}>
      <PwaInstallBanner sticky />
      <div className="mx-auto sm:max-w-sm w-full min-h-screen flex flex-col pb-16">
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
              className="flex items-center gap-1 transition-colors"
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
              <span className="text-sm">戻る</span>
            </button>
          </div>
        )}

        {/* なふだ領域（公開ページと編集プレビューで共通の表示部品） */}
        <main className="flex-1 flex flex-col">
          <NafudaCardView profile={profile} className="flex-1" />
        </main>
        {/* /なふだ領域 */}
      </div>
    </div>
  );
}
