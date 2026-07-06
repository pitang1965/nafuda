import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { getMyConnections } from "../server/functions/connection";
import {
  layoutSky,
  SKY_W,
  SKY_H,
  type SkyLayout,
} from "../lib/meeting-sky";
import { UserAvatar } from "./UserAvatar";
import { Button } from "@/components/ui/button";

type Connection = Awaited<ReturnType<typeof getMyConnections>>[number];

const SKY_GRADIENT = ["#0b1026", "#1a1f3d", "#2b2350"] as const;

// 出会いの夜空 (MeetingSky)。オーナーだけが見る作品ビュー（ADR-0025）。
// つながり一覧と同じデータの別の見え方で、実務はリスト・情緒は夜空が担う。
export function MeetingSkyView({ connections }: { connections: Connection[] }) {
  const sky = useMemo(() => layoutSky(connections), [connections]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = selectedId
    ? connections.find((c) => c.connectionId === selectedId)
    : undefined;
  const selectedStar = selectedId
    ? sky.stars.find((s) => s.connectionId === selectedId)
    : undefined;

  return (
    <div className="flex flex-col gap-2">
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${SKY_GRADIENT[0]} 0%, ${SKY_GRADIENT[1]} 60%, ${SKY_GRADIENT[2]} 100%)`,
        }}
      >
        {/* 星の瞬き。プロジェクト方針により reduced-motion の特別扱いはしない
            （なふだスタイルの petalsFall 等と同じ。CONTEXT.md なふだスタイル） */}
        <style>{`@keyframes skyTwinkle { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }`}</style>

        <svg
          viewBox={`0 0 ${SKY_W} ${SKY_H}`}
          className="w-full h-auto block"
          role="img"
          aria-label="出会いの夜空"
        >
          {sky.dust.map((d, i) => (
            <circle
              key={`dust-${i}`}
              cx={d.x}
              cy={d.y}
              r={d.r}
              fill="#ffffff"
              opacity={d.opacity}
            />
          ))}

          {sky.lines.map((l, i) => (
            <line
              key={`line-${i}`}
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth={1}
            />
          ))}

          {sky.stars.map((s) => (
            <g key={s.connectionId}>
              {s.connectionId === selectedId && (
                <circle
                  cx={s.x}
                  cy={s.y}
                  r={14}
                  fill="none"
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth={1.5}
                />
              )}
              <circle cx={s.x} cy={s.y} r={9} fill={s.color} opacity={0.22} />
              <circle
                cx={s.x}
                cy={s.y}
                r={3.5}
                fill={s.color}
                style={{
                  animation: `skyTwinkle 3.4s ease-in-out ${s.twinkleDelay}s infinite`,
                }}
              />
              {/* タップ領域（見た目より広く取る） */}
              <circle
                cx={s.x}
                cy={s.y}
                r={20}
                fill="transparent"
                className="cursor-pointer"
                onClick={() =>
                  setSelectedId((prev) =>
                    prev === s.connectionId ? null : s.connectionId,
                  )
                }
              />
            </g>
          ))}
        </svg>

        <div className="absolute top-3 left-4 text-white/70 text-xs tracking-wide pointer-events-none">
          {sky.periodLabel} <span className="ml-1.5">★ {sky.count}</span>
        </div>

        {selected && selectedStar && (
          <div className="absolute bottom-2 inset-x-2 flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-md p-3">
            <Link
              to="/u/$urlId/p/$token"
              params={{
                urlId: selected.toUrlId,
                token: selected.toShareToken,
              }}
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <div className="shrink-0">
                <UserAvatar
                  avatarUrl={selected.toAvatarUrl}
                  name={selected.toDisplayName}
                  size={36}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {selected.toDisplayName}
                </p>
                <p className="text-xs text-white/60 truncate">
                  {new Date(selected.connectedAt).toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  {selected.eventName && ` · ${selected.eventName}`}
                </p>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSelectedId(null)}
              className="shrink-0 rounded-full text-white/50 hover:text-white hover:bg-white/10"
              aria-label="閉じる"
            >
              ✕
            </Button>
          </div>
        )}
      </div>

      {sky.count > 0 && (
        <div className="flex justify-center">
          <button
            onClick={() => saveSkyImage(sky)}
            className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors py-1"
          >
            <span aria-hidden>⬇</span>
            画像として保存
          </button>
        </div>
      )}
    </div>
  );
}

// PNG 書き出し。含めるのは星・星座線・期間表記のみで、相手の名前・イベント名・
// 地名など出所が推定できる情報は一切描かない（書き出し境界 / ADR-0025）。
// iOS Safari では download が効かないことがあるが、長押し保存で代替できるため許容
// （QRBottomSheet の額縁書き出しと同じ判断）。
function saveSkyImage(sky: SkyLayout) {
  const SCALE = 1.2;
  const W = SKY_W * SCALE;
  const SKY_PX = SKY_H * SCALE;
  const BAND = 130;

  const out = document.createElement("canvas");
  out.width = W;
  out.height = SKY_PX + BAND;
  const ctx = out.getContext("2d");
  if (!ctx) return;

  const bg = ctx.createLinearGradient(0, 0, 0, out.height);
  bg.addColorStop(0, SKY_GRADIENT[0]);
  bg.addColorStop(0.6, SKY_GRADIENT[1]);
  bg.addColorStop(1, SKY_GRADIENT[2]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, out.height);

  for (const d of sky.dust) {
    ctx.globalAlpha = d.opacity;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(d.x * SCALE, d.y * SCALE, d.r * SCALE, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 1.2;
  for (const l of sky.lines) {
    ctx.beginPath();
    ctx.moveTo(l.x1 * SCALE, l.y1 * SCALE);
    ctx.lineTo(l.x2 * SCALE, l.y2 * SCALE);
    ctx.stroke();
  }

  for (const s of sky.stars) {
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x * SCALE, s.y * SCALE, 9 * SCALE, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(s.x * SCALE, s.y * SCALE, 3.5 * SCALE, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "500 30px sans-serif";
  ctx.fillText(`${sky.periodLabel} の夜空 ★ ${sky.count}`, W / 2, SKY_PX + 52);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "600 22px sans-serif";
  ctx.fillText("nafuda.me", W / 2, SKY_PX + 94);

  out.toBlob((blob) => {
    if (!blob) return;
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = "nafuda-sky.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objUrl);
  }, "image/png");
}
