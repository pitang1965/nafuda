import { Sheet } from "react-modal-sheet";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import { useAnimate } from "motion/react";

interface QRBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  label: string;
  // X 投稿用の定型文。渡された画面だけ「Xでシェア」ボタンを出す（＝配布導線のオプトイン）。
  shareText?: string;
  exchangeMode?: {
    onExchanged: () => void;
    onNotExchanged: () => void;
    connectionNotification?: { displayName: string } | null;
  };
}

// ラベルを指定幅に収まるよう最大 maxLines 行へ折り返す（日本語は文字単位）。
// あふれた場合は末尾を「…」で丸める。PNG 書き出しの額縁用。
function wrapLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = [];
  let current = "";
  for (const ch of Array.from(text)) {
    if (current && ctx.measureText(current + ch).width > maxWidth) {
      lines.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;

  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last && ctx.measureText(last + "…").width > maxWidth) {
    last = last.slice(0, -1);
  }
  kept[maxLines - 1] = last + "…";
  return kept;
}

export function QRBottomSheet({
  isOpen,
  onClose,
  url,
  label,
  shareText,
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

  // X の Web Intent を新規タブで開き、定型文＋URLを差し込んだ投稿前ダイアログを出す。
  // 「コピー」の一歩先＝URLを貼った投稿を手助けするだけで、画像添付はしない。
  const handleShareX = () => {
    if (!shareText) return;
    const intent = new URL("https://x.com/intent/post");
    intent.searchParams.set("text", shareText);
    intent.searchParams.set("url", url);
    window.open(intent.toString(), "_blank", "noopener,noreferrer");
  };

  // 高解像度の隠しキャンバス（1024px の素の白黒QR）に額縁を合成して書き出す。
  // 額縁＝ラベル1〜2行＋「nafuda.me」ブランド帯。QRモジュール自体は無改変なので
  // スキャン成功率は落とさず、単体配布時に「どのなふだ/イベントか」と出所が分かる。
  // iOS Safari では download が効かず画像が開くだけのことがあるが、
  // その場合も長押しで写真に保存できるため許容する。
  const saveQrImage = () => {
    const qr = canvasContainerRef.current?.querySelector("canvas");
    if (!qr) return;

    const QR = 1024;
    const SIDE = 80;
    const TOP_PAD = 80;
    const LABEL_LINE_H = 60;
    const GAP_LABEL_QR = 56;
    const GAP_QR_BRAND = 56;
    const BRAND_H = 48;
    const BOTTOM_PAD = 72;
    const LABEL_FONT = "bold 44px sans-serif";
    const BRAND_FONT = "600 40px sans-serif";
    const width = QR + SIDE * 2;

    const out = document.createElement("canvas");
    const ctx = out.getContext("2d");
    if (!ctx) return;

    ctx.font = LABEL_FONT;
    const lines = wrapLabel(ctx, label, QR, 2);
    const labelBlock = lines.length * LABEL_LINE_H;
    const qrY = TOP_PAD + labelBlock + GAP_LABEL_QR;
    out.width = width;
    out.height = qrY + QR + GAP_QR_BRAND + BRAND_H + BOTTOM_PAD;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, out.width, out.height);

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#374151";
    ctx.font = LABEL_FONT;
    lines.forEach((line, i) => {
      ctx.fillText(line, width / 2, TOP_PAD + i * LABEL_LINE_H);
    });

    ctx.drawImage(qr, SIDE, qrY, QR, QR);

    ctx.fillStyle = "#ec4899";
    ctx.font = BRAND_FONT;
    ctx.fillText("nafuda.me", width / 2, qrY + QR + GAP_QR_BRAND);

    out.toBlob((blob) => {
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
                {/* X 共有はオプトイン（shareText を渡した画面のみ）。対面中心の
                    打ち出しを崩さないよう、保存と同じ控えめなテキストリンク調で並べる。 */}
                {shareText && (
                  <button
                    onClick={handleShareX}
                    className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <span aria-hidden>𝕏</span>
                    Xでシェア
                  </button>
                )}
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
