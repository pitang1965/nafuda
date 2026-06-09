import { Sheet } from "react-modal-sheet";
import { useState, useEffect, useRef } from "react";

type GeoPermission = "granted" | "denied" | "prompt" | "unknown";

interface ExchangeContextSheetProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onSubmit: (
    eventName: string,
    gpsCoordinates: { x: number; y: number } | null,
  ) => void;
  onSkip: () => void;
}

function getGpsCoordinates(): Promise<{ x: number; y: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ x: pos.coords.longitude, y: pos.coords.latitude }),
      () => resolve(null),
      { timeout: 5000, maximumAge: 30000 },
    );
  });
}

const GPS_STATUS: Record<
  GeoPermission,
  { label: string; className: string } | null
> = {
  granted: { label: "📍 現在地を保存します", className: "text-green-600" },
  denied: {
    label: "📍 位置情報がブロックされています（保存されません）",
    className: "text-gray-400",
  },
  prompt: {
    label: "📍 送信時に位置情報の許可を確認します",
    className: "text-blue-500",
  },
  unknown: null,
};

export function ExchangeContextSheet({
  isOpen,
  isSubmitting,
  onSubmit,
  onSkip,
}: ExchangeContextSheetProps) {
  const [eventName, setEventName] = useState("");
  const [geoPermission, setGeoPermission] = useState<GeoPermission>("unknown");
  const [isGettingGps, setIsGettingGps] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setEventName("");
      setGeoPermission("unknown");
      return;
    }
    // ダイアログを出さずに許可状態だけ確認する
    if (navigator.permissions) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((result) => {
          setGeoPermission(result.state as GeoPermission);
          result.onchange = () =>
            setGeoPermission(result.state as GeoPermission);
        })
        .catch(() => setGeoPermission("unknown"));
    }
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, [isOpen]);

  const handleSubmit = async () => {
    const name = eventName.trim();
    if (!name || isSubmitting || isGettingGps) return;
    setIsGettingGps(true);
    try {
      const gps = await getGpsCoordinates();
      onSubmit(name, gps);
    } finally {
      setIsGettingGps(false);
    }
  };

  const handleSkip = () => {
    if (isSubmitting || isGettingGps) return;
    onSkip();
  };

  const gpsStatus = GPS_STATUS[geoPermission];
  const busy = isSubmitting || isGettingGps;
  const buttonLabel = isGettingGps
    ? "📍 位置情報を取得中…"
    : isSubmitting
      ? "作成中…"
      : "チェックインして QR を表示";

  return (
    <Sheet isOpen={isOpen} onClose={handleSkip} detent="content" disableDrag>
      <Sheet.Container>
        <Sheet.Content>
          <div className="flex flex-col gap-4 p-6 pb-10">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-800">今どこで？</p>
              <p className="text-sm text-gray-500 mt-1">
                出会いの場所やイベント名を入力すると自動で記録されます
              </p>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="例：バーナイト＠立川"
              maxLength={100}
              disabled={busy}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 disabled:opacity-50"
            />
            {gpsStatus && (
              <p className={`text-xs ${gpsStatus.className}`}>
                {gpsStatus.label}
              </p>
            )}
            <button
              onClick={handleSubmit}
              disabled={!eventName.trim() || busy}
              className="w-full px-6 py-3 bg-pink-500 text-white rounded-xl text-sm font-medium hover:bg-pink-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {buttonLabel}
            </button>
            <button
              onClick={handleSkip}
              disabled={busy}
              className="w-full px-4 py-2 text-gray-400 text-sm hover:text-gray-600 transition-colors disabled:opacity-40"
            >
              スキップ
            </button>
          </div>
        </Sheet.Content>
      </Sheet.Container>
      <Sheet.Backdrop onTap={handleSkip} />
    </Sheet>
  );
}
