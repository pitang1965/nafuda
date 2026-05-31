import { useState } from "react";
import { usePwaInstall } from "../hooks/usePwaInstall";

const STORAGE_KEY = "pwa-banner-dismissed";

export function PwaInstallBanner() {
  const { canInstall, isIos, isInstalled, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && sessionStorage.getItem(STORAGE_KEY) === "1",
  );

  const dismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  };

  if (isInstalled || dismissed) return null;

  if (isIos) {
    return (
      <div className="mx-4 mb-4 flex items-center justify-between p-3 bg-blue-50 rounded-xl text-xs text-blue-700">
        <span>
          Safari の共有ボタン（↑）→「ホーム画面に追加」でオフライン表示できます
        </span>
        <button
          onClick={dismiss}
          className="ml-2 shrink-0 text-blue-400 hover:text-blue-600"
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>
    );
  }

  if (canInstall) {
    return (
      <div className="mx-4 mb-4 flex items-center justify-between p-3 bg-gray-50 rounded-xl">
        <p className="text-xs text-gray-600">
          ホーム画面に追加するとオフラインでも QR を表示できます
        </p>
        <div className="ml-3 shrink-0 flex items-center gap-2">
          <button
            onClick={promptInstall}
            className="px-3 py-1.5 bg-black text-white rounded-lg text-xs font-medium"
          >
            追加する
          </button>
          <button
            onClick={dismiss}
            className="text-gray-400 hover:text-gray-600"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return null;
}
