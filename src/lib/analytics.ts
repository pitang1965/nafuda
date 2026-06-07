import type { PostHog } from "posthog-js";

const isPreview =
  typeof window !== "undefined" &&
  window.location.hostname.endsWith(".pages.dev");

let ph: PostHog | null = null;

export async function initAnalytics() {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!import.meta.env.PROD || !key || isPreview) return;
  const { default: posthog } = await import("posthog-js");
  posthog.init(key, {
    api_host: "https://us.i.posthog.com",
    persistence: "localStorage+cookie",
    ip: false,
    capture_pageview: true,
  });
  ph = posthog;
}

export function capture(event: string, properties?: Record<string, unknown>) {
  ph?.capture(event, properties);
}
