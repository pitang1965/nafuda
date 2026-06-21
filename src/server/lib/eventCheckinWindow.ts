// チェックイン受付窓の計算（ADR-0020）。
// 開催期間 [開始, 終了] の前後に短い猶予を足した範囲だけチェックインを受け付ける。
// 終了未指定のイベントは「開始日の終わり」を実効終了にフォールバックし、締め出しを避ける。

// 前後の猶予（「現場に実際に居た人だけ」を保つ短さ）。定数で調整可能。
export const CHECKIN_GRACE_MS = 15 * 60 * 1000;

// 即時イベントの文脈を「この交換セッションのもの」と見なせる上限。これを超えて残存する
// 即時チェックインは古い集まりとみなし、コネクション文脈に使わない（脱結合 / ADR-0020）。
// なお超過時の挙動は「文脈なし」（安全側）であり、誤った文脈を付けることはない。
export const INSTANT_CONTEXT_MAX_AGE_MS = 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

type EventTiming = {
  eventDate: Date | string;
  eventEndDate: Date | string | null;
  showTime: boolean;
};

// 実効終了（受付の後ろ端、猶予を足す前）を求める。
function effectiveEnd(event: EventTiming): Date {
  const start = new Date(event.eventDate);
  if (event.eventEndDate) {
    const end = new Date(event.eventEndDate);
    // 日付のみの終了は「その日の終わり」まで延ばす（日付は当日 0:00 を指すため）。
    return event.showTime ? end : new Date(end.getTime() + DAY_MS);
  }
  // 終了未指定: 開始日の終わり（次の 0:00）までフォールバック。
  if (event.showTime) {
    const d = new Date(start);
    d.setUTCHours(24, 0, 0, 0);
    return d;
  }
  return new Date(start.getTime() + DAY_MS);
}

// 受付窓 [open, close]。この範囲外のチェックインは受け付けない。
export function getCheckinWindow(event: EventTiming): {
  open: Date;
  close: Date;
} {
  const start = new Date(event.eventDate);
  return {
    open: new Date(start.getTime() - CHECKIN_GRACE_MS),
    close: new Date(effectiveEnd(event).getTime() + CHECKIN_GRACE_MS),
  };
}

// 指定時刻が受付窓内か。
export function isWithinCheckinWindow(
  event: EventTiming,
  at: Date = new Date(),
): boolean {
  const { open, close } = getCheckinWindow(event);
  return at >= open && at <= close;
}

// 発行者のアクティブチェックインが、つながり文脈の出どころとして有効か（ADR-0020）。
// - 企画イベント: 開催期間が終わって（受付窓の close を過ぎて）いなければ有効。
// - 即時イベント: 直近セッション（INSTANT_CONTEXT_MAX_AGE_MS 以内）に作られたものだけ有効。
//   古い即時チェックインは文脈に使わない（後続の交換を汚さない）。
export function isValidConnectionContext(
  checkin: EventTiming & { isInstant: boolean; checkedInAt: Date | string },
  at: Date = new Date(),
): boolean {
  if (checkin.isInstant) {
    const age = at.getTime() - new Date(checkin.checkedInAt).getTime();
    return age <= INSTANT_CONTEXT_MAX_AGE_MS;
  }
  return at <= getCheckinWindow(checkin).close;
}
