import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { capture } from "../../lib/analytics";
import { useState, useEffect } from "react";
import { getOwnProfile, deleteAccount } from "../../server/functions/profile";
import {
  createConnectionQrToken,
  deleteConnectionQrToken,
  checkQrConnectionStatus,
} from "../../server/functions/connection";
import { createInstantEventAndCheckin } from "../../server/functions/event";
import { authClient } from "../../lib/auth-client";
import { PersonaSwitcher } from "../../components/PersonaSwitcher";
import { InitialsAvatar } from "../../components/InitialsAvatar";
import { SnsLinkButton } from "../../components/SnsLinkButton";
import { NafudaLinkChip } from "../../components/NafudaLinkChip";
import { GalleryLightbox } from "../../components/GalleryLightbox";
import { QRBottomSheet } from "../../components/QRBottomSheet";
import { ExchangeContextSheet } from "../../components/ExchangeContextSheet";
import { PwaInstallBanner } from "../../components/PwaInstallBanner";
import { Button } from "@/components/ui/button";
import { getNafudaStyle } from "../../lib/nafuda-styles";
import { NafudaFrame } from "../../components/NafudaFrame";
import { HolographicOverlay } from "../../components/HolographicOverlay";
import { CherryBlossomOverlay } from "../../components/CherryBlossomOverlay";

export const Route = createFileRoute("/_protected/me")({
  loader: () => getOwnProfile(),
  component: MePage,
});

function PrivateBadge() {
  return <span className="text-xs text-gray-400 ml-1">🔒</span>;
}

const LAST_PERSONA_KEY = "nafuda_last_persona_id";

function MePage() {
  const { urlId, personas, initialPersonaId } = Route.useLoaderData();
  const navigate = useNavigate();
  const [currentPersonaId, setCurrentPersonaId] = useState(
    () => initialPersonaId ?? "",
  );
  const currentPersona = personas.find((p) => p.id === currentPersonaId);
  const style = getNafudaStyle(currentPersona?.styleId ?? null);
  const subtextColor = style?.subtextColor;
  const [profileQrOpen, setProfileQrOpen] = useState(false);
  const [connectQrOpen, setConnectQrOpen] = useState(false);
  const [connectQrUrl, setConnectQrUrl] = useState<string | null>(null);
  const [connectQrToken, setConnectQrToken] = useState<string | null>(null);
  const [connectQrLoading, setConnectQrLoading] = useState(false);
  const [connectQrSince, setConnectQrSince] = useState<string | null>(null);
  const [connectionNotification, setConnectionNotification] = useState<{
    displayName: string;
  } | null>(null);
  const [origin] = useState(() =>
    typeof window !== "undefined" ? window.location.origin : "",
  );
  const [exchangeContextOpen, setExchangeContextOpen] = useState(false);
  const [exchangeContextSubmitting, setExchangeContextSubmitting] =
    useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteAgreed, setDeleteAgreed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // 前回使ったなふだをCookieに保存する。次回 /me 表示時にSSRが読み取り、
  // 正しいなふだを最初から描画できる（localStorageだとSSRから見えずフラッシュする）。
  useEffect(() => {
    if (currentPersonaId)
      document.cookie = `${LAST_PERSONA_KEY}=${currentPersonaId}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, [currentPersonaId]);

  useEffect(() => {
    if (!style?.fontUrl) return;
    if (document.querySelector(`link[data-nafuda-font="${style.id}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = style.fontUrl;
    link.setAttribute("data-nafuda-font", style.id);
    document.head.appendChild(link);
  }, [style?.fontUrl, style?.id]);

  // QR表示中に接続成立をポーリングで検知する
  useEffect(() => {
    if (!connectQrOpen || !connectQrToken || !currentPersona || !connectQrSince)
      return;
    const token = connectQrToken;
    const fromPersonaId = currentPersona.id;
    const since = connectQrSince;
    const poll = async () => {
      try {
        const result = await checkQrConnectionStatus({
          data: { token, fromPersonaId, since },
        });
        if (result.status === "connected") {
          setConnectionNotification({ displayName: result.displayName });
        }
      } catch {
        // ポーリングエラーは無視
      }
    };
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [connectQrOpen, connectQrToken, currentPersona, connectQrSince]);

  const handleLogout = async () => {
    await authClient.signOut();
    await navigate({ to: "/login" });
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      await authClient.signOut();
      await navigate({ to: "/login" });
    } catch {
      setDeleteError("退会処理に失敗しました。再度お試しください。");
      setIsDeleting(false);
    }
  };

  const handleExchangeNafuda = () => {
    if (!currentPersona) return;
    setExchangeContextOpen(true);
  };

  const openQr = async () => {
    if (!currentPersona) return;
    const { token } = await createConnectionQrToken({
      data: { fromPersonaId: currentPersona.id },
    });
    setConnectQrToken(token);
    setConnectQrUrl(`${origin}/connect/${token}`);
    setConnectQrSince(new Date().toISOString());
    setConnectQrOpen(true);
    capture("exchange_qr_shown");
  };

  const handleContextSubmit = async (
    eventName: string,
    gpsCoordinates: { x: number; y: number } | null,
  ) => {
    if (!currentPersona) return;
    setExchangeContextSubmitting(true);
    try {
      await createInstantEventAndCheckin({
        data: {
          eventName,
          personaId: currentPersona.id,
          gpsCoordinates: gpsCoordinates ?? undefined,
        },
      });
      setExchangeContextOpen(false);
      setConnectQrLoading(true);
      try {
        await openQr();
      } finally {
        setConnectQrLoading(false);
      }
    } catch (err) {
      throw err;
    } finally {
      setExchangeContextSubmitting(false);
    }
  };

  const handleContextSkip = async () => {
    setExchangeContextOpen(false);
    setConnectQrLoading(true);
    try {
      await openQr();
    } finally {
      setConnectQrLoading(false);
    }
  };

  const closeConnectQr = () => {
    setConnectQrOpen(false);
    setConnectQrUrl(null);
    setConnectQrToken(null);
    setConnectQrSince(null);
    setConnectionNotification(null);
  };

  const handleExchanged = () => closeConnectQr();

  const handleNotExchanged = async () => {
    if (connectQrToken) {
      await deleteConnectionQrToken({ data: { token: connectQrToken } });
    }
    closeConnectQr();
  };

  // No persona yet → redirect to wizard
  if (!personas.length || !urlId) {
    return <RedirectToWizard />;
  }

  const vis = (currentPersona?.fieldVisibility ?? {}) as Record<string, string>;
  const isPrivate = (field: string) => vis[field] === "private";

  return (
    <div
      className={
        style ? "min-h-screen bg-gray-900" : "min-h-screen bg-gray-100"
      }
    >
      <div
        className={`mx-auto sm:max-w-sm w-full min-h-screen flex flex-col${style ? "" : " bg-white sm:shadow-sm"}`}
      >
        {/* Top bar - なふだ領域外 */}
        <div
          className="flex items-center justify-between p-4"
          style={
            style
              ? { borderBottom: "1px solid rgba(255,255,255,0.12)" }
              : { borderBottom: "1px solid #e5e7eb" }
          }
        >
          <PersonaSwitcher
            personas={personas}
            currentPersonaId={currentPersonaId}
            onSwitch={setCurrentPersonaId}
            onCreateNew={() => navigate({ to: "/profile/wizard" })}
          />
          <div className="flex items-center gap-3">
            <Link
              to="/profile/edit"
              search={{ personaId: currentPersonaId }}
              className="text-sm underline"
              style={{ color: style ? "rgba(255,255,255,0.65)" : "#6b7280" }}
            >
              編集
            </Link>
            <Link
              to="/events"
              className="text-sm underline"
              style={{ color: style ? "rgba(255,255,255,0.65)" : "#6b7280" }}
            >
              イベント
            </Link>
            <Button
              variant="link"
              size="sm"
              onClick={handleLogout}
              className="p-0 h-auto"
              style={{ color: style ? "rgba(255,255,255,0.65)" : "#6b7280" }}
            >
              ログアウト
            </Button>
          </div>
        </div>

        <PwaInstallBanner />

        {/* なふだ領域 */}
        <main
          className="flex-1 relative"
          style={
            style
              ? {
                  background: style.background,
                  fontFamily: style.fontFamily,
                  color: style.textColor,
                }
              : undefined
          }
        >
          {style?.frameId && <NafudaFrame frameId={style.frameId} />}
          {style?.holographic && <HolographicOverlay />}
          {style?.petalsFall && <CherryBlossomOverlay />}
          <div className="p-6 flex flex-col items-center gap-4 relative z-20">
            <div
              className={`relative ${isPrivate("avatar_url") ? "opacity-50" : ""}`}
            >
              {currentPersona?.avatarUrl ? (
                <img
                  src={currentPersona.avatarUrl}
                  alt=""
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <InitialsAvatar
                  name={currentPersona?.displayName ?? "?"}
                  size={80}
                />
              )}
              {isPrivate("avatar_url") && (
                <span className="absolute -bottom-1 -right-1 bg-white rounded-full text-sm leading-none px-0.5">
                  🔒
                </span>
              )}
            </div>

            <div
              className={`flex items-center gap-1 ${isPrivate("display_name") ? "opacity-50" : ""}`}
            >
              <h1 className="text-xl font-bold">
                {currentPersona?.displayName}
              </h1>
              {isPrivate("display_name") && <PrivateBadge />}
            </div>

            {!currentPersona?.label && (
              <Link
                to="/profile/edit"
                search={{ personaId: currentPersonaId }}
                className="text-xs underline"
                style={{ color: subtextColor ?? "#9ca3af" }}
              >
                ラベルを設定する →
              </Link>
            )}

            {currentPersona?.bio && (
              <div
                className={`w-full max-w-xs text-center ${isPrivate("bio") ? "opacity-50" : ""}`}
              >
                <p
                  className="text-sm whitespace-pre-wrap"
                  style={{ color: subtextColor ?? "#4b5563" }}
                >
                  {currentPersona.bio}
                </p>
                {isPrivate("bio") && (
                  <p className="text-xs text-gray-400 mt-1">🔒 非公開</p>
                )}
              </div>
            )}

            {currentPersona?.oshiTags && currentPersona.oshiTags.length > 0 && (
              <div
                className={`w-full max-w-xs ${isPrivate("oshi_tags") ? "opacity-50" : ""}`}
              >
                <div className="flex flex-wrap gap-1 justify-center">
                  {currentPersona.oshiTags.map((tag) => (
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
                {isPrivate("oshi_tags") && (
                  <p className="text-xs text-gray-400 text-center mt-1">
                    🔒 非公開
                  </p>
                )}
              </div>
            )}

            {currentPersona?.galleryPhotos &&
              currentPersona.galleryPhotos.length > 0 && (
                <div
                  className={`w-full max-w-xs ${isPrivate("gallery") ? "opacity-50" : ""}`}
                >
                  <GalleryLightbox
                    photos={currentPersona.galleryPhotos}
                    accentColor={style?.textColor}
                  />
                  {isPrivate("gallery") && (
                    <p className="text-xs text-gray-400 text-center mt-1">
                      🔒 非公開
                    </p>
                  )}
                </div>
              )}

            {currentPersona?.snsLinks && currentPersona.snsLinks.length > 0 && (
              <div
                className={`flex flex-col gap-2 w-full max-w-xs ${isPrivate("sns_links") ? "opacity-50" : ""}`}
              >
                {currentPersona.snsLinks.map((link) => (
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
                {isPrivate("sns_links") && (
                  <p className="text-xs text-gray-400 text-center">🔒 非公開</p>
                )}
              </div>
            )}

            {currentPersona?.nafudaLinks &&
              currentPersona.nafudaLinks.length > 0 &&
              urlId && (
                <div className="w-full max-w-xs flex flex-col items-center gap-1">
                  <span
                    className="text-xs font-medium"
                    style={{ color: subtextColor ?? "#6b7280" }}
                  >
                    📛 他のなふだ
                  </span>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {currentPersona.nafudaLinks.map((link) => (
                      <NafudaLinkChip
                        key={link.targetShareToken}
                        urlId={urlId}
                        shareToken={link.targetShareToken}
                        displayName={link.targetDisplayName}
                        avatarUrl={link.targetAvatarUrl}
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
                </div>
              )}

            <div className="w-full max-w-xs pt-2 flex flex-col gap-2">
              <Button
                onClick={() => setProfileQrOpen(true)}
                size="lg"
                className="w-full rounded-xl"
              >
                なふだを見せる
              </Button>
              <Button
                onClick={handleExchangeNafuda}
                disabled={connectQrLoading}
                size="lg"
                className="w-full rounded-xl"
              >
                {connectQrLoading ? "QRを生成中..." : "なふだを交換する"}
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="w-full rounded-xl text-gray-700 bg-white border-gray-200 hover:bg-gray-50 hover:text-gray-800"
              >
                <Link to="/connections">つながりを見る</Link>
              </Button>
            </div>

            <div className="pt-6 pb-2">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="text-xs underline hover:text-red-500"
                style={{ color: subtextColor ?? "#9ca3af" }}
              >
                退会する
              </button>
            </div>
          </div>
        </main>
        {/* /なふだ領域 */}

        {currentPersona && urlId && (
          <QRBottomSheet
            isOpen={profileQrOpen}
            onClose={() => setProfileQrOpen(false)}
            url={
              origin
                ? `${origin}/u/${urlId}/p/${currentPersona.shareToken}`
                : ""
            }
            label={`${currentPersona.displayName} のなふだ（閲覧用）`}
          />
        )}
        <ExchangeContextSheet
          isOpen={exchangeContextOpen}
          isSubmitting={exchangeContextSubmitting}
          onSubmit={handleContextSubmit}
          onSkip={handleContextSkip}
        />
        {connectQrUrl && (
          <QRBottomSheet
            isOpen={connectQrOpen}
            onClose={() => {}}
            url={connectQrUrl}
            label="相手にスキャンしてもらう（15分有効）"
            exchangeMode={{
              onExchanged: handleExchanged,
              onNotExchanged: handleNotExchanged,
              connectionNotification,
            }}
          />
        )}

        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm">
              <h2 className="text-lg font-bold mb-3">退会の確認</h2>
              <p className="text-sm text-gray-600 mb-3">
                以下のデータが完全に削除されます（復元できません）：
              </p>
              <ul className="text-sm text-gray-600 mb-4 list-disc pl-4 space-y-1">
                <li>すべてのなふだ</li>
                <li>つながり（相手側の記録も含む）</li>
                <li>チェックイン履歴</li>
              </ul>
              <label className="flex items-start gap-2 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteAgreed}
                  onChange={(e) => setDeleteAgreed(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-sm">
                  上記の内容をすべて削除することに同意します
                </span>
              </label>
              {deleteError && (
                <p className="text-sm text-red-500 mb-3">{deleteError}</p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteAgreed(false);
                    setDeleteError(null);
                  }}
                  disabled={isDeleting}
                >
                  キャンセル
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDeleteAccount}
                  disabled={!deleteAgreed || isDeleting}
                >
                  {isDeleting ? "処理中..." : "退会する"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RedirectToWizard() {
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteAgreed, setDeleteAgreed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleLogout = async () => {
    await authClient.signOut();
    await navigate({ to: "/login" });
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      await authClient.signOut();
      await navigate({ to: "/login" });
    } catch {
      setDeleteError("退会処理に失敗しました。再度お試しください。");
      setIsDeleting(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-pink-500 mb-2">なふだ</h1>
        <p className="text-sm text-gray-400">ようこそ！</p>
      </div>
      <p className="text-sm text-gray-500 text-center max-w-xs leading-relaxed">
        なふだはQRコードと紐づいたあなたのデジタル名刺です。
        <br />
        まず1枚作りましょう。
      </p>
      <Button asChild size="lg">
        <Link to="/profile/wizard">なふだを作る</Link>
      </Button>
      <button
        onClick={handleLogout}
        className="text-sm text-gray-400 underline hover:text-gray-600"
      >
        ログアウト
      </button>
      <button
        onClick={() => setShowDeleteModal(true)}
        className="text-xs text-gray-300 underline hover:text-red-400"
      >
        退会する
      </button>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-3">退会の確認</h2>
            <p className="text-sm text-gray-600 mb-4">
              アカウントを削除します。この操作は取り消せません。
            </p>
            <label className="flex items-start gap-2 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteAgreed}
                onChange={(e) => setDeleteAgreed(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-sm">削除することに同意します</span>
            </label>
            {deleteError && (
              <p className="text-sm text-red-500 mb-3">{deleteError}</p>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteAgreed(false);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
              >
                キャンセル
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDeleteAccount}
                disabled={!deleteAgreed || isDeleting}
              >
                {isDeleting ? "処理中..." : "退会する"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
