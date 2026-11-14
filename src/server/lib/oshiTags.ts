import { z } from "zod";
import { serverT } from "../../lib/i18n/serverT";

// 推しタグの入力上限。人気タグ集計に載るため、書き込む全APIでこれを使う。
// createServerFn モジュールのトップレベルに置くとクライアントバンドルに残り、
// serverT 経由でサーバー専用 import が漏れてビルドが落ちるため、ここに分離する。
export const oshiTagsSchema = z
  .array(z.string().trim().min(1).max(50))
  .max(20, { error: () => serverT("errors.oshiTagsMax") });
