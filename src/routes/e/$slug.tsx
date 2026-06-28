import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { useState, useCallback } from "react";
import { auth } from "../../server/auth";
import {
  getEventParticipants,
  checkinToEvent,
  getMyCheckinStatus,
  cancelCheckin,
} from "../../server/functions/event";
import { getOwnProfile } from "../../server/functions/profile";
import { useEventRoomRealtime } from "../../hooks/useEventRoomRealtime";
import { ParticipantCard } from "../../components/ParticipantCard";
import { QRBottomSheet } from "../../components/QRBottomSheet";
import { PersonaSwitcher } from "../../components/PersonaSwitcher";
import { EmptyState } from "../../components/EmptyState";

const getOptionalSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const request = getRequest();
    return await auth.api.getSession({ headers: request.headers });
  },
);

function formatEventDate(date: Date | string, showTime: boolean): string {
  const d = new Date(date);
  if (showTime) {
    return d.toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatEventPeriod(
  start: Date | string,
  end: Date | string | null,
  showTime: boolean,
): string {
  const startStr = formatEventDate(start, showTime);
  if (!end) return startStr;
  const s = new Date(start);
  const e = new Date(end);
  const sameDay = s.toDateString() === e.toDateString();
  // 同日かつ時刻表示なら終了は時刻だけ、それ以外は終了も全体表示。
  if (sameDay) {
    if (!showTime) return startStr;
    const endTime = e.toLocaleTimeString("ja-JP", {
      timeZone: "Asia/Tokyo",
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${startStr} 〜 ${endTime}`;
  }
  return `${startStr} 〜 ${formatEventDate(end, showTime)}`;
}

export const Route = createFileRoute("/e/$slug")({
  loader: async ({ params }) => {
    const [data, session] = await Promise.all([
      getEventParticipants({ data: { token: params.slug } }),
      getOptionalSession(),
    ]);
    let defaultPersonaId: string | null = null;
    let myUrlId: string | null = null;
    let personas: {
      id: string;
      displayName: string;
      label: string | null;
      isDefault: boolean;
    }[] = [];
    let checkedInPersonaIds: string[] = [];
    if (session?.user) {
      const profile = await getOwnProfile();
      personas = (profile?.personas ?? []).map((p) => ({
        id: p.id,
        displayName: p.displayName,
        label: p.label ?? null,
        isDefault: p.isDefault,
      }));
      defaultPersonaId =
        personas.find((p) => p.isDefault)?.id ?? personas[0]?.id ?? null;
      if (personas.length > 0) {
        const statuses = await Promise.all(
          personas.map((p) =>
            getMyCheckinStatus({
              data: { token: params.slug, personaId: p.id },
            }),
          ),
        );
        checkedInPersonaIds = personas
          .filter((_, i) => statuses[i])
          .map((p) => p.id);
      }
      myUrlId = profile?.urlId ?? null;
    }
    const isHost =
      !!session?.user && data?.event?.hostUserId === session.user.id;
    return {
      data,
      token: params.slug,
      isLoggedIn: !!session?.user,
      defaultPersonaId,
      personas,
      checkedInPersonaIds,
      myUrlId,
      isHost,
    };
  },
  component: EventPage,
});

function EventPage() {
  const {
    data,
    token,
    isLoggedIn,
    defaultPersonaId,
    personas,
    checkedInPersonaIds,
    myUrlId,
    isHost,
  } = Route.useLoaderData();
  const router = useRouter();
  const [selectedPersonaId, setSelectedPersonaId] = useState(defaultPersonaId);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkinError, setCheckinError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  // 参加者一覧をリアルタイムに保つ（realtime無効環境では不活性＝従来の静的一覧）。
  // チェックイン/取消の通知・再接続のたびにローダーを再取得して名簿を更新する。
  useEventRoomRealtime({
    enabled: !!data,
    token,
    onChange: () => {
      void router.invalidate();
    },
  });

  const isCheckedIn = selectedPersonaId
    ? checkedInPersonaIds.includes(selectedPersonaId)
    : false;
  const myPersonaName =
    personas.find((p) => p.id === selectedPersonaId)?.displayName ?? null;

  const handleCheckin = useCallback(async () => {
    if (!selectedPersonaId || !data || isCheckedIn) return;
    setIsCheckingIn(true);
    setCheckinError(null);
    try {
      await checkinToEvent({
        data: { token, personaId: selectedPersonaId },
      });
      await router.navigate({
        to: "/e/$slug",
        params: { slug: token },
        replace: true,
      });
    } catch (err) {
      setCheckinError(
        err instanceof Error ? err.message : "チェックインに失敗しました",
      );
    } finally {
      setIsCheckingIn(false);
    }
  }, [selectedPersonaId, data, isCheckedIn, router, token]);

  const handleCancel = useCallback(async () => {
    if (!selectedPersonaId || !data) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      await cancelCheckin({
        data: { token, personaId: selectedPersonaId },
      });
      await router.navigate({
        to: "/e/$slug",
        params: { slug: token },
        replace: true,
      });
    } catch (err) {
      setCancelError(
        err instanceof Error ? err.message : "取り消しに失敗しました",
      );
    } finally {
      setIsCancelling(false);
    }
  }, [selectedPersonaId, data, router, token]);

  if (!data) {
    return (
      <EmptyState
        icon="📅"
        title="イベントが見つかりません"
        description="削除されたか、URLが間違っている可能性があります。"
        cta={{ label: "トップへ戻る", to: "/" }}
        showBack
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="mx-auto sm:max-w-sm w-full min-h-screen bg-white flex flex-col sm:shadow-sm">
        <div className="p-4 border-b flex items-center gap-3">
          <button
            onClick={() => router.navigate({ to: "/" })}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="戻る"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="text-lg font-bold truncate flex-1">
            {data.event.name}
          </h1>
          {isHost && (
            <Link
              to="/e/$slug/edit"
              params={{ slug: token }}
              className="text-sm text-gray-500 underline shrink-0"
            >
              編集
            </Link>
          )}
        </div>

        <main className="p-6 flex flex-col gap-6">
          {/* イベント情報ヘッダー */}
          <div className="flex flex-col gap-1">
            <p className="text-sm text-gray-500">{data.event.venueName}</p>
            <p className="text-xs text-gray-400">
              {formatEventPeriod(
                data.event.eventDate,
                data.event.eventEndDate,
                data.event.showTime,
              )}
            </p>
            {data.event.description && (
              <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap leading-relaxed">
                {data.event.description}
              </p>
            )}
          </div>

          {/* QRコード */}
          <button
            onClick={() => setQrOpen(true)}
            className="w-full py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            QRコードを表示
          </button>

          {/* 参加ボタン / ログイン誘導 */}
          {isLoggedIn ? (
            defaultPersonaId && selectedPersonaId ? (
              <div className="flex flex-col gap-2">
                {personas.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      なふだを選択：
                    </span>
                    <PersonaSwitcher
                      personas={personas}
                      currentPersonaId={selectedPersonaId}
                      onSwitch={setSelectedPersonaId}
                      onCreateNew={() =>
                        router.navigate({
                          to: "/profile/wizard",
                          search: { redirect: `/e/${token}` },
                        })
                      }
                    />
                  </div>
                )}
                {isCheckedIn ? (
                  <>
                    <div className="w-full py-3 rounded-xl bg-green-100 text-green-700 text-sm font-semibold text-center">
                      参加済み{myPersonaName ? `（${myPersonaName}）` : ""}
                    </div>
                    <button
                      onClick={handleCancel}
                      disabled={isCancelling}
                      className="w-full py-2 rounded-xl border border-red-200 text-red-500 text-xs font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isCancelling ? "取り消し中..." : "参加を取り消す"}
                    </button>
                    {cancelError && (
                      <p className="text-xs text-red-500 text-center">
                        {cancelError}
                      </p>
                    )}
                  </>
                ) : (
                  <button
                    onClick={handleCheckin}
                    disabled={isCheckingIn}
                    className="w-full py-3 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isCheckingIn ? "参加中..." : "参加する"}
                  </button>
                )}
                {checkinError && (
                  <p className="text-xs text-red-500 text-center">
                    {checkinError}
                  </p>
                )}
              </div>
            ) : (
              <Link
                to="/profile/wizard"
                search={{ redirect: `/e/${token}` }}
                className="block w-full py-3 rounded-xl border border-black text-center text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                なふだを作って参加する
              </Link>
            )
          ) : (
            <Link
              to="/login"
              search={{ redirect: `/e/${token}` }}
              className="block w-full py-3 rounded-xl bg-black text-white text-center text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              ログインして参加する
            </Link>
          )}

          {/* 参加者カウント */}
          <p className="text-sm text-gray-600 font-medium">
            {data.participants.length}人が参加
          </p>

          {!isLoggedIn && data.participants.length > 0 && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <Link to="/login" className="font-semibold underline">
                ログイン
              </Link>
              するとなふだを閲覧できます
            </p>
          )}

          {/* 参加者グリッド */}
          {data.participants.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {data.participants.map((p) => (
                <ParticipantCard
                  key={p.checkinId}
                  displayName={p.displayName}
                  avatarUrl={p.avatarUrl}
                  profileHref={
                    isLoggedIn && p.urlId && p.urlId !== myUrlId
                      ? `/u/${p.urlId}/p/${p.shareToken}`
                      : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">
              まだ参加者はいません
            </p>
          )}

          <QRBottomSheet
            isOpen={qrOpen}
            onClose={() => setQrOpen(false)}
            url={currentUrl}
            label={`${data.event.name} のQRコード`}
          />
        </main>
      </div>
    </div>
  );
}
