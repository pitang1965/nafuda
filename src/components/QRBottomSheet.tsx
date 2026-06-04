import { Sheet } from "react-modal-sheet";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { useAnimate } from "motion/react";

interface QRBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  label: string;
  exchangeMode?: {
    onExchanged: () => void;
    onNotExchanged: () => void;
  };
}

export function QRBottomSheet({
  isOpen,
  onClose,
  url,
  label,
  exchangeMode,
}: QRBottomSheetProps) {
  const [mounted] = useState(() => typeof window !== "undefined");
  const [copied, setCopied] = useState(false);
  const [scope, animate] = useAnimate();

  const handleBackdropTap = async () => {
    if (!exchangeMode) {
      onClose();
      return;
    }
    await animate(
      scope.current,
      { x: [0, -12, 12, -8, 8, -4, 4, 0] },
      { duration: 0.4 },
    );
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={exchangeMode ? () => {} : onClose}
      detent="content"
      disableDrag={!!exchangeMode}
    >
      <Sheet.Container>
        {!exchangeMode && <Sheet.Header />}
        <Sheet.Content>
          <div
            ref={scope}
            className="flex flex-col items-center gap-4 p-6 pb-10"
          >
            <p className="text-sm text-gray-500">{label}</p>
            {!mounted || !url ? (
              <div className="w-[220px] h-[220px] bg-gray-100 rounded-lg animate-pulse" />
            ) : (
              <QRCodeSVG
                value={url}
                size={220}
                level="M"
                marginSize={4}
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
            )}
            <button
              onClick={handleCopy}
              className="flex flex-col items-center gap-1 group"
            >
              <p className="text-xs text-gray-400 break-all text-center max-w-[240px] group-hover:text-gray-600 transition-colors">
                {url}
              </p>
              <span
                className="text-xs font-medium transition-colors"
                style={{ color: copied ? "#16a34a" : "#9ca3af" }}
              >
                {copied ? "コピーしました" : "タップしてコピー"}
              </span>
            </button>

            {exchangeMode && (
              <div className="w-full flex flex-col gap-2 pt-2">
                <button
                  onClick={exchangeMode.onExchanged}
                  className="w-full px-6 py-3 bg-pink-500 text-white rounded-xl text-sm font-medium hover:bg-pink-600 transition-colors"
                >
                  交換予定
                </button>
                <button
                  onClick={exchangeMode.onNotExchanged}
                  className="w-full px-4 py-2 text-gray-400 text-sm hover:text-gray-600 transition-colors"
                >
                  交換しない
                </button>
              </div>
            )}
          </div>
        </Sheet.Content>
      </Sheet.Container>
      <Sheet.Backdrop onTap={handleBackdropTap} />
    </Sheet>
  );
}
