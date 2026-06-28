// PersonaChannel: なふだ（ペルソナ）1枚 = 1チャンネルの push 用 Durable Object。
// 「このなふだに起きた出来事」を、接続中の本人クライアントへ送る薄い中継。
// 状態の正本は持たない（Postgres が正本。クライアントは再接続時に reconcile する）。
// WebSocket Hibernation API を使い、アイドル中はメモリから退避させてコストを抑える。

export class PersonaChannel {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    // クライアントの WebSocket 接続（Worker 側でチケット検証済み）
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      // Hibernation: accept すると DO はアイドル時に退避でき、メッセージ受信で復帰する
      this.state.acceptWebSocket(server);
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

  // Hibernation ハンドラ: クライアントは送信不要だが、keepalive ping に応答する。
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
