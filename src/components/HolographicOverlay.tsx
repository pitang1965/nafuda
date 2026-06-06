import { useEffect, useRef, useState } from "react";

export function HolographicOverlay() {
  const tiltLayerRef = useRef<HTMLDivElement>(null);
  const [needsIOSPermission, setNeedsIOSPermission] = useState(false);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    const needsPermission =
      typeof (
        DeviceOrientationEvent as unknown as {
          requestPermission?: () => Promise<string>;
        }
      ).requestPermission === "function";

    if (needsPermission) {
      setNeedsIOSPermission(true);
    } else {
      setListening(true);
    }
  }, []);

  useEffect(() => {
    if (!listening) return;
    const el = tiltLayerRef.current;
    if (!el) return;

    const onOrientation = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma ?? 0;
      const beta = e.beta ?? 45;
      const x = Math.max(0, Math.min(100, ((gamma + 45) / 90) * 100));
      const y = Math.max(0, Math.min(100, ((beta - 15) / 60) * 100));
      const angle = gamma * 4;
      const intensity = Math.min(Math.abs(gamma) / 15, 1);
      el.style.background = `conic-gradient(from ${angle}deg at ${x}% ${y}%, hsl(280,100%,75%), hsl(320,100%,72%), hsl(0,100%,72%), hsl(45,100%,72%), hsl(180,100%,75%), hsl(230,100%,78%), hsl(280,100%,75%))`;
      el.style.opacity = String(0.1 + intensity * 0.28);
    };

    window.addEventListener("deviceorientation", onOrientation);
    return () => window.removeEventListener("deviceorientation", onOrientation);
  }, [listening]);

  const handleIOSPermission = async () => {
    try {
      const state = await (
        DeviceOrientationEvent as unknown as {
          requestPermission: () => Promise<string>;
        }
      ).requestPermission();
      if (state === "granted") {
        setListening(true);
      }
    } finally {
      setNeedsIOSPermission(false);
    }
  };

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
      {/* iOS 13+ permission button — fixed で stacking context を脱出 */}
      {needsIOSPermission && (
        <div
          style={{
            position: "fixed",
            bottom: "5rem",
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "auto",
            zIndex: 50,
          }}
        >
          <button
            onClick={handleIOSPermission}
            style={{
              background: "rgba(30,20,60,0.75)",
              color: "#e8e0ff",
              border: "1px solid rgba(200,180,255,0.4)",
              borderRadius: "9999px",
              padding: "0.6rem 1.5rem",
              fontSize: "0.8rem",
              cursor: "pointer",
              backdropFilter: "blur(12px)",
              boxShadow: "0 0 16px rgba(180,150,255,0.3)",
            }}
          >
            ✦ きらきらを有効にする
          </button>
        </div>
      )}
    </div>
  );
}
