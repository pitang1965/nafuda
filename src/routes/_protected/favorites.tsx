import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { getMyFavorites, removeFavorite } from "../../server/functions/favorite";
import { UserAvatar } from "../../components/UserAvatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// お気に入り（ADR-0021）: 他者の公開なふだを保存した私的リスト。相手に不可視・ライブ参照。
export const Route = createFileRoute("/_protected/favorites")({
  loader: () => getMyFavorites(),
  staticData: { title: "お気に入り" },
  component: FavoritesPage,
});

function FavoritesPage() {
  const favorites = Route.useLoaderData();
  const router = useRouter();

  const handleRemove = async (targetPersonaId: string) => {
    await removeFavorite({ data: { targetPersonaId } });
    await router.invalidate();
  };

  return (
    <div className="flex-1 p-4">
      {favorites.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-3">
          {favorites.map((fav) => (
            <FavoriteCard
              key={fav.targetPersonaId}
              fav={fav}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type Favorite = Awaited<ReturnType<typeof getMyFavorites>>[number];

function FavoriteCard({
  fav,
  onRemove,
}: {
  fav: Favorite;
  onRemove: (targetPersonaId: string) => Promise<void>;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const savedDate = new Date(fav.createdAt).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleRemove = async () => {
    setIsRemoving(true);
    await onRemove(fav.targetPersonaId);
  };

  return (
    <>
      <div className="flex items-stretch bg-white rounded-xl border overflow-hidden">
        {/* タップで相手の公開プロフィール（最新の状態）を開く */}
        <Link
          to="/u/$urlId/p/$token"
          params={{ urlId: fav.urlId, token: fav.shareToken }}
          className="flex items-start gap-3 p-4 flex-1 min-w-0 hover:bg-gray-50 transition-colors"
        >
          <div className="shrink-0">
            <UserAvatar
              avatarUrl={fav.avatarUrl}
              name={fav.displayName}
              size={48}
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">
              {fav.displayName}
            </p>
            {fav.bio && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 whitespace-pre-wrap">
                {fav.bio}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">{savedDate} に保存</p>
          </div>
        </Link>

        {/* 「…」メニュー */}
        <div className="shrink-0 flex items-center pr-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-gray-500 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="メニュー"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-red-500 focus:text-red-500 focus:bg-red-50"
                onSelect={() => setShowConfirm(true)}
              >
                お気に入りから外す
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 外す確認ダイアログ */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">お気に入りから外す</h2>
            <p className="text-sm text-gray-600 mb-5">
              <span className="font-medium">{fav.displayName}</span>{" "}
              を一覧から外します。相手には通知されません。
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowConfirm(false)}
                disabled={isRemoving}
              >
                キャンセル
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleRemove}
                disabled={isRemoving}
              >
                {isRemoving ? "外しています..." : "外す"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="text-4xl">⭐</div>
      <p className="text-sm text-gray-500 text-center">
        まだお気に入りがありません
      </p>
      <p className="text-xs text-gray-400 text-center">
        相手のなふだを開いて「お気に入りに保存」すると、ここに最新の状態でいつでも見に行けます
      </p>
    </div>
  );
}
