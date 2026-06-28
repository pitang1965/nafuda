import { useEffect, useRef } from "react";
import { issueEventRoomTicket } from "../server/functions/realtime";

// realtime コンパニオン Worker の URL（ビルド時フラグ）。未設定（本番）ならこのフックは不活性で、
// イベントページは従来どおり静的な参加者一覧（ローダー取得のまま）になる。設定済み（staging）なら
// EventRoom に WS 接続し、チェックイン/取消の通知や再接続のたびに onChange でローダーを再取得する。
const REALTIME_URL = import.meta.env.VITE_REALTIME_URL as string | undefined;
const realtimeEnabled = Boolean(REALTIME_URL);

const MAX_WS_RETRIES = 3;
const FALLBACK_POLL_MS = 15000; // WS 不成立時の縮退ポーリング間隔
const SAFETY_RECONCILE_MS = 30000; // WS健全でも取りこぼしに備える安全網
const PING_MS = 30000;

type Params = {
  enabled: boolean; // イベントページを表示中か（データ取得済みか）
  token: string | null; // イベントの shareToken
  onChange: () => void; // 名簿が変わった/再同期すべき時に呼ぶ（通常は router.invalidate）
};

// イベント参加者一覧をリアルタイムに保つ。正本は Postgres で、通知/再接続のたびに onChange を
// 呼んでローダーを再取得し収束させる（「signal + 再取得」）。差分は持たない。
export function useEventRoomRealtime({ enabled, token, onChange }: Params) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!realtimeEnabled) return; // フラグOFF → 静的一覧のまま
    if (!enabled || !token) return;

    let disposed = false;
    let ws: WebSocket | null = null;
    let retries = 0;
    let fallbackTimer: ReturnType<typeof setInterval> | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let safetyTimer: ReturnType<typeof setInterval> | null = null;

    const fire = () => {
      if (!disposed) onChangeRef.current();
    };

    const startFallbackPolling = () => {
      if (disposed || fallbackTimer) return;
      fallbackTimer = setInterval(fire, FALLBACK_POLL_MS);
    };

    const cleanup = () => {
      disposed = true;
      if (pingTimer) clearInterval(pingTimer);
      if (fallbackTimer) clearInterval(fallbackTimer);
      if (safetyTimer) clearInterval(safetyTimer);
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
      let ticket: string | null;
      try {
        const res = await issueEventRoomTicket({ data: { token } });
        ticket = res.ticket;
      } catch {
        startFallbackPolling();
        return;
      }
      if (disposed) return;
      if (!ticket) {
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
        fire(); // reconcile-on-connect: 接続前/中の変化を回収
        pingTimer = setInterval(() => {
          try {
            ws?.send("ping");
          } catch {
            /* no-op */
          }
        }, PING_MS);
        // 安全網: WSが健全でも push 取りこぼしに備えて低頻度で再同期
        safetyTimer = setInterval(fire, SAFETY_RECONCILE_MS);
      };

      ws.onmessage = (ev) => {
        if (disposed) return;
        try {
          if (ev.data === "pong") return;
          const msg = JSON.parse(ev.data as string);
          if (msg?.type === "roster") fire();
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
        if (safetyTimer) {
          clearInterval(safetyTimer);
          safetyTimer = null;
        }
        retries += 1;
        if (retries <= MAX_WS_RETRIES) {
          setTimeout(connect, 1000 * retries);
        } else {
          startFallbackPolling();
        }
      };

      ws.onerror = onDrop;
      ws.onclose = onDrop;
    };

    connect();
    return cleanup;
  }, [enabled, token]);
}
