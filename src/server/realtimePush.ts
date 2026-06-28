// realtime コンパニオン Worker への内部 push（Service Binding 経由）。
// createServerFn を含まず、クライアントからは直接 import しない（ハンドラ内からのみ使う）。
// storage.ts と同じく cloudflare:workers の env からバインディングを読む。
//
// 方針: 決して throw しない。realtime はあくまで「速い確認」の付加機能で、Postgres が正本。
// バインディング未設定（本番＝フラグOFF）なら無言で no-op になり、既存ポーリング動作に一切影響しない。
import { env } from "cloudflare:workers";

type RealtimeEnv = {
  REALTIME?: { fetch: (req: Request) => Promise<Response> };
  INTERNAL_PUSH_SECRET?: string;
};

// 指定ペルソナの PersonaChannel へ payload を push する。
// REALTIME バインディングが無ければ no-op（フラグOFF＝本番では何も起きない）。
export async function pushToPersona(
  personaId: string,
  payload: unknown,
): Promise<void> {
  const e = env as unknown as RealtimeEnv;
  if (!e.REALTIME) return; // Service Binding 未設定 → realtime 無効環境。既存挙動を崩さない。
  try {
    await e.REALTIME.fetch(
      new Request("https://realtime/notify", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-secret": e.INTERNAL_PUSH_SECRET ?? "",
        },
        body: JSON.stringify({ personaId, payload }),
      }),
    );
  } catch (err) {
    // realtime が落ちていても接続フロー（Postgres 書き込み）は完了済み。
    // クライアントは reconcile-on-connect で必ず収束するので握りつぶす。
    console.error("[pushToPersona] realtime push 失敗", String(err));
  }
}
