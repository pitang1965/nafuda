import { Sheet } from "react-modal-sheet";
import { QRCodeCanvas } from "qrcode.react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  NAFUDA_EAR_PATHS,
  NAFUDA_BODY_RECT,
  NAFUDA_SLOT_RECT,
} from "../brand/nafuda-mark.js";

interface PrintLockupSheetProps {
  isOpen: boolean;
  onClose: () => void;
  // 埋め込む QR。永続の「プロフィールQR」URL のみを渡す（つながりQRは対象外）。
  url: string;
  // ダウンロードファイル名の元。表示名など。
  fileBaseName?: string;
}

// 文言プリセット。なふだ流の言い回しを主役に据え、"Scan me!" は一案として残す
// （ADR-0027：文言を選択制にしてパクリ懸念を構造的に回避する）。
const CAPTION_PRESETS = [
  "なふだです",
  "スキャンしちゃう？",
  "つながろう",
  "話しかけてね",
  "はじめまして",
  "SCAN ME",
];

const CAPTION_MAX = 24;

// 印刷用ロックアップの版面定数（フル解像度）。長辺 ~3500px 級・QR は level="H"。
// 白い角丸カードに全要素を載せ、カードの外側は透過にする（ADR-0027）。
const QR_PX = 2400;
const CARD_PAD_X = 280;
const CARD_PAD_TOP = 220;
const CARD_PAD_BOTTOM = 220;
// 文言は QR 幅いっぱいまで広げる。1行で収まる短い文言はこの幅に合わせて拡大し、
// 長い文言は最小サイズで頭打ちにして最大2行へ折り返す。
const CAPTION_TARGET_W = QR_PX;
const CAPTION_MIN_PX = 92;
// 短い文言も QR 幅の近くまで自動で拡大する（上限は 1〜2 文字が巨大化しない程度）。
const CAPTION_MAX_PX = 440;
const CAPTION_LINE_RATIO = 1.2;
const GAP_CAPTION_QR = 140;
const GAP_QR_BRAND = 150;
const BRAND_ROW_H = 172;
const BRAND_FONT_PX = 140;
const BRAND_ICON_PX = 172;
const BRAND_ICON_GAP = 48;
const CARD_RADIUS = 120;
const MARGIN = 60; // 角丸の余白ぶんだけ透過を残す

const CARD_BG = "#FFFFFF";
const CAPTION_COLOR = "#374151";
const BRAND_COLOR = "#ec4899";

// テキストを maxWidth に収まるよう最大 maxLines 行へ折り返す（日本語は文字単位）。
// あふれたら末尾を「…」で丸める。
function wrapText(
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

// 1行の文言が targetW を満たすフォントサイズを求める（min/max でクランプ）。
// 短い文言は QR 幅まで拡大され、長い文言は min で頭打ちになる（呼び出し側で折り返す）。
function fitCaptionFont(ctx: CanvasRenderingContext2D, text: string): number {
  ctx.font = `bold 200px sans-serif`;
  const w = ctx.measureText(text).width;
  if (w <= 0) return CAPTION_MAX_PX;
  const size = (200 * CAPTION_TARGET_W) / w;
  return Math.max(CAPTION_MIN_PX, Math.min(CAPTION_MAX_PX, size));
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// なふだマーク（ネコ耳ホルダー）をピンクで描く。名刺スロットはカード色で塗って
// くり抜きに見せる（白カード上で「白枠のスロット」として成立する）。
// 形状の正本は src/brand/nafuda-mark.js（NafudaIcon.tsx と共有）。
function drawNafudaMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  const s = size / 100;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = BRAND_COLOR;
  for (const d of NAFUDA_EAR_PATHS) ctx.fill(new Path2D(d));
  roundRectPath(
    ctx,
    NAFUDA_BODY_RECT.x,
    NAFUDA_BODY_RECT.y,
    NAFUDA_BODY_RECT.width,
    NAFUDA_BODY_RECT.height,
    NAFUDA_BODY_RECT.rx,
  );
  ctx.fill();
  ctx.fillStyle = CARD_BG;
  roundRectPath(
    ctx,
    NAFUDA_SLOT_RECT.x,
    NAFUDA_SLOT_RECT.y,
    NAFUDA_SLOT_RECT.width,
    NAFUDA_SLOT_RECT.height,
    NAFUDA_SLOT_RECT.rx,
  );
  ctx.fill();
  ctx.restore();
}

// 白角丸カード＋外側透過のロックアップをフル解像度で描き、canvas を返す。
function renderLockup(
  qrCanvas: HTMLCanvasElement,
  caption: string,
): HTMLCanvasElement | null {
  const out = document.createElement("canvas");
  const ctx = out.getContext("2d");
  if (!ctx) return null;

  const trimmed = caption.trim();
  let lines: string[] = [];
  let captionFont = CAPTION_MAX_PX;
  let captionLineH = 0;
  if (trimmed) {
    captionFont = fitCaptionFont(ctx, trimmed);
    ctx.font = `bold ${captionFont}px sans-serif`;
    lines = wrapText(ctx, trimmed, CAPTION_TARGET_W, 2);
    captionLineH = Math.round(captionFont * CAPTION_LINE_RATIO);
  }
  const captionBlock = lines.length * captionLineH;

  const cardW = QR_PX + CARD_PAD_X * 2;
  const qrY = CARD_PAD_TOP + captionBlock + (lines.length ? GAP_CAPTION_QR : 0);
  const brandY = qrY + QR_PX + GAP_QR_BRAND;
  const cardH = brandY + BRAND_ROW_H + CARD_PAD_BOTTOM;

  out.width = cardW + MARGIN * 2;
  out.height = cardH + MARGIN * 2;

  // 背景は塗らない（透過のまま）。カードだけを描く。
  roundRectPath(ctx, MARGIN, MARGIN, cardW, cardH, CARD_RADIUS);
  ctx.fillStyle = CARD_BG;
  ctx.fill();

  const centerX = MARGIN + cardW / 2;

  // 文言（QR 幅に合わせて拡大）
  if (lines.length) {
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = CAPTION_COLOR;
    ctx.font = `bold ${captionFont}px sans-serif`;
    lines.forEach((line, i) => {
      ctx.fillText(line, centerX, MARGIN + CARD_PAD_TOP + i * captionLineH);
    });
  }

  // QR（モジュールは無改変・level H）
  ctx.drawImage(qrCanvas, MARGIN + CARD_PAD_X, MARGIN + qrY, QR_PX, QR_PX);

  // ブランド行：なふだマーク＋「nafuda.me」を中央寄せで並べる
  ctx.font = `600 ${BRAND_FONT_PX}px sans-serif`;
  const brandText = "nafuda.me";
  const textW = ctx.measureText(brandText).width;
  const groupW = BRAND_ICON_PX + BRAND_ICON_GAP + textW;
  const startX = centerX - groupW / 2;
  const rowY = MARGIN + brandY;
  drawNafudaMark(ctx, startX, rowY + (BRAND_ROW_H - BRAND_ICON_PX) / 2, BRAND_ICON_PX);
  ctx.fillStyle = BRAND_COLOR;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(brandText, startX + BRAND_ICON_PX + BRAND_ICON_GAP, rowY + BRAND_ROW_H / 2);

  return out;
}

export function PrintLockupSheet({
  isOpen,
  onClose,
  url,
  fileBaseName,
}: PrintLockupSheetProps) {
  const [mounted] = useState(() => typeof window !== "undefined");
  const [caption, setCaption] = useState(CAPTION_PRESETS[0]);
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  // 隠しキャンバスの QR を取り、ロックアップを描いてプレビューへ縮小転写する。
  // QR がまだ描画されていなければ false を返す（呼び出し側がリトライする）。
  const drawPreview = useCallback((): boolean => {
    const qr = qrContainerRef.current?.querySelector("canvas");
    const preview = previewRef.current;
    if (!qr || !preview) return false;
    const full = renderLockup(qr, caption);
    if (!full) return false;
    const maxSide = 560;
    const scale = Math.min(maxSide / full.width, maxSide / full.height);
    preview.width = Math.round(full.width * scale);
    preview.height = Math.round(full.height * scale);
    const ctx = preview.getContext("2d");
    if (!ctx) return false;
    ctx.clearRect(0, 0, preview.width, preview.height);
    ctx.drawImage(full, 0, 0, preview.width, preview.height);
    return true;
  }, [caption]);

  useEffect(() => {
    if (!isOpen || !mounted || !url) return;
    // シートのマウント／QRCodeCanvas の描画完了を待つ。数フレームだけリトライ。
    let raf = 0;
    let tries = 0;
    const attempt = () => {
      if (drawPreview() || tries++ > 20) return;
      raf = requestAnimationFrame(attempt);
    };
    raf = requestAnimationFrame(attempt);
    return () => cancelAnimationFrame(raf);
  }, [isOpen, mounted, url, drawPreview]);

  // フル解像度の透過PNGを書き出す。iOS Safari では download が効かず画像が
  // 開くだけのことがあるが、その場合も長押しで写真に保存できるため許容する。
  const handleDownload = () => {
    const qr = qrContainerRef.current?.querySelector("canvas");
    if (!qr) return;
    const full = renderLockup(qr, caption);
    if (!full) return;
    full.toBlob((blob) => {
      if (!blob) return;
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      const safe = (fileBaseName ?? "nafuda")
        .replace(/[^\p{L}\p{N}_-]+/gu, "-")
        .slice(0, 40);
      a.download = `${safe || "nafuda"}-print.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    }, "image/png");
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} detent="content">
      <Sheet.Container>
        <Sheet.Header />
        <Sheet.Content>
          <div className="flex flex-col items-center gap-4 p-6 pb-10">
            <div className="text-center">
              <p className="text-base font-bold text-gray-800">印刷用画像を作る</p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Tシャツやグッズ用の透過PNGを書き出します。
                <br />
                SUZURI などにアップして配置してください。
              </p>
            </div>

            {/* プレビュー：透過が分かるよう濃色地に置く（＝色付きTシャツのイメージ） */}
            <div
              className="rounded-xl p-4 flex items-center justify-center"
              style={{ backgroundColor: "#374151" }}
            >
              {mounted && url ? (
                <canvas
                  ref={previewRef}
                  className="max-w-full h-auto"
                  style={{ maxHeight: 280, width: "auto" }}
                />
              ) : (
                <div className="w-40 h-52 bg-gray-500 rounded-lg animate-pulse" />
              )}
            </div>

            {/* 文言プリセット */}
            <div className="w-full flex flex-col gap-2">
              <p className="text-xs text-gray-400">文言を選ぶ</p>
              <div className="flex flex-wrap gap-2">
                {CAPTION_PRESETS.map((preset) => {
                  const active = caption === preset;
                  return (
                    <button
                      key={preset}
                      onClick={() => setCaption(preset)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                      style={{
                        backgroundColor: active ? "#ec4899" : "#ffffff",
                        color: active ? "#ffffff" : "#6b7280",
                        borderColor: active ? "#ec4899" : "#e5e7eb",
                      }}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={caption}
                maxLength={CAPTION_MAX}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="自由に入力（空にすると文言なし）"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-pink-400"
              />
            </div>

            <button
              onClick={handleDownload}
              className="w-full px-6 py-3 bg-pink-500 text-white rounded-xl text-sm font-medium hover:bg-pink-600 transition-colors"
            >
              画像を書き出す
            </button>

            {/* 高解像度・level H の隠しQRキャンバス（ロックアップ合成用）。 */}
            {mounted && url && (
              <div
                ref={qrContainerRef}
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
                  size={QR_PX}
                  level="H"
                  marginSize={4}
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                />
              </div>
            )}
          </div>
        </Sheet.Content>
      </Sheet.Container>
      <Sheet.Backdrop onTap={onClose} />
    </Sheet>
  );
}
