import type { PostHog } from "posthog-js";

const isPreview =
  typeof window !== "undefined" &&
  window.location.hostname.endsWith(".pages.dev");

let ph: PostHog | null = null;
// initAnalytics より先に判定が走っても取りこぼさないための保留状態
let pendingInternal: boolean | null = null;

export async function initAnalytics() {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!import.meta.env.PROD || !key || isPreview) return;
  const { default: posthog } = await import("posthog-js");
  posthog.init(key, {
    api_host: "https://us.i.posthog.com",
    persistence: "localStorage+cookie",
    ip: false,
    capture_pageview: true,
    disable_surveys: true,
  });
  ph = posthog;
  if (pendingInternal !== null) applyInternal(pendingInternal);
}

function applyInternal(isInternal: boolean) {
  if (!ph) return;
  // register したスーパープロパティは localStorage に永続化され、以降の全イベントに付く。
  // 非該当時は unregister して、同じ端末を別人が使う場合に印が残らないようにする。
  if (isInternal) ph.register({ is_internal: true });
  else ph.unregister("is_internal");
}

// 自分（内部ユーザー）のイベントに is_internal:true を付け、PostHog 側で除外できるようにする。
// identify は使わないため匿名計測の設計は崩れない。
export function setInternalUser(isInternal: boolean) {
  pendingInternal = isInternal;
  applyInternal(isInternal);
}

export function capture(event: string, properties?: Record<string, unknown>) {
  ph?.capture(event, properties);
}
