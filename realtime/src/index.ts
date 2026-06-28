// なふだ realtime コンパニオン Worker（staging 実験用・本体 Pages とは別デプロイ）。
// DO はここでしか定義できない（Pages からは export 不可）。本体はこれを Service Binding で叩く。
//
// ルート:
//   GET  /ws?ticket=...  クライアントの WebSocket 接続。チケット署名を検証し PersonaChannel へ。
//   POST /notify         本体からの内部 push（Service Binding）。内部シークレットを検証。
//
// このWorkerはDB・セッションを持たない。本人性はチケット署名のみで判定（正本は本体に残す）。

import { verifyTicket } from "./ticket";

export { PersonaChannel } from "./personaChannel";

export type Env = {
  PERSONA_CHANNEL: DurableObjectNamespace;
  REALTIME_SECRET: string; // チケット署名検証用（本体と共有）
  INTERNAL_PUSH_SECRET: string; // /notify の内部呼び出し検証用
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      const payload = await verifyTicket(
        url.searchParams.get("ticket"),
        env.REALTIME_SECRET,
      );
      if (!payload) return new Response("unauthorized", { status: 401 });
      const id = env.PERSONA_CHANNEL.idFromName(payload.personaId);
      return env.PERSONA_CHANNEL.get(id).fetch(request);
    }

    if (url.pathname === "/notify" && request.method === "POST") {
      if (
        request.headers.get("x-internal-secret") !== env.INTERNAL_PUSH_SECRET
      ) {
        return new Response("forbidden", { status: 403 });
      }
      let body: { personaId?: string; payload?: unknown };
      try {
        body = await request.json();
      } catch {
        return new Response("bad request", { status: 400 });
      }
      if (!body.personaId) return new Response("bad request", { status: 400 });
      const id = env.PERSONA_CHANNEL.idFromName(body.personaId);
      return env.PERSONA_CHANNEL.get(id).fetch(
        new Request("https://do/push", {
          method: "POST",
          body: JSON.stringify(body.payload ?? {}),
        }),
      );
    }

    return new Response("not found", { status: 404 });
  },
};
