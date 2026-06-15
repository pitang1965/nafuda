import {
  createFileRoute,
  useNavigate,
  useRouter,
  Link,
} from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { capture } from "../../lib/analytics";
import {
  getConnectPageData,
  createConnectionFromQr,
  ensurePendingInvite,
  getPendingInviteData,
  applyPendingInvite,
} from "../../server/functions/connection";
import { InitialsAvatar } from "../../components/InitialsAvatar";
import { NafudaFrame } from "../../components/NafudaFrame";
import { getNafudaStyle } from "../../lib/nafuda-styles";

export const Route = createFileRoute("/connect/$token")({
  loader: ({ params }) => getConnectPageData({ data: { token: params.token } }),
  component: ConnectPage,
});

// getConnectPageData / getPendingInviteData が返す「有効な発行者ビュー」だけを取り出した型
type ValidView = Extract<
  Awaited<ReturnType<typeof getConnectPageData>>,
  { valid: true }
>;

function ConnectPage() {
  const loaderData = Route.useLoaderData();
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();

  // QRトークンが期限切れのとき、localStorage の inviteToken から復旧した発行者ビュー
  const [inviteView, setInviteView] = useState<ValidView | null>(null);
  // QR無効時、復旧フェッチが完了するまでローディング表示する（loaderData由来でSSRと一致）
  const [rescueLoading, setRescueLoading] = useState(!loaderData.valid);

  const [connected, setConnected] = useState(
    loaderData.valid && loaderData.alreadyConnected,
  );
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  // 描画に使う有効なデータソース: QRが生きていれば loader、死んでいれば招待復旧
  const view: ValidView | null = loaderData.valid ? loaderData : inviteView;

  const clearPending = () => {
    localStorage.removeItem("pendingConnect");
    localStorage.removeItem(`pendingInvite:${token}`);
  };

  const doConnect = async (fromPersonaId: string) => {
    setShowPicker(false);
    setConnecting(true);
    setError(null);
    const stored = localStorage.getItem(`pendingInvite:${token}`);
    try {
      let result: { connectedAt: string } | null = null;
      if (loaderData.valid) {
        try {
          result = await createConnectionFromQr({
            data: { connectionQrToken: token, fromPersonaId },
          });
        } catch (qrErr) {
          // ページを開いたまま15分超過しQRトークンが切れた場合は保留招待にフォールバック
          if (stored) {
            result = await applyPendingInvite({
              data: { inviteToken: stored, fromPersonaId },
            });
          } else {
            throw qrErr;
          }
        }
      } else if (stored) {
        result = await applyPendingInvite({
          data: { inviteToken: stored, fromPersonaId },
        });
      }
      if (!result) throw new Error("つながり情報が見つかりません");
      capture("connection_completed");
      setConnected(true);
      setConnectedAt(result.connectedAt);
      clearPending();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setConnecting(false);
    }
  };

  useEffect(() => {
    if (loaderData.valid) capture("connect_page_viewed");
  }, [loaderData.valid]);

  // スキャンした時点で保留招待を作成し inviteToken を localStorage に保存。ログイン有無を問わず作る
  // ——ログイン済みでもページを開いたまま15分超過するとQRトークンが切れるため、恒久的な後追い接続の
  // 受け皿として全スキャナーに必要（ADR-0007 §3 の「ログイン済みは記録不要」前提を是正）。setStateは持たない。
  useEffect(() => {
    if (!loaderData.valid) return;
    const key = `pendingInvite:${token}`;
    if (localStorage.getItem(key)) return;
    ensurePendingInvite({ data: { connectionQrToken: token } })
      .then((r) => localStorage.setItem(key, r.inviteToken))
      .catch(() => {
        /* 招待作成失敗は致命ではない（その場で登録すれば通常フローで繋がれる） */
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // QRトークン期限切れ時の復旧: localStorage の inviteToken から発行者ビューを取得。
  // setStateはすべて非同期コールバック内に閉じ込める（同期setStateを避ける）。
  useEffect(() => {
    if (loaderData.valid) return;
    const key = `pendingInvite:${token}`;
    const stored = localStorage.getItem(key);
    const fetched = stored
      ? getPendingInviteData({ data: { inviteToken: stored } }).then((d) => {
          if (d.valid) {
            setInviteView(d);
            if (d.alreadyConnected) setConnected(true);
          } else {
            localStorage.removeItem(key);
          }
        })
      : Promise.resolve();
    fetched.finally(() => setRescueLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ログイン・ウィザード完了後に自動接続する。招待復旧（inviteView）の到着を待って再評価する。
  // 判定後の状態更新はマイクロタスクに逃がし、エフェクト本体での同期setStateを避ける。
  useEffect(() => {
    if (localStorage.getItem("pendingConnect") !== token) return;
    if (connected) {
      clearPending();
      return;
    }
    if (!view) return; // 招待復旧の読み込み待ち
    const session = view.session;
    if (!session?.user) return;
    const myPersonas = session.myPersonas;
    Promise.resolve().then(() => {
      if (myPersonas.length === 0) {
        navigate({
          to: "/profile/wizard",
          search: { redirect: `/connect/${token}` },
        });
      } else if (myPersonas.length === 1) {
        doConnect(myPersonas[0].id);
      } else {
        setShowPicker(true);
      }
    });
  }, [inviteView]); // eslint-disable-line react-hooks/exhaustive-deps

  // QRが死んでいて復旧データもまだ無い → 復旧中 or 期限切れ
  if (!view) {
    if (rescueLoading) {
      return (
        <main className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
          <p className="text-sm text-gray-400">読み込み中...</p>
        </main>
      );
    }
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-2xl">⏰</p>
        <p className="text-sm text-gray-500 text-center">
          このQRコードは期限切れか無効です。
          <br />
          相手に新しいQRコードを表示してもらってください。
        </p>
      </main>
    );
  }

  const { profile, session } = view;
  const style = getNafudaStyle(profile.styleId ?? null);
  const textColor = style?.textColor;
  const subtextColor = style?.subtextColor;
  const canGoBack = typeof window !== "undefined" && window.history.length > 1;

  const handleConnectClick = async () => {
    if (!session?.user) {
      localStorage.setItem("pendingConnect", token);
      await navigate({
        to: "/login",
        search: { redirect: `/connect/${token}` },
      });
      return;
    }
    if (session.myPersonas.length === 0) {
      localStorage.setItem("pendingConnect", token);
      await navigate({
        to: "/profile/wizard",
        search: { redirect: `/connect/${token}` },
      });
      return;
    }
    capture("connect_button_tapped");
    if (session.myPersonas.length === 1) {
      await doConnect(session.myPersonas[0].id);
    } else {
      setShowPicker(true);
    }
  };

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

        <main
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

            <div className="text-center">
              <h1
                className="text-2xl font-bold"
                style={{ color: textColor ?? undefined }}
              >
                {profile.displayName}
              </h1>
              {profile.bio && (
                <p
                  className="mt-2 text-sm text-center whitespace-pre-wrap max-w-xs"
                  style={{ color: subtextColor ?? "#6b7280" }}
                >
                  {profile.bio}
                </p>
              )}
            </div>

            {profile.oshiTags.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {profile.oshiTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={
                      style
                        ? { background: `${textColor}20`, color: subtextColor }
                        : { background: "#fce7f3", color: "#be185d" }
                    }
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* つながるボタン */}
            <div className="w-full max-w-sm mt-4">
              {connected ? (
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="w-full text-center px-6 py-3 rounded-xl text-sm font-medium"
                    style={
                      style
                        ? { background: `${textColor}20`, color: subtextColor }
                        : { background: "#f3f4f6", color: "#6b7280" }
                    }
                  >
                    つながり済み ✓
                  </div>
                  {connectedAt && (
                    <p
                      className="text-xs text-center"
                      style={{ color: subtextColor ?? "#9ca3af" }}
                    >
                      {new Date(connectedAt).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  )}
                  <Link
                    to="/me"
                    className="w-full text-center px-6 py-3 bg-pink-500 text-white rounded-xl text-sm font-medium hover:bg-pink-600 transition-colors block"
                  >
                    マイなふだを見る
                  </Link>
                </div>
              ) : showPicker ? (
                <PersonaPicker
                  personas={session!.myPersonas}
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
          </div>
        </main>
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
