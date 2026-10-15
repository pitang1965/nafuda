import { useLocale } from "../lib/i18n/context";
import { cn } from "../lib/utils";

// 言語切り替えのミニトグル。「EN｜日本語」（各言語名はその言語自身の文字で表記）。
// 国旗は使わない——英語は複数の国で話されるため、国旗が言語の代表として非対称になる。
export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white/90 px-2 py-1 text-xs font-medium shadow-sm backdrop-blur",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
        className={cn(
          "transition-colors",
          locale === "en" ? "text-gray-900" : "text-gray-400",
        )}
      >
        EN
      </button>
      <span className="text-gray-300" aria-hidden="true">
        ｜
      </span>
      <button
        type="button"
        onClick={() => setLocale("ja")}
        aria-pressed={locale === "ja"}
        className={cn(
          "transition-colors",
          locale === "ja" ? "text-gray-900" : "text-gray-400",
        )}
      >
        日本語
      </button>
    </div>
  );
}
