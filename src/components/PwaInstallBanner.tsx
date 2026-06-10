import { useState } from "react";
import {
  usePwaInstall,
  isPwaBannerDismissed,
  dismissPwaBanner,
} from "../hooks/usePwaInstall";

interface PwaInstallBannerProps {
  sticky?: boolean;
}

export function PwaInstallBanner({ sticky = false }: PwaInstallBannerProps) {
  const { canInstall, isIos, isIosSafari, isInstalled, promptInstall } =
    usePwaInstall();
  const [dismissed, setDismissed] = useState(() => isPwaBannerDismissed());

  const dismiss = () => {
    dismissPwaBanner();
    setDismissed(true);
  };

  if (isInstalled || dismissed) return null;

  const wrapperClass = sticky
    ? "fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 shadow-lg text-xs text-gray-700"
    : "mx-4 mb-4 flex items-center justify-between p-3 rounded-xl text-xs";

  if (isIos) {
    return (
      <div
        className={
          sticky ? wrapperClass : `${wrapperClass} bg-blue-50 text-blue-700`
        }
      >
        <span>
          {isIosSafari
            ? "Safari の共有（↑）→「ホーム画面に追加」でいつでも開けます"
            : "ブラウザのメニュー→「ホーム画面に追加」でいつでも開けます"}
        </span>
        <button
          onClick={dismiss}
          className={
            sticky
              ? "ml-3 shrink-0 text-gray-400 hover:text-gray-600 text-base leading-none"
              : "ml-2 shrink-0 text-blue-400 hover:text-blue-600"
          }
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>
    );
  }

  if (canInstall) {
    return (
      <div className={sticky ? wrapperClass : `${wrapperClass} bg-gray-50`}>
        <p className={sticky ? "text-gray-600" : "text-xs text-gray-600"}>
          ホーム画面に追加していつでも開けるようにしましょう
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
            className="text-gray-400 hover:text-gray-600 text-base leading-none"
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
