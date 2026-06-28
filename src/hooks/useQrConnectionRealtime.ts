import { useEffect, useRef } from "react";
import { issueRealtimeTicket } from "../server/functions/realtime";
import { checkQrConnectionStatus } from "../server/functions/connection";

// realtime コンパニオン Worker の URL（ビルド時フラグ）。
// 未設定（本番）なら このフックは完全に不活性になり、me.tsx 側の既存3秒ポーリングが使われる。
// 設定済み（staging Preview）なら WebSocket で接続成立を即時検知し、WS が張れない時だけ
// 縮退ポーリング（低頻度）にフォールバックする。
const REALTIME_URL = import.meta.env.VITE_REALTIME_URL as string | undefined;

export const realtimeEnabled = Boolean(REALTIME_URL);

const MAX_WS_RETRIES = 3;
const FALLBACK_POLL_MS = 12000; // WS 不成立時の縮退ポーリング間隔
const PING_MS = 30000;

type Params = {
  enabled: boolean; // QRシート表示中など、検知すべき状態か
  personaId: string | null;
  token: string | null;
  since: string | null;
  onConnected: (displayName: string) => void;
};

// QR接続成立を realtime（WebSocket）で検知する。正本は Postgres で、(再)接続のたびに
// checkQrConnectionStatus を1回読んで取りこぼしを収束させる（reconcile-on-connect）。
export function useQrConnectionRealtime({
  enabled,
  personaId,
  token,
  since,
  onConnected,
}: Params) {
  const onConnectedRef = useRef(onConnected);
  useEffect(() => {
    onConnectedRef.current = onConnected;
  }, [onConnected]);

  useEffect(() => {
    if (!realtimeEnabled) return; // フラグOFF → me.tsx の既存ポーリングに委ねる
    if (!enabled || !personaId || !token || !since) return;

    let disposed = false;
    let ws: WebSocket | null = null;
    let retries = 0;
    let fallbackTimer: ReturnType<typeof setInterval> | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;

    // Postgres から成立を1回読む。成立していれば通知して true を返す。
    const reconcile = async (): Promise<boolean> => {
      try {
        const result = await checkQrConnectionStatus({
          data: { token, fromPersonaId: personaId, since },
        });
        if (!disposed && result.status === "connected") {
          onConnectedRef.current(result.displayName);
          return true;
        }
      } catch {
        // 一時エラーは無視（次の機会に収束する）
      }
      return false;
    };

    const startFallbackPolling = () => {
      if (disposed || fallbackTimer) return;
      fallbackTimer = setInterval(async () => {
        if (await reconcile()) cleanup();
      }, FALLBACK_POLL_MS);
    };

    const cleanup = () => {
      disposed = true;
      if (pingTimer) clearInterval(pingTimer);
      if (fallbackTimer) clearInterval(fallbackTimer);
      if (ws) {
        ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
        try {
          ws.close();
        } catch {
          /* no-op */
        }
      }
    };

    const connect = async () => {
      if (disposed) return;
      // 接続のたびにチケットを取り直す（短命署名）
      let ticket: string | null;
      try {
        const res = await issueRealtimeTicket({ data: { personaId } });
        ticket = res.ticket;
      } catch {
        startFallbackPolling();
        return;
      }
      if (disposed) return;
      if (!ticket) {
        // サーバー側 realtime 無効 → 縮退ポーリングへ
        startFallbackPolling();
        return;
      }

      try {
        ws = new WebSocket(
          `${REALTIME_URL}/ws?ticket=${encodeURIComponent(ticket)}`,
        );
      } catch {
        startFallbackPolling();
        return;
      }

      ws.onopen = () => {
        retries = 0;
        // 接続前に起きた成立を回収（reconcile-on-connect）
        reconcile().then((done) => {
          if (done) cleanup();
        });
        pingTimer = setInterval(() => {
          try {
            ws?.send("ping");
          } catch {
            /* no-op */
          }
        }, PING_MS);
      };

      ws.onmessage = (ev) => {
        if (disposed) return;
        try {
          if (ev.data === "pong") return;
          const msg = JSON.parse(ev.data as string);
          if (msg?.type === "connection") {
            onConnectedRef.current(msg.displayName ?? "相手");
            cleanup();
          }
        } catch {
          /* 不正メッセージは無視 */
        }
      };

      const onDrop = () => {
        if (disposed) return;
        if (pingTimer) {
          clearInterval(pingTimer);
          pingTimer = null;
        }
        retries += 1;
        if (retries <= MAX_WS_RETRIES) {
          // 再接続（チケット取り直し）。間に取りこぼしがあっても onopen の reconcile で拾う。
          setTimeout(connect, 1000 * retries);
        } else {
          // WS が張れない会場 → 縮退ポーリングで graceful degrade
          startFallbackPolling();
        }
      };

      ws.onerror = onDrop;
      ws.onclose = onDrop;
    };

    connect();
    return cleanup;
  }, [enabled, personaId, token, since]);
}
