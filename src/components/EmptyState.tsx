import { Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useState, type ReactNode } from "react";

interface EmptyStateProps {
  /** 大きめのアイコン（絵文字 or SVG）。例: "📛" "⏰" */
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  /** 主要導線（トップや「なふだとは？」など） */
  cta?: { label: string; to: string };
  /** 同一オリジンの履歴があれば「戻る」ボタンを出す */
  showBack?: boolean;
}

// 公開導線の「見つからない／無効」系の空・エラー状態を統一する共通シェル。
// bg-gray-100 外枠 + sm:max-w-sm 白パネル中央寄せ（me・$slug と同じ PC レイアウト）。
export function EmptyState({
  icon,
  title,
  description,
  cta,
  showBack,
}: EmptyStateProps) {
  const router = useRouter();
  // 同一オリジンからの遷移時のみ「戻る」を出す（外部からの直リンクでは出さない）。
  // setState を持たない lazy initializer で判定（ハイドレーション後も安定）。
  const [canGoBack] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      document.referrer !== "" &&
      new URL(document.referrer).origin === window.location.origin
    );
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="mx-auto sm:max-w-sm w-full min-h-screen bg-white flex flex-col items-center justify-center gap-4 p-6 text-center sm:shadow-sm">
        {icon && <div className="text-4xl">{icon}</div>}
        <h1 className="text-xl font-semibold text-gray-700">{title}</h1>
        {description && (
          <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
        )}
        <div className="mt-2 flex flex-col items-center gap-2">
          {cta && (
            <Link
              to={cta.to}
              className="text-sm text-blue-500 underline underline-offset-2"
            >
              {cta.label}
            </Link>
          )}
          {showBack && canGoBack && (
            <button
              onClick={() => router.history.back()}
              className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronLeft className="size-4" />
              戻る
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
