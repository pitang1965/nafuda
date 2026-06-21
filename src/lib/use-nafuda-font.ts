import { useEffect } from "react";
import type { NafudaStyleDef } from "./nafuda-styles";

// なふだスタイルの Google Fonts を <head> に一度だけ注入する。
// 公開プロフィール・編集プレビューなど、スタイル適用カードを描く箇所で共有する。
export function useNafudaFont(style: NafudaStyleDef | null) {
  useEffect(() => {
    if (!style?.fontUrl) return;
    if (document.querySelector(`link[data-nafuda-font="${style.id}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = style.fontUrl;
    link.setAttribute("data-nafuda-font", style.id);
    document.head.appendChild(link);
  }, [style?.fontUrl, style?.id]);
}
