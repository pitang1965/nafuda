import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { getMyEvents } from "../../../server/functions/event";

export const Route = createFileRoute("/_protected/events/")({
  loader: async () => {
    return await getMyEvents();
  },
  component: MyEventsPage,
});

function formatEventDate(
  date: Date | string,
  showTime: boolean,
  isInstant: boolean,
) {
  const d = new Date(date);
  if (showTime || isInstant) {
    return d.toLocaleString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface EventCardProps {
  name: string;
  venueName: string | null;
  eventDate: Date | string;
  showTime: boolean;
  isInstant: boolean;
  shareToken: string;
}

function EventCard({
  name,
  venueName,
  eventDate,
  showTime,
  isInstant,
  shareToken,
}: EventCardProps) {
  return (
    <Link
      to="/e/$slug"
      params={{ slug: shareToken }}
      className="block rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <p className="font-semibold leading-snug">{name}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{venueName}</p>
      <p className="text-xs text-muted-foreground mt-1">
        {formatEventDate(eventDate, showTime, isInstant)}
      </p>
    </Link>
  );
}

function MyEventsPage() {
  const { hostedEvents, participatedEvents } = Route.useLoaderData();
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.history.back()}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="戻る"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="text-lg font-bold">マイイベント</h1>
        </div>
        <Link
          to="/events/new"
          className="px-4 py-2 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
        >
          イベントを作成
        </Link>
      </div>

      <main className="flex-1 p-6 flex flex-col gap-8 max-w-lg mx-auto w-full">
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            作成したイベント
          </h2>
          {hostedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              まだイベントを作成していません
            </p>
          ) : (
            hostedEvents.map((event) => (
              <EventCard
                key={event.id}
                name={event.name}
                venueName={event.venueName}
                eventDate={event.eventDate}
                showTime={event.showTime}
                isInstant={event.isInstant}
                shareToken={event.shareToken}
              />
            ))
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            参加したイベント
          </h2>
          {participatedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              まだイベントに参加していません
            </p>
          ) : (
            participatedEvents.map((event) => (
              <EventCard
                key={event.id}
                name={event.name}
                venueName={event.venueName}
                eventDate={event.eventDate}
                showTime={event.showTime}
                isInstant={event.isInstant}
                shareToken={event.shareToken}
              />
            ))
          )}
        </section>
      </main>
    </div>
  );
}
