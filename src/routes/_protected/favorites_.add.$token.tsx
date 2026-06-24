import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { addFavorite, removeFavorite } from "../../server/functions/favorite";
import { NafudaIcon } from "../../components/NafudaIcon";

// お気に入り追加の遷移先（ADR-0021）。公開ページの静的CTAから遷移してくる。
// _protected 配下なので未ログインなら beforeLoad が /login へ誘導し、ログイン後ここへ戻る。
// 追加は冪等（unique 制約＋onConflictDoNothing）なのでローダーで実行してよい。
export const Route = createFileRoute("/_protected/favorites_/add/$token")({
  loader: ({ params }) => addFavorite({ data: { shareToken: params.token } }),
  staticData: { title: "お気に入り", hideBottomNav: true },
  component: AddFavoritePage,
});

function AddFavoritePage() {
  const result = Route.useLoaderData();
  const [removed, setRemoved] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  if (result.status === "notfound") {
    return (
      <Centered>
        <div className="text-4xl text-gray-300">
          <NafudaIcon />
        </div>
        <h1 className="text-lg font-bold">なふだが見つかりません</h1>
        <p className="text-sm text-gray-500">
          削除されたか、URLが間違っている可能性があります。
        </p>
        <Link
          to="/favorites"
          className="text-sm text-pink-500 font-medium hover:underline"
        >
          お気に入り一覧へ
        </Link>
      </Centered>
    );
  }

  if (result.status === "self") {
    return (
      <Centered>
        <div className="text-4xl text-gray-300">
          <NafudaIcon />
        </div>
        <h1 className="text-lg font-bold">自分のなふだは保存できません</h1>
        <p className="text-sm text-gray-500">
          自分のなふだは「マイなふだ」からいつでも見られます。
        </p>
        <Link
          to="/me"
          className="text-sm text-pink-500 font-medium hover:underline"
        >
          マイなふだへ
        </Link>
      </Centered>
    );
  }

  // saved / already
  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await removeFavorite({ data: { targetPersonaId: result.targetPersonaId } });
      setRemoved(true);
    } finally {
      setIsRemoving(false);
    }
  };

  if (removed) {
    return (
      <Centered>
        <div className="text-4xl">☆</div>
        <h1 className="text-lg font-bold">お気に入りから外しました</h1>
        <p className="text-sm text-gray-500">
          <span className="font-medium">{result.displayName}</span>{" "}
          を一覧から外しました。
        </p>
        <Link
          to="/favorites"
          className="text-sm text-pink-500 font-medium hover:underline"
        >
          お気に入り一覧へ
        </Link>
      </Centered>
    );
  }

  return (
    <Centered>
      <div className="text-4xl">⭐</div>
      <h1 className="text-lg font-bold">
        {result.status === "saved"
          ? "お気に入りに保存しました"
          : "すでに保存済みです"}
      </h1>
      <p className="text-sm text-gray-500">
        <span className="font-medium">{result.displayName}</span> のなふだを保存しました。いつでも最新の状態を見に行けます。
      </p>
      <p className="text-xs text-gray-400">相手には通知されません。</p>

      <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
        <Link
          to="/favorites"
          className="w-full rounded-lg bg-pink-500 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-pink-600 transition-colors"
        >
          お気に入り一覧を見る
        </Link>
        <Link
          to="/u/$urlId/p/$token"
          params={{ urlId: result.urlId, token: result.shareToken }}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          なふだに戻る
        </Link>
        <button
          onClick={handleRemove}
          disabled={isRemoving}
          className="w-full px-4 py-2 text-center text-sm text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
        >
          {isRemoving ? "外しています..." : "保存を取り消す"}
        </button>
      </div>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      {children}
    </div>
  );
}
