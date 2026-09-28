// リクエストごとの CSP nonce を保持する。server.tsx が発行し、AsyncLocalStorage
// 経由で router.tsx（SSR時のみ）に届ける。Cloudflare Workers は同一 isolate で
// 複数リクエストを並行処理しうるため、モジュールスコープ変数ではなく
// AsyncLocalStorage でリクエストごとに隔離する。
// node:async_hooks はクライアントバンドルに含めてはいけないため、このファイルは
// import.meta.env.SSR ガード付きの動的 import からのみ読み込むこと。
import { AsyncLocalStorage } from "node:async_hooks";

const storage = new AsyncLocalStorage<string>();

export function runWithNonce<T>(nonce: string, fn: () => T): T {
  return storage.run(nonce, fn);
}

export function getNonce(): string | undefined {
  return storage.getStore();
}
