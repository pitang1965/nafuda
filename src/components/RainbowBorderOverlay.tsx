export function RainbowBorderOverlay({ innerBg }: { innerBg?: string }) {
  return (
    <div
      className="rainbow-border"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 15,
      }}
    >
      {/* 内側を地で覆い、外周 4px だけ虹を残す */}
      <div
        style={{
          position: "absolute",
          inset: 4,
          background: innerBg ?? "#0a0a0f",
        }}
      />
    </div>
  );
}
