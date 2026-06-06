import { useMemo } from "react";

const ANIMATIONS = ["petal-fall-a", "petal-fall-b", "petal-fall-c"] as const;
const COLORS = ["#ffb7c5", "#ffc8d4", "#ff8fab", "#ffd4e0", "#ffadc0"];
const PHI = 0.618033988;

export function CherryBlossomOverlay() {
  const petals = useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: Math.round(((i * PHI) % 1) * 94) + 3,
      width: 7 + (i % 3) * 2,
      height: 11 + (i % 3) * 3,
      delay: parseFloat(((i * 0.55) % 9).toFixed(2)),
      duration: parseFloat((7 + (i % 5) * 1.1).toFixed(1)),
      animation: ANIMATIONS[i % 3],
      color: COLORS[i % COLORS.length],
    }));
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 25,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {petals.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            top: 0,
            left: `${p.left}%`,
            width: `${p.width}px`,
            height: `${p.height}px`,
            borderRadius: "50%",
            background: p.color,
            opacity: 0,
            animation: `${p.animation} ${p.duration}s ${p.delay}s ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}
