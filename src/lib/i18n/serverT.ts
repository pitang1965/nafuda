import { getServerLocale } from "./server";
import { dictionaries } from "./dictionaries";
import { translate } from "./translate";

// サーバー関数が投げるユーザー向けエラーメッセージを、現在のリクエストのロケールで
// 翻訳してから返す（/grill-with-docs Q6）。クライアント側は err.message をそのまま
// 表示する既存パターン（例: profile/edit.tsx の showSaveError）を変えずに済む。
export function serverT(key: string, params?: Record<string, string | number>) {
  const locale = getServerLocale();
  return translate(dictionaries[locale], key, params);
}
