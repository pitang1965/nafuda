import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { capture } from "../../lib/analytics";
import { useState, useEffect } from "react";
import { getOwnProfile } from "../../server/functions/profile";
import {
  createConnectionQrToken,
  deleteConnectionQrToken,
  checkQrConnectionStatus,
} from "../../server/functions/connection";
import { createInstantEventAndCheckin } from "../../server/functions/event";
import { PersonaSwitcher } from "../../components/PersonaSwitcher";
import { InitialsAvatar } from "../../components/InitialsAvatar";
import { SnsLinkButton } from "../../components/SnsLinkButton";
import { NafudaLinkChip } from "../../components/NafudaLinkChip";
import { NafudaIcon } from "../../components/NafudaIcon";
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
  // 遷移のたびに最新を取得する。キャッシュした古いデータを描画すると、
  // なふだ削除直後に「消えたはずのなふだが一瞬見える」ちらつきが起きるため。
  staleTime: 0,
  staticData: { title: "なふだ" },
  component: MePage,
});

function PrivateBadge() {
  return <span className="text-xs text-gray-400 ml-1">🔒</span>;
}

const LAST_PERSONA_KEY = "nafuda_last_persona_id";

// クライアント側で最後に見ていたなふだIDをCookieから読む。
// SSR時は document が無いので null（loader の initialPersonaId にフォールバックする）。
function readLastPersonaId(): string | null {
  if (typeof document === "undefined") return null;
  return (
    document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${LAST_PERSONA_KEY}=`))
      ?.slice(LAST_PERSONA_KEY.length + 1) ?? null
  );
}

function MePage() {
  const { urlId, personas, initialPersonaId } = Route.useLoaderData();
  const navigate = useNavigate();
  const [currentPersonaId, setCurrentPersonaId] = useState(() => {
    // 編集画面から戻った際の再マウントでは、loader がキャッシュした initialPersonaId が
    // 切り替え前の古い値のことがある。クライアントの Cookie は常に最新なので Cookie を優先し、
    // 実在するなふだを指す場合のみ採用する（削除済み等はフォールバック）。
    const fromCookie = readLastPersonaId();
    if (fromCookie && personas.some((p) => p.id === fromCookie))
      return fromCookie;
    return initialPersonaId ?? "";
  });
  // 選択中IDは useState に凍結されるため、削除直後など loader が更新されて
  // currentPersonaId が実在しないなふだを指すことがある。その場合は fresh な
  // loader データ側へフォールバックして「切り替わらない／?表示」を防ぐ。
  const currentPersona =
    personas.find((p) => p.id === currentPersonaId) ??
    personas.find((p) => p.id === initialPersonaId) ??
    personas[0];
  const activePersonaId = currentPersona?.id ?? "";
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

  // 前回使ったなふだをCookieに保存する。次回 /me 表示時にSSRが読み取り、
  // 正しいなふだを最初から描画できる（localStorageだとSSRから見えずフラッシュする）。
  useEffect(() => {
    if (activePersonaId)
      document.cookie = `${LAST_PERSONA_KEY}=${activePersonaId}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, [activePersonaId]);

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
    <>
      {/* なふだ切り替え・編集（ホーム固有・中立色のストリップ） */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <PersonaSwitcher
          personas={personas}
          currentPersonaId={activePersonaId}
          onSwitch={setCurrentPersonaId}
          onCreateNew={() => navigate({ to: "/profile/wizard" })}
        />
        <Link
          to="/profile/edit"
          search={{ personaId: activePersonaId }}
          className="text-sm text-gray-500 underline hover:text-gray-700"
        >
          編集
        </Link>
      </div>

      <PwaInstallBanner />

      {/* なふだ領域 */}
      <div
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
            <h1 className="text-xl font-bold">{currentPersona?.displayName}</h1>
            {isPrivate("display_name") && <PrivateBadge />}
          </div>

          {!currentPersona?.label && (
            <Link
              to="/profile/edit"
              search={{ personaId: activePersonaId }}
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
                  className="text-xs font-medium inline-flex items-center gap-1"
                  style={{ color: subtextColor ?? "#6b7280" }}
                >
                  <NafudaIcon /> 他のなふだ
                </span>
                <div className="flex flex-wrap gap-2 justify-center">
                  {currentPersona.nafudaLinks.map((link) => (
                    <NafudaLinkChip
                      key={link.targetShareToken}
                      urlId={urlId}
                      shareToken={link.targetShareToken}
                      displayName={link.targetDisplayName}
                      avatarUrl={link.targetAvatarUrl}
                      // /me ではシェルから出ず、PersonaSwitcher と同じ in-place
                      // 切り替えにする（ADR-0019）。なふだリンクは必ず自分の別ペルソナを指す。
                      onSelect={() => setCurrentPersonaId(link.targetPersonaId)}
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
            <div className="flex flex-col gap-1">
              <Button
                onClick={() => setProfileQrOpen(true)}
                size="lg"
                className="w-full rounded-xl"
              >
                なふだを見せる
              </Button>
              <p
                className="text-xs text-center"
                style={{ color: subtextColor ?? "#9ca3af" }}
              >
                プロフィールを見せるだけ。つながりません。
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <Button
                onClick={handleExchangeNafuda}
                disabled={connectQrLoading}
                size="lg"
                className="w-full rounded-xl"
              >
                {connectQrLoading ? "QRを生成中..." : "なふだを交換する"}
              </Button>
              <p
                className="text-xs text-center"
                style={{ color: subtextColor ?? "#9ca3af" }}
              >
                その場でお互いにつながります。
              </p>
            </div>
            {currentPersona && (
              <Link
                to="/u/$urlId/p/$token"
                params={{ urlId, token: currentPersona.shareToken }}
                className="text-xs text-center underline underline-offset-2 transition-colors"
                style={{ color: subtextColor ?? "#9ca3af" }}
              >
                👁 人から見た画面で確認
              </Link>
            )}
          </div>
        </div>
      </div>
      {/* /なふだ領域 */}

      {currentPersona && urlId && (
        <QRBottomSheet
          isOpen={profileQrOpen}
          onClose={() => setProfileQrOpen(false)}
          url={
            origin ? `${origin}/u/${urlId}/p/${currentPersona.shareToken}` : ""
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
    </>
  );
}

function RedirectToWizard() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
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
    </div>
  );
}
