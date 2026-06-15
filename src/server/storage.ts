// R2 ストレージのサーバー専用ヘルパー。
// createServerFn を含まず、クライアントからは直接 import しない（ハンドラ内からのみ使う）。
// 平の関数を createServerFn モジュールから export すると cloudflare:workers が
// クライアントバンドルに漏れるため、共有ヘルパーはこのファイルに集約する。
import { env } from "cloudflare:workers";

type CloudflareEnv = { AVATARS_BUCKET: R2Bucket };

function bucket(): R2Bucket {
  return (env as unknown as CloudflareEnv).AVATARS_BUCKET;
}

function r2Key(url: string): string | null {
  const base = process.env.R2_PUBLIC_URL;
  if (!base || !url.startsWith(base)) return null;
  return url.slice(base.length + 1); // strip leading "/"
}

export async function deleteFromR2(url: string | null) {
  if (!url) return;
  const key = r2Key(url);
  if (!key) return;
  await bucket().delete(key);
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
