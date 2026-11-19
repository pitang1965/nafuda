import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "../lib/i18n/context";
import { cn, isLineUa } from "../lib/utils";

const noopSubscribe = () => () => {};

// LINE のアプリ内ブラウザで開いたときだけ、既定のブラウザで開くよう案内する。
// LINE の中では Google ログインが拒否され、Cookie もいつものブラウザ/PWA と別になる。
export function LineBrowserNotice({ className }: { className?: string }) {
  const t = useT();
  // SSR では null、ハイドレーション後に href を決める（不一致を起こさない）
  const href = useSyncExternalStore(
    noopSubscribe,
    () => {
      if (!isLineUa(navigator.userAgent)) return null;
      // LINE はこのクエリが付いた URL を既定のブラウザで開く。?redirect= 等は残す
      const url = new URL(window.location.href);
      url.searchParams.set("openExternalBrowser", "1");
      return url.toString();
    },
    () => null,
  );
  if (!href) return null;
  return (
    <div
      className={cn(
        "w-full p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-gray-700 flex flex-col gap-2",
        className,
      )}
    >
      <p>{t("lineBrowser.notice")}</p>
      <Button asChild variant="outline" size="sm" className="self-start">
        <a href={href}>{t("lineBrowser.openInBrowser")}</a>
      </Button>
    </div>
  );
}
