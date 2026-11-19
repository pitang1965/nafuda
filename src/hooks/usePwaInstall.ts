import { useState, useEffect, useReducer, useSyncExternalStore } from "react";
import { isLineUa } from "../lib/utils";

const noopSubscribe = () => () => {};

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const STORAGE_KEY = "pwa-banner-dismissed";
const DISMISS_DAYS = 7;

export function isPwaBannerDismissed(): boolean {
  if (typeof window === "undefined") return false;
  const val = localStorage.getItem(STORAGE_KEY);
  if (!val) return false;
  return Date.now() < parseInt(val, 10) + DISMISS_DAYS * 86400000;
}

export function dismissPwaBanner(): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  }
}

// prompt の正本は __root.tsx のインラインスクリプトが保存する window.__pwaPrompt
const pwaWindow = () => window as { __pwaPrompt?: BeforeInstallPromptEvent };

function subscribePrompt(onChange: () => void) {
  const handler = (e: Event) => {
    e.preventDefault();
    pwaWindow().__pwaPrompt = e as BeforeInstallPromptEvent;
    onChange();
  };
  window.addEventListener("beforeinstallprompt", handler);
  return () => window.removeEventListener("beforeinstallprompt", handler);
}

export function usePwaInstall() {
  // 購読直後にも値を読み直すので、描画〜リスナー登録の間に来たイベントも取りこぼさない。
  // SSR では null 固定でハイドレーション不一致を起こさない
  const installPrompt = useSyncExternalStore(
    subscribePrompt,
    () => pwaWindow().__pwaPrompt ?? null,
    () => null,
  );
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const onInstalled = () => {
      pwaWindow().__pwaPrompt = undefined;
      setIsInstalled(true);
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  const [, rerender] = useReducer((n: number) => n + 1, 0);

  const promptInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    // prompt() は1イベント1回しか呼べないので、結果にかかわらず破棄する
    pwaWindow().__pwaPrompt = undefined;
    if (choice.outcome === "accepted") {
      setIsInstalled(true); // appinstalled を待たずにバナーを閉じる
    } else {
      rerender(); // 破棄した値を読み直させる
    }
  };

  // SSR では空/false 固定、ハイドレーション後にブラウザの値へ切り替える（不一致を起こさない）
  const ua = useSyncExternalStore(
    noopSubscribe,
    () => navigator.userAgent,
    () => "",
  );
  const isInStandaloneMode = useSyncExternalStore(
    noopSubscribe,
    () => (navigator as { standalone?: boolean }).standalone === true,
    () => false,
  );
  // LINE の中ではホーム画面に追加できないので案内しない（LineBrowserNotice が外部ブラウザへ誘導する）
  const isIos = /iphone|ipad|ipod/i.test(ua) && !isLineUa(ua);
  const isIosSafari = isIos && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);

  return {
    canInstall: !!installPrompt,
    isIos: isIos && !isInStandaloneMode,
    isIosSafari: isIosSafari && !isInStandaloneMode,
    isInstalled: isInstalled || (isIos && isInStandaloneMode),
    promptInstall,
  };
}
