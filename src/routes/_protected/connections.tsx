import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  getMyConnections,
  deleteConnection,
} from "../../server/functions/connection";
import { InitialsAvatar } from "../../components/InitialsAvatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_protected/connections")({
  loader: () => getMyConnections(),
  component: ConnectionsPage,
});

function ConnectionsPage() {
  const connections = Route.useLoaderData();
  const router = useRouter();

  const handleDelete = async (connectionId: string) => {
    await deleteConnection({ data: { connectionId } });
    await router.invalidate();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-4 border-b flex items-center gap-3">
        <button
          onClick={() => router.history.back()}
          className="text-muted-foreground hover:text-foreground transition-colors"
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
        <h1 className="text-lg font-bold">つながり</h1>
      </div>

      <div className="flex-1 p-4">
        {connections.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-3">
            {connections.map((conn) => (
              <ConnectionCard
                key={conn.connectionId}
                conn={conn}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type Connection = Awaited<ReturnType<typeof getMyConnections>>[number];

function ConnectionCard({
  conn,
  onDelete,
}: {
  conn: Connection;
  onDelete: (id: string) => Promise<void>;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const connectedDate = new Date(conn.connectedAt).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(conn.connectionId);
  };

  return (
    <>
      <div className="flex items-stretch bg-white rounded-xl border overflow-hidden">
        {/* タップ可能なメイン領域 */}
        <Link
          to="/u/$urlId/p/$token"
          params={{ urlId: conn.toUrlId, token: conn.toShareToken }}
          className="flex items-start gap-3 p-4 flex-1 min-w-0 hover:bg-gray-50 transition-colors"
        >
          <div className="shrink-0">
            {conn.toAvatarUrl ? (
              <img
                src={conn.toAvatarUrl}
                alt=""
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <InitialsAvatar name={conn.toDisplayName} size={48} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">
              {conn.toDisplayName}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {conn.fromLabel || conn.fromDisplayName} として · {connectedDate}
            </p>

            {conn.eventName && (
              <div className="mt-1.5 px-2 py-1 bg-pink-50 rounded text-xs text-pink-700">
                <span className="font-medium">{conn.eventName}</span>
                {conn.venueName && (
                  <span className="text-pink-500"> @ {conn.venueName}</span>
                )}
                {conn.eventDate && (
                  <span className="text-pink-400">
                    {" "}
                    (
                    {new Date(conn.eventDate).toLocaleDateString("ja-JP", {
                      month: "short",
                      day: "numeric",
                    })}
                    )
                  </span>
                )}
              </div>
            )}
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
                削除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 削除確認ダイアログ */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">つながりを削除</h2>
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-medium">{conn.toDisplayName}</span>{" "}
              とのつながりを削除します。
            </p>
            <p className="text-xs text-gray-400 mb-5">
              相手の記録は残ります。この操作は取り消せません。
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
              >
                キャンセル
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "削除中..." : "削除する"}
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
      <div className="text-4xl">🤝</div>
      <p className="text-sm text-gray-500 text-center">
        まだつながりがありません
      </p>
      <p className="text-xs text-gray-400 text-center">
        「なふだを交換する」で相手にQRコードをスキャンしてもらいましょう
      </p>
    </div>
  );
}
