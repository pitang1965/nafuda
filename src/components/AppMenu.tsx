import { Link, useNavigate } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { authClient } from "../lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { useT } from "../lib/i18n/context";

// ヘッダー右上のバーガーメニュー。アカウント・利用規約・プライバシーポリシーへの
// 導線とログアウトを集約する。アカウント操作（退会・ログアウト）をホームから外し、
// 退会リンクの常時表示によるネガティブな刷り込みを避けるのが狙い。
export function AppMenu({ iconColor }: { iconColor?: string }) {
  const navigate = useNavigate();
  const t = useT();

  const handleLogout = async () => {
    await authClient.signOut();
    await navigate({ to: "/login" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("menu.ariaLabel")}
        className="inline-flex items-center justify-center rounded-md p-1 outline-none"
        style={iconColor ? { color: iconColor } : undefined}
      >
        <Menu className="size-6" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="cursor-pointer" asChild>
          <Link to="/nafuda-map">{t("menu.nafudaMap")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" asChild>
          <Link to="/account">{t("menu.account")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" asChild>
          <Link to="/terms">{t("menu.terms")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" asChild>
          <Link to="/privacy">{t("menu.privacy")}</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onSelect={handleLogout}>
          {t("menu.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
