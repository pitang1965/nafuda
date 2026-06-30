import { Sheet } from "react-modal-sheet";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import { useAnimate } from "motion/react";

interface QRBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  label: string;
  exchangeMode?: {
    onExchanged: () => void;
    onNotExchanged: () => void;
    connectionNotification?: { displayName: string } | null;
  };
}

export function QRBottomSheet({
  isOpen,
  onClose,
  url,
  label,
  exchangeMode,
}: QRBottomSheetProps) {
  const [mounted] = useState(() => typeof window !== "undefined");
  const [copied, setCopied] = useState(false);
  const [scope, animate] = useAnimate();
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // PC で Esc キーで閉じる（閲覧系QRのみ。交換系は意図的に対象外）
  useEffect(() => {
    if (!isOpen || exchangeMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, exchangeMode, onClose]);

  const handleBackdropTap = async () => {
    if (!exchangeMode) {
      onClose();
      return;
    }
    await animate(
      scope.current,
      { x: [0, -12, 12, -8, 8, -4, 4, 0] },
      { duration: 0.4 },
    );
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 高解像度の隠しキャンバスから PNG を書き出して保存する。
  // iOS Safari では download が効かず画像が開くだけのことがあるが、
  // その場合も長押しで写真に保存できるため許容する。
  const saveQrImage = () => {
    const canvas = canvasContainerRef.current?.querySelector("canvas");
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = "nafuda-qr.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    }, "image/png");
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={exchangeMode ? () => {} : onClose}
      detent="content"
      disableDrag={!!exchangeMode}
    >
      <Sheet.Container>
        {!exchangeMode && <Sheet.Header />}
        <Sheet.Content>
          <div
            ref={scope}
            className="flex flex-col items-center gap-4 p-6 pb-10"
          >
            <p className="text-sm text-gray-500">{label}</p>
            {!mounted || !url ? (
              <div className="w-55 h-55 bg-gray-100 rounded-lg animate-pulse" />
            ) : (
              <QRCodeSVG
                value={url}
                size={220}
                level="M"
                marginSize={4}
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
            )}
            {/* 配布手段（コピー＋QR画像保存）は永続QR（プロフィール／イベント）
                のみが持つ。対面・短命のつながりQR（exchangeMode）には持たせない
                ── 対面でない接続を作らないため（ADR-0013）。 */}
            {!exchangeMode && (
              <>
                <button
                  onClick={handleCopy}
                  className="flex flex-col items-center gap-1 group"
                >
                  <p className="text-xs text-gray-400 break-all text-center max-w-60 group-hover:text-gray-600 transition-colors">
                    {url}
                  </p>
                  <span
                    className="text-xs font-medium transition-colors"
                    style={{ color: copied ? "#16a34a" : "#9ca3af" }}
                  >
                    {copied ? "コピーしました" : "タップしてコピー"}
                  </span>
                </button>
                <button
                  onClick={saveQrImage}
                  className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <span aria-hidden>⬇</span>
                  QR画像を保存
                </button>
                {/* PNG 書き出し用の隠しキャンバス（高解像度）。表示は上の SVG。 */}
                {mounted && url && (
                  <div
                    ref={canvasContainerRef}
                    aria-hidden
                    style={{
                      position: "absolute",
                      width: 0,
                      height: 0,
                      overflow: "hidden",
                      pointerEvents: "none",
                    }}
                  >
                    <QRCodeCanvas
                      value={url}
                      size={1024}
                      level="M"
                      marginSize={4}
                      bgColor="#FFFFFF"
                      fgColor="#000000"
                    />
                  </div>
                )}
              </>
            )}

            {exchangeMode &&
              (exchangeMode.connectionNotification ? (
                <div className="w-full flex flex-col items-center gap-3 pt-2">
                  <p className="text-2xl">🎉</p>
                  <p className="text-base font-bold text-gray-800">
                    つながりました！
                  </p>
                  <p className="text-sm text-gray-500">
                    {exchangeMode.connectionNotification.displayName}{" "}
                    さんとつながりました
                  </p>
                  <button
                    onClick={exchangeMode.onExchanged}
                    className="w-full px-6 py-3 bg-pink-500 text-white rounded-xl text-sm font-medium hover:bg-pink-600 transition-colors"
                  >
                    閉じる
                  </button>
                </div>
              ) : (
                <div className="w-full flex flex-col gap-2 pt-2">
                  <button
                    onClick={exchangeMode.onExchanged}
                    className="w-full px-6 py-3 bg-pink-500 text-white rounded-xl text-sm font-medium hover:bg-pink-600 transition-colors"
                  >
                    交換予定
                  </button>
                  <button
                    onClick={exchangeMode.onNotExchanged}
                    className="w-full px-4 py-2 text-gray-400 text-sm hover:text-gray-600 transition-colors"
                  >
                    交換しない
                  </button>
                </div>
              ))}
          </div>
        </Sheet.Content>
      </Sheet.Container>
      <Sheet.Backdrop onTap={handleBackdropTap} />
    </Sheet>
  );
}
