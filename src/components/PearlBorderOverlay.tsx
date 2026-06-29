import { useEffect, useRef, useState } from "react";

// なふだスタイル「真珠」— カードの縁を一周する真珠の粒の連なり（静的）。
// 四隅SVGフレーム（NafudaFrame）でも、回転する虹色ボーダー（RainbowBorderOverlay）
// でもない、第4の縁取り系統。各粒はラジアルグラデ＋白ハイライトで立体的に見せる。
//
// カードの実寸を測り、辺の長さに合わせて粒数を決めて等間隔に絶対配置する。
// 固定ピッチのタイルだと辺の端数で四隅に重なり/隙間が出るため、実測方式にしている。

const PITCH = 20; // 粒の目標間隔(px)。実際の間隔は辺長に合わせて均等割りされる
const BEAD = 18; // 粒の直径(px)

// 1粒分の見た目。上：白いハイライト、下：真珠本体（closest-side で枠いっぱいに描く）。
const beadImage =
  "radial-gradient(circle closest-side at 36% 32%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 42%)," +
  "radial-gradient(circle closest-side at 50% 50%, #ffffff 0%, #f3eef7 45%, #ddd3e6 88%, rgba(221,211,230,0) 100%)";

function Bead({ x, y }: { x: number; y: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: BEAD,
        height: BEAD,
        transform: "translate(-50%, -50%)",
        backgroundImage: beadImage,
      }}
    />
  );
}

export function PearlBorderOverlay() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const beads: { x: number; y: number }[] = [];
  if (size) {
    // 粒は直径の半分だけ内側に寄せ、カード内に完全に収める（はみ出すとスクロールバーが出る）。
    const m = BEAD / 2;
    const left = m;
    const right = size.w - m;
    const top = m;
    const bottom = size.h - m;
    const innerW = right - left;
    const innerH = bottom - top;
    // 辺ごとに「角を含む粒数」を決める（角は上下辺が担当し、左右辺は内側のみ）。
    const cols = Math.max(2, Math.round(innerW / PITCH) + 1); // 上下辺の粒数（両角込み）
    const rows = Math.max(2, Math.round(innerH / PITCH) + 1); // 左右辺の粒数（両角込み）
    for (let i = 0; i < cols; i++) {
      const x = left + (innerW * i) / (cols - 1);
      beads.push({ x, y: top }); // 上辺
      beads.push({ x, y: bottom }); // 下辺
    }
    for (let j = 1; j < rows - 1; j++) {
      const y = top + (innerH * j) / (rows - 1);
      beads.push({ x: left, y }); // 左辺（角は除く）
      beads.push({ x: right, y }); // 右辺（角は除く）
    }
  }

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 15,
        filter: "drop-shadow(0 1px 1px rgba(80,70,100,0.22))",
      }}
    >
      {beads.map((b, i) => (
        <Bead key={i} x={b.x} y={b.y} />
      ))}
    </div>
  );
}
