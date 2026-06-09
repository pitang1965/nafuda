import { Sheet } from "react-modal-sheet";
import { useState, useEffect, useRef } from "react";

interface ExchangeContextSheetProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onSubmit: (
    eventName: string,
    gpsCoordinates: { x: number; y: number } | null,
  ) => void;
  onSkip: (gpsCoordinates: { x: number; y: number } | null) => void;
}

export function ExchangeContextSheet({
  isOpen,
  isSubmitting,
  onSubmit,
  onSkip,
}: ExchangeContextSheetProps) {
  const [eventName, setEventName] = useState("");
  const [gpsCoordinates, setGpsCoordinates] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setEventName("");
      setGpsCoordinates(null);
      return;
    }
    // シートが開いたら GPS を取得を試みる
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoordinates({
            x: pos.coords.longitude,
            y: pos.coords.latitude,
          });
        },
        () => {
          // 拒否または失敗 → null のまま続行
        },
        { timeout: 5000, maximumAge: 30000 },
      );
    }
    // 少し遅らせてからフォーカス（シートのアニメーション後）
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, [isOpen]);

  const handleSubmit = () => {
    const name = eventName.trim();
    if (!name || isSubmitting) return;
    onSubmit(name, gpsCoordinates);
  };

  const handleSkip = () => {
    if (isSubmitting) return;
    onSkip(gpsCoordinates);
  };

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
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 disabled:opacity-50"
            />
            <button
              onClick={handleSubmit}
              disabled={!eventName.trim() || isSubmitting}
              className="w-full px-6 py-3 bg-pink-500 text-white rounded-xl text-sm font-medium hover:bg-pink-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "作成中…" : "チェックインして QR を表示"}
            </button>
            <button
              onClick={handleSkip}
              disabled={isSubmitting}
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
