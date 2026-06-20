import { Link, useRouterState } from "@tanstack/react-router";

// 保護画面で常設するボトムナビ。主要な行き先（なふだ・つながり・イベント）を
// 親指の届く下部に置く。アカウント・プライバシー等の二次導線はヘッダーの
// バーガー（AppMenu）に残し、ここには載せない（行き先＝下／メニュー＝上 の役割分離）。
const TABS = [
  { to: "/me", label: "なふだ", emoji: "📛" },
  { to: "/connections", label: "つながり", emoji: "🤝" },
  { to: "/events", label: "イベント", emoji: "📅" },
] as const;

export function BottomNav() {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  return (
    <nav className="sticky bottom-0 z-30 border-t border-gray-200 bg-white">
      <ul className="flex">
        {TABS.map((tab) => {
          // /events/new など配下の深い画面でも該当タブを点灯させる
          const active =
            pathname === tab.to || pathname.startsWith(`${tab.to}/`);
          return (
            <li key={tab.to} className="flex-1">
              <Link
                to={tab.to}
                className={`flex flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
                  active
                    ? "text-pink-500 font-semibold"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span className="text-lg leading-none">{tab.emoji}</span>
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
