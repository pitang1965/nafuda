// R2 ストレージのサーバー専用ヘルパー。
// createServerFn を含まず、クライアントからは直接 import しない（ハンドラ内からのみ使う）。
// 平の関数を createServerFn モジュールから export すると cloudflare:workers が
// クライアントバンドルに漏れるため、共有ヘルパーはこのファイルに集約する。
import { env } from "cloudflare:workers";

type CloudflareEnv = { AVATARS_BUCKET: R2Bucket };

function bucket(): R2Bucket {
  return (env as unknown as CloudflareEnv).AVATARS_BUCKET;
}

// R2 から画像実体を物理削除する。孤児（CONTEXT.md 参照）を残さないために呼ぶ。
// 方針: 決して throw しない（退会・アバター差し替え等の呼び出し元フローを止めない）。
// 削除をスキップ／失敗したケースは Cloudflare observability で検出できるようログに残す。
export async function deleteFromR2(url: string | null) {
  if (!url) return; // アバター未設定など。正常な no-op、無言で返す。
  const base = process.env.R2_PUBLIC_URL;
  if (!base) {
    // 設定・デプロイのバグ。本番では起きないはず（保存時の URL 生成も同じ env を読むため）。
    console.error("[deleteFromR2] R2_PUBLIC_URL 未設定、削除をスキップ", { url });
    return;
  }
  if (!url.startsWith(base)) {
    // base 不一致（R2 移行・URL ローテーション等）。削除をスキップするため孤児が残る。
    console.warn("[deleteFromR2] URL が base 不一致、孤児の可能性", { url, base });
    return;
  }
  const key = url.slice(base.length + 1); // strip leading "/"
  try {
    await bucket().delete(key);
  } catch (e) {
    // 一時障害等。握りつぶして呼び出し元フローは続行（孤児が残りうるが検出はできる）。
    console.error("[deleteFromR2] R2 delete 失敗、孤児の可能性", {
      key,
      error: String(e),
    });
  }
}

export async function putToR2(
  key: string,
  bytes: Uint8Array,
  contentType: string,
) {
  await bucket().put(key, bytes, { httpMetadata: { contentType } });
}

export function r2PublicUrl(key: string): string {
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}
