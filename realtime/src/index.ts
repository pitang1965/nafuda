// なふだ realtime コンパニオン Worker（staging 実験用・本体 Pages とは別デプロイ）。
// DO はここでしか定義できない（Pages からは export 不可）。本体はこれを Service Binding で叩く。
//
// ルート:
//   GET  /ws?ticket=...  クライアントの WebSocket 接続。チケット署名を検証し room の DO へ。
//   POST /notify         本体からの内部 push（Service Binding）。内部シークレットを検証。
//
// room は "persona:<id>" / "event:<id>" 形式。prefix で DO 名前空間を選び、id 部分で部屋を特定する。
// このWorkerはDB・セッションを持たない。本人性/閲覧権はチケット署名のみで判定（正本は本体に残す）。

import { verifyTicket } from "./ticket";

export { PersonaChannel } from "./personaChannel";
export { EventRoom } from "./eventRoom";

export type Env = {
  PERSONA_CHANNEL: DurableObjectNamespace;
  EVENT_ROOM: DurableObjectNamespace;
  REALTIME_SECRET: string; // チケット署名検証用（本体と共有）
  INTERNAL_PUSH_SECRET: string; // /notify の内部呼び出し検証用
};

// room 文字列から DO スタブを引く。未知の prefix なら null。
function stubForRoom(env: Env, room: string): DurableObjectStub | null {
  const sep = room.indexOf(":");
  if (sep < 0) return null;
  const kind = room.slice(0, sep);
  const id = room.slice(sep + 1);
  if (!id) return null;
  const ns =
    kind === "persona"
      ? env.PERSONA_CHANNEL
      : kind === "event"
        ? env.EVENT_ROOM
        : null;
  if (!ns) return null;
  return ns.get(ns.idFromName(id));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      const payload = await verifyTicket(
        url.searchParams.get("ticket"),
        env.REALTIME_SECRET,
      );
      if (!payload) return new Response("unauthorized", { status: 401 });
      const stub = stubForRoom(env, payload.room);
      if (!stub) return new Response("bad room", { status: 400 });
      return stub.fetch(request);
    }

    if (url.pathname === "/notify" && request.method === "POST") {
      if (
        request.headers.get("x-internal-secret") !== env.INTERNAL_PUSH_SECRET
      ) {
        return new Response("forbidden", { status: 403 });
      }
      let body: { room?: string; payload?: unknown };
      try {
        body = await request.json();
      } catch {
        return new Response("bad request", { status: 400 });
      }
      if (!body.room) return new Response("bad request", { status: 400 });
      const stub = stubForRoom(env, body.room);
      if (!stub) return new Response("bad room", { status: 400 });
      return stub.fetch(
        new Request("https://do/push", {
          method: "POST",
          body: JSON.stringify(body.payload ?? {}),
        }),
      );
    }

    return new Response("not found", { status: 404 });
  },
};
