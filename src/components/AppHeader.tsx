import { useRouter, useRouterState } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { AppMenu } from "./AppMenu";

// 保護画面で常設するヘッダー。画面タイトル（ルートの staticData.title）と
// 右上のバーガー（AppMenu）を出す。タブのルート（なふだ/つながり/お気に入り/イベント）
// 以外の深いプッシュ画面では左に戻るボタンを表示する。
const TAB_ROOTS = ["/me", "/connections", "/favorites", "/events"];

export function AppHeader({ title }: { title: string }) {
  const router = useRouter();
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  const isDeep = !TAB_ROOTS.includes(pathname);

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-200 bg-white p-4">
      {isDeep && (
        <button
          onClick={() => router.history.back()}
          aria-label="戻る"
          className="text-gray-500 transition-colors hover:text-gray-700"
        >
          <ChevronLeft className="size-5" />
        </button>
      )}
      <h1 className="text-base font-bold">{title}</h1>
      <div className="ml-auto">
        <AppMenu />
      </div>
    </header>
  );
}
