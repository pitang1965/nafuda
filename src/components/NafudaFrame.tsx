import type { FrameId } from "../lib/nafuda-styles";

function Blossom({ cx, cy, r = 12 }: { cx: number; cy: number; r?: number }) {
  return (
    <g>
      {[0, 72, 144, 216, 288].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const px = cx + r * 0.75 * Math.sin(rad);
        const py = cy - r * 0.75 * Math.cos(rad);
        return (
          <ellipse
            key={deg}
            cx={px}
            cy={py}
            rx={r * 0.38}
            ry={r * 0.55}
            fill="#ffb7c5"
            opacity={0.92}
            transform={`rotate(${deg}, ${px}, ${py})`}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={r * 0.28} fill="#ff6b9d" />
    </g>
  );
}

function Petal({
  cx,
  cy,
  r = 5,
  angle = 0,
}: {
  cx: number;
  cy: number;
  r?: number;
  angle?: number;
}) {
  return (
    <ellipse
      cx={cx}
      cy={cy}
      rx={r * 0.4}
      ry={r * 0.7}
      fill="#ffb7c5"
      opacity={0.55}
      transform={`rotate(${angle}, ${cx}, ${cy})`}
    />
  );
}

function SakuraCorner() {
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" fill="none">
      <Blossom cx={28} cy={28} r={14} />
      <Blossom cx={60} cy={18} r={10} />
      <Blossom cx={18} cy={60} r={10} />
      <Petal cx={75} cy={32} r={6} angle={35} />
      <Petal cx={45} cy={75} r={6} angle={-25} />
      <Petal cx={85} cy={55} r={5} angle={50} />
      <Petal cx={55} cy={88} r={5} angle={-40} />
    </svg>
  );
}

function Star({
  cx,
  cy,
  r = 8,
  opacity = 1,
}: {
  cx: number;
  cy: number;
  r?: number;
  opacity?: number;
}) {
  const pts = [0, 90, 180, 270]
    .map((deg) => {
      const outerRad = ((deg - 90) * Math.PI) / 180;
      const innerRad = ((deg - 90 + 45) * Math.PI) / 180;
      return [
        `${cx + r * Math.cos(outerRad)},${cy + r * Math.sin(outerRad)}`,
        `${cx + r * 0.38 * Math.cos(innerRad)},${cy + r * 0.38 * Math.sin(innerRad)}`,
      ];
    })
    .flat()
    .join(" ");
  return <polygon points={pts} fill="#fde68a" opacity={opacity} />;
}

function Sparkle({ cx, cy, r = 4 }: { cx: number; cy: number; r?: number }) {
  return (
    <g>
      <line
        x1={cx}
        y1={cy - r}
        x2={cx}
        y2={cy + r}
        stroke="#fff"
        strokeWidth={1.2}
        opacity={0.8}
      />
      <line
        x1={cx - r}
        y1={cy}
        x2={cx + r}
        y2={cy}
        stroke="#fff"
        strokeWidth={1.2}
        opacity={0.8}
      />
      <line
        x1={cx - r * 0.6}
        y1={cy - r * 0.6}
        x2={cx + r * 0.6}
        y2={cy + r * 0.6}
        stroke="#fff"
        strokeWidth={0.8}
        opacity={0.5}
      />
      <line
        x1={cx + r * 0.6}
        y1={cy - r * 0.6}
        x2={cx - r * 0.6}
        y2={cy + r * 0.6}
        stroke="#fff"
        strokeWidth={0.8}
        opacity={0.5}
      />
    </g>
  );
}

function MoonCorner() {
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" fill="none">
      {/* crescent moon */}
      <path
        d="M 42 12 A 18 18 0 1 0 42 48 A 12 12 0 1 1 42 12 Z"
        fill="#fde68a"
        opacity={0.85}
      />
      <Star cx={72} cy={20} r={9} />
      <Star cx={22} cy={68} r={7} opacity={0.75} />
      <Star cx={88} cy={50} r={5} opacity={0.65} />
      <Sparkle cx={55} cy={72} r={5} />
      <Sparkle cx={80} cy={30} r={3.5} />
      <circle cx={18} cy={30} r={2} fill="#fde68a" opacity={0.5} />
      <circle cx={35} cy={85} r={1.5} fill="#fde68a" opacity={0.4} />
      <circle cx={92} cy={72} r={1.8} fill="#fff" opacity={0.5} />
    </svg>
  );
}

const cornerStyle = (
  pos: { top?: 0; bottom?: 0; left?: 0; right?: 0 },
  flipX: boolean,
  flipY: boolean,
) => ({
  position: "fixed" as const,
  ...pos,
  pointerEvents: "none" as const,
  zIndex: 10,
  transform: `scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`,
  transformOrigin:
    flipX && flipY
      ? "bottom right"
      : flipX
        ? "top right"
        : flipY
          ? "bottom left"
          : "top left",
});

export function NafudaFrame({ frameId }: { frameId: FrameId }) {
  const Corner = frameId === "sakura" ? SakuraCorner : MoonCorner;

  return (
    <>
      <div style={cornerStyle({ top: 0, left: 0 }, false, false)}>
        <Corner />
      </div>
      <div style={cornerStyle({ top: 0, right: 0 }, true, false)}>
        <Corner />
      </div>
      <div style={cornerStyle({ bottom: 0, left: 0 }, false, true)}>
        <Corner />
      </div>
      <div style={cornerStyle({ bottom: 0, right: 0 }, true, true)}>
        <Corner />
      </div>
    </>
  );
}
