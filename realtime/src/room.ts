// 接続中の全クライアントへ push を中継するだけの基底 Durable Object。
// 状態の正本は持たない（Postgres が正本。クライアントは再接続時に reconcile する）。
// WebSocket Hibernation API でアイドル中はメモリから退避させる。
// PersonaChannel（本人宛通知）と EventRoom（参加者一覧の更新通知）が共にこれを継承する。
// 両者は「アドレッシングと認証スコープ」が違うだけで中継挙動は同一。

export class BroadcastRoom {
  protected state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    // クライアントの WebSocket 接続（Worker 側でチケット検証済み）
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.state.acceptWebSocket(server); // Hibernation
      return new Response(null, { status: 101, webSocket: client });
    }

    // 内部 push（Service Binding 経由・Worker 側で内部シークレット検証済み）
    if (request.method === "POST") {
      const payload = await request.text();
      for (const ws of this.state.getWebSockets()) {
        try {
          ws.send(payload);
        } catch {
          // 切断済みソケット等は無視（Hibernation が回収する）
        }
      }
      return new Response("ok");
    }

    return new Response("not found", { status: 404 });
  }

  // Hibernation ハンドラ: クライアントは送信不要だが keepalive ping に応答する。
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (message === "ping") {
      try {
        ws.send("pong");
      } catch {
        /* no-op */
      }
    }
  }

  async webSocketClose(ws: WebSocket, code: number) {
    try {
      ws.close(code);
    } catch {
      /* no-op */
    }
  }
}
