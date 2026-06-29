// 接続中の全クライアントへ push を中継するだけの基底 Durable Object。
// 状態の正本は持たない（Postgres が正本。クライアントは再接続時に reconcile する）。
// PersonaChannel（本人宛通知）と EventRoom（参加者一覧の更新通知）が共にこれを継承する。
// 両者は「アドレッシングと認証スコープ」が違うだけで中継挙動は同一。
//
// 標準 WebSocket API（accept + メモリ上の Set）を使う。低トラフィックの短命ルームでは
// Hibernation API より挙動が素直で確実（接続が直後に切れる事象を避ける）。接続が続く間
// DO はメモリ常駐するが、ルームは短命なので問題にならない。

export class BroadcastRoom {
  protected state: DurableObjectState;
  private sockets = new Set<WebSocket>();

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    // クライアントの WebSocket 接続（Worker 側でチケット検証済み）
    if (request.headers.get("Upgrade") === "websocket") {
      const [client, server] = Object.values(new WebSocketPair());
      server.accept();
      this.sockets.add(server);

      server.addEventListener("message", (ev) => {
        // クライアントは送信不要だが keepalive ping に応答する
        if (ev.data === "ping") {
          try {
            server.send("pong");
          } catch {
            /* no-op */
          }
        }
      });
      const drop = () => this.sockets.delete(server);
      server.addEventListener("close", drop);
      server.addEventListener("error", drop);

      return new Response(null, { status: 101, webSocket: client });
    }

    // 内部 push（Service Binding 経由・Worker 側で内部シークレット検証済み）
    if (request.method === "POST") {
      const payload = await request.text();
      for (const ws of this.sockets) {
        try {
          ws.send(payload);
        } catch {
          this.sockets.delete(ws); // 送信不能なソケットは掃除
        }
      }
      return new Response("ok");
    }

    return new Response("not found", { status: 404 });
  }
}
