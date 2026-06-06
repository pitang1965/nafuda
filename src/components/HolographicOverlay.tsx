import { useEffect, useRef } from "react";

export function HolographicOverlay() {
  const tiltLayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = tiltLayerRef.current;
    if (!el) return;

    const onOrientation = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma ?? 0; // left-right tilt, -90 to 90
      const beta = e.beta ?? 45; // front-back tilt, -180 to 180

      const x = Math.max(0, Math.min(100, ((gamma + 45) / 90) * 100));
      const y = Math.max(0, Math.min(100, ((beta - 15) / 60) * 100));
      const angle = gamma * 4;
      const intensity = Math.min(Math.abs(gamma) / 15, 1);

      el.style.background = `conic-gradient(from ${angle}deg at ${x}% ${y}%, hsl(280,100%,75%), hsl(320,100%,72%), hsl(0,100%,72%), hsl(45,100%,72%), hsl(180,100%,75%), hsl(230,100%,78%), hsl(280,100%,75%))`;
      el.style.opacity = String(0.1 + intensity * 0.28);
    };

    window.addEventListener("deviceorientation", onOrientation);
    return () => window.removeEventListener("deviceorientation", onOrientation);
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 2,
        pointerEvents: "none",
      }}
    >
      {/* Static base shimmer — always visible */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "conic-gradient(from 25deg at 35% 45%, hsl(280,70%,65%), hsl(330,70%,62%), hsl(0,70%,62%), hsl(180,70%,65%), hsl(240,70%,68%), hsl(280,70%,65%))",
          opacity: 0.07,
          mixBlendMode: "screen",
        }}
      />
      {/* Sweeping shimmer band */}
      <div
        className="holo-sweep"
        style={{
          position: "absolute",
          inset: 0,
          mixBlendMode: "screen",
        }}
      />
      {/* Tilt-responsive rainbow layer */}
      <div
        ref={tiltLayerRef}
        style={{
          position: "absolute",
          inset: 0,
          background:
            "conic-gradient(from 0deg at 50% 50%, hsl(280,100%,75%), hsl(0,100%,72%), hsl(180,100%,75%), hsl(280,100%,75%))",
          opacity: 0.1,
          mixBlendMode: "screen",
          transition: "opacity 0.12s ease",
        }}
      />
    </div>
  );
}
