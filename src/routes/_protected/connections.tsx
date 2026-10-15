import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  getMyConnections,
  deleteConnection,
  updateConnection,
} from "../../server/functions/connection";
import { UserAvatar } from "../../components/UserAvatar";
import { MeetingSkyView } from "../../components/MeetingSkyView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useT, useLocale } from "../../lib/i18n/context";
import { formatJstDateTime } from "../../lib/i18n/formatDate";

export const Route = createFileRoute("/_protected/connections")({
  loader: () => getMyConnections(),
  staticData: { title: "nav.connections" },
  component: ConnectionsPage,
});

function ConnectionsPage() {
  const t = useT();
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
        /* 同じデータの別ビュー。リスト＝実務（検索・メモ・削除）／夜空＝情緒（ADR-0025） */
        <Tabs defaultValue="list" className="gap-3">
          <TabsList
            aria-label={t("connections.tabsAriaLabel")}
            className="self-center rounded-full"
          >
            <TabsTrigger value="list" className="rounded-full px-4">
              {t("connections.tabList")}
            </TabsTrigger>
            <TabsTrigger value="sky" className="rounded-full px-4">
              {t("connections.tabSky")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            <div className="flex flex-col gap-3">
              {connections.map((conn) => (
                <ConnectionCard
                  key={conn.connectionId}
                  conn={conn}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </TabsContent>
          <TabsContent value="sky">
            <MeetingSkyView connections={connections} />
          </TabsContent>
        </Tabs>
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

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
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
  const t = useT();
  const { locale } = useLocale();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const connectedDate = formatJstDateTime(conn.connectedAt, locale);

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
            <UserAvatar
              avatarUrl={conn.toAvatarUrl}
              name={conn.toDisplayName}
              size={48}
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">
              {conn.toDisplayName}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {t("connections.asLabelDate", {
                label: conn.fromLabel || conn.fromDisplayName,
                date: connectedDate,
              })}
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
                    {new Date(conn.eventDate).toLocaleDateString(
                      locale === "ja" ? "ja-JP" : "en-US",
                      {
                        timeZone: "Asia/Tokyo",
                        month: "short",
                        day: "numeric",
                      },
                    )}
                    )
                  </span>
                )}
              </div>
            )}

            {conn.privateMemo && (
              <p className="mt-1.5 text-xs text-gray-500 line-clamp-2 whitespace-pre-wrap">
                <LockIcon className="inline-block w-3 h-3 mr-1 align-[-1px] text-gray-500" />
                {conn.privateMemo}
              </p>
            )}
          </div>
        </Link>

        {/* 右端の操作を縦積み（地図ピン＝上／メニュー＝下）。ピンは座標があるときだけ表示 */}
        <div className="shrink-0 flex flex-col items-center justify-center pr-2">
          {conn.gpsCoordinates && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${conn.gpsCoordinates.y},${conn.gpsCoordinates.x}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-pink-500 rounded-full hover:bg-gray-100 transition-colors"
              aria-label={t("connections.mapAriaLabel")}
              title={t("connections.mapAriaLabel")}
            >
              <MapPinIcon className="w-4 h-4" />
            </a>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-full text-gray-300 hover:bg-gray-100 hover:text-gray-500"
                aria-label={t("connections.menuAriaLabel")}
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
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setShowEdit(true)}>
                {t("connections.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-500 focus:text-red-500 focus:bg-red-50"
                onSelect={() => setShowConfirm(true)}
              >
                {t("connections.delete")}
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
      <AlertDialog
        open={showConfirm}
        onOpenChange={(o) => {
          if (!o) setShowConfirm(false);
        }}
      >
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("connections.deleteDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>
                  {t("connections.deleteDialogBody", {
                    name: conn.toDisplayName,
                  })}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {t("connections.deleteDialogHint")}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="flex-1" disabled={isDeleting}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? t("connections.deleting") : t("connections.deleteConfirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  const t = useT();
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
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("connections.editDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("connections.editDialogWith", { name: conn.toDisplayName })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {contextLocked ? (
            conn.eventName && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  {t("connections.metLocationLabel")}
                </p>
                <div className="px-2 py-1 bg-pink-50 rounded text-xs text-pink-700 inline-block">
                  <span className="font-medium">{conn.eventName}</span>
                  {conn.venueName && (
                    <span className="text-pink-500"> @ {conn.venueName}</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {t("connections.eventLockedHint")}
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
                  {t("connections.eventNameLabel")}
                </label>
                <Input
                  id="conn-event-name"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  maxLength={100}
                  placeholder={t("connections.eventNamePlaceholder")}
                />
              </div>
              <div>
                <label
                  htmlFor="conn-venue-name"
                  className="text-xs font-medium text-gray-500 mb-1 block"
                >
                  {t("connections.venueLabel")}
                </label>
                <Input
                  id="conn-venue-name"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  maxLength={100}
                  placeholder={t("connections.venuePlaceholder")}
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
              {t("connections.privateMemoLabel")}
              <span className="font-normal text-gray-400">
                {t("connections.privateMemoHint")}
              </span>
            </label>
            <div className="relative">
              <Textarea
                id="conn-memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                maxLength={500}
                placeholder={t("connections.memoPlaceholder")}
                className="pb-6"
              />
              <span className="absolute bottom-2 right-3 text-xs text-gray-400">
                {memo.length}/500
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isSaving}
          >
            {t("common.cancel")}
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
            {isSaving ? t("edit.saving") : t("edit.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState() {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="text-4xl">🤝</div>
      <p className="text-sm text-gray-500 text-center">
        {t("connections.emptyTitle")}
      </p>
      <p className="text-xs text-gray-400 text-center">
        {t("connections.emptyHint")}
      </p>
    </div>
  );
}
