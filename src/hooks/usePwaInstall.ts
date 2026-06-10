import { useState, useEffect } from "react";

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

export function usePwaInstall() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(() => {
      if (typeof window === "undefined") return null;
      return (
        (window as { __pwaPrompt?: BeforeInstallPromptEvent }).__pwaPrompt ??
        null
      );
    });
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isInStandaloneMode =
      "standalone" in navigator &&
      (navigator as { standalone?: boolean }).standalone === true;
    if (isIos && isInStandaloneMode) {
      setIsInstalled(true);
      return;
    }

    // グローバルキャプチャで既に取得済みの場合はstateに反映
    const captured = (window as { __pwaPrompt?: BeforeInstallPromptEvent })
      .__pwaPrompt;
    if (captured && !installPrompt) {
      setInstallPrompt(captured);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      const prompt = e as BeforeInstallPromptEvent;
      (window as { __pwaPrompt?: BeforeInstallPromptEvent }).__pwaPrompt =
        prompt;
      setInstallPrompt(prompt);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setInstallPrompt(null);
      setIsInstalled(true);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const promptInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstallPrompt(null);
    }
  };

  const isIos =
    typeof navigator !== "undefined" &&
    /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isIosSafari =
    isIos &&
    typeof navigator !== "undefined" &&
    !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(navigator.userAgent);
  const isInStandaloneMode =
    typeof navigator !== "undefined" &&
    "standalone" in navigator &&
    (navigator as { standalone?: boolean }).standalone === true;

  return {
    canInstall: !!installPrompt,
    isIos: isIos && !isInStandaloneMode,
    isIosSafari: isIosSafari && !isInStandaloneMode,
    isInstalled,
    promptInstall,
  };
}
