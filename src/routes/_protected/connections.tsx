import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  getMyConnections,
  deleteConnection,
  updateConnection,
} from "../../server/functions/connection";
import { InitialsAvatar } from "../../components/InitialsAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_protected/connections")({
  loader: () => getMyConnections(),
  staticData: { title: "つながり" },
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
  );
}

type Connection = Awaited<ReturnType<typeof getMyConnections>>[number];

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function ConnectionCard({
  conn,
  onDelete,
}: {
  conn: Connection;
  onDelete: (id: string) => Promise<void>;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const connectedDate = new Date(conn.connectedAt).toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

            {conn.privateMemo && (
              <p className="mt-1.5 text-xs text-gray-500 line-clamp-2 whitespace-pre-wrap">
                <LockIcon className="inline-block w-3 h-3 mr-1 align-[-1px] text-gray-400" />
                {conn.privateMemo}
              </p>
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
              <DropdownMenuItem onSelect={() => setShowEdit(true)}>
                編集
              </DropdownMenuItem>
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

      {/* 編集ダイアログ */}
      {showEdit && (
        <EditDialog
          conn={conn}
          onClose={() => setShowEdit(false)}
          onSaved={async () => {
            setShowEdit(false);
            await router.invalidate();
          }}
        />
      )}

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

function EditDialog({
  conn,
  onClose,
  onSaved,
}: {
  conn: Connection;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  // 企画イベント由来の文脈のみ事実として固定。即時イベントは各自が編集可能（CONTEXT.md ③ / ADR-0012）
  const contextLocked = conn.eventId !== null && conn.isInstant === false;
  const [eventName, setEventName] = useState(conn.eventName ?? "");
  const [venueName, setVenueName] = useState(conn.venueName ?? "");
  const [memo, setMemo] = useState(conn.privateMemo ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateConnection({
        data: contextLocked
          ? { connectionId: conn.connectionId, privateMemo: memo }
          : {
              connectionId: conn.connectionId,
              eventName,
              venueName,
              privateMemo: memo,
            },
      });
      await onSaved();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm">
        <h2 className="text-lg font-bold mb-1">つながりを編集</h2>
        <p className="text-sm text-gray-600 mb-4">
          <span className="font-medium">{conn.toDisplayName}</span> さん
        </p>

        <div className="flex flex-col gap-4">
          {contextLocked ? (
            conn.eventName && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  出会った場所
                </p>
                <div className="px-2 py-1 bg-pink-50 rounded text-xs text-pink-700 inline-block">
                  <span className="font-medium">{conn.eventName}</span>
                  {conn.venueName && (
                    <span className="text-pink-500"> @ {conn.venueName}</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  イベントの記録は編集できません
                </p>
              </div>
            )
          ) : (
            <>
              <div>
                <label
                  htmlFor="conn-event-name"
                  className="text-xs font-medium text-gray-500 mb-1 block"
                >
                  イベント名
                </label>
                <Input
                  id="conn-event-name"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  maxLength={100}
                  placeholder="○○オフ会"
                />
              </div>
              <div>
                <label
                  htmlFor="conn-venue-name"
                  className="text-xs font-medium text-gray-500 mb-1 block"
                >
                  場所
                </label>
                <Input
                  id="conn-venue-name"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  maxLength={100}
                  placeholder="渋谷・バー○○"
                />
              </div>
            </>
          )}

          <div>
            <label
              htmlFor="conn-memo"
              className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1"
            >
              <LockIcon className="w-3 h-3" />
              プライベートメモ
              <span className="font-normal text-gray-400">
                — 自分だけに表示されます
              </span>
            </label>
            <div className="relative">
              <textarea
                id="conn-memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={4}
                maxLength={500}
                placeholder="相手についての覚え書き"
                className="w-full px-3 py-3 border rounded-lg text-base md:text-sm outline-none focus:ring-2 focus:ring-black resize-none"
              />
              <span className="absolute bottom-2 right-3 text-xs text-gray-400">
                {memo.length}/500
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isSaving}
          >
            キャンセル
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "保存中..." : "保存する"}
          </Button>
        </div>
      </div>
    </div>
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
