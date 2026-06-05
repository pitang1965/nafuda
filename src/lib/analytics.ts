import posthog from "posthog-js";

export function initAnalytics() {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!import.meta.env.PROD || !key) return;
  posthog.init(key, {
    api_host: "https://us.i.posthog.com",
    persistence: "localStorage+cookie",
    ip: false,
    capture_pageview: true,
  });
}

export function capture(event: string, properties?: Record<string, unknown>) {
  if (!import.meta.env.PROD) return;
  posthog.capture(event, properties);
}
