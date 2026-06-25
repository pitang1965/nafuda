export function RainbowBorderOverlay() {
  return (
    <div
      className="rainbow-border"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 15,
      }}
    />
  );
}
