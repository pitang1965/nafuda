// EventRoom: イベント1件 = 1部屋の presence 用 Durable Object。
// 参加者一覧の閲覧者全員が接続し、チェックイン/取消の「更新あり」通知を中継する。
// アドレス = idFromName(eventId)。名簿の正本は Postgres(event_checkins)で、DO は中継のみ。
// クライアントは通知/再接続のたびにローダーを再取得して収束する。
import { BroadcastRoom } from "./room";

export class EventRoom extends BroadcastRoom {}
