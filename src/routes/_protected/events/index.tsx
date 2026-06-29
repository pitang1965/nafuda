import { createFileRoute, Link } from "@tanstack/react-router";
import { getMyEvents } from "../../../server/functions/event";

export const Route = createFileRoute("/_protected/events/")({
  loader: async () => {
    return await getMyEvents();
  },
  staticData: { title: "イベント" },
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
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
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
  const dateStr = formatEventDate(eventDate, showTime, isInstant);

  if (isInstant) {
    return (
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <p className="font-semibold leading-snug">{name}</p>
        <p className="text-xs text-muted-foreground mt-1">{dateStr}</p>
      </div>
    );
  }

  return (
    <Link
      to="/e/$slug"
      params={{ slug: shareToken }}
      className="block rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <p className="font-semibold leading-snug">{name}</p>
      {venueName && (
        <p className="text-sm text-muted-foreground mt-0.5">{venueName}</p>
      )}
      <p className="text-xs text-muted-foreground mt-1">{dateStr}</p>
    </Link>
  );
}

function MyEventsPage() {
  const { hostedEvents, participatedEvents } = Route.useLoaderData();

  // 即時イベントは交換の裏方データ（コネクションの正本＋GPS保管庫）であり、
  // ユーザーが一覧・管理する対象ではないため表示しない（出会いの記録の本体はコネクション一覧）。
  const plannedEvents = hostedEvents.filter((e) => !e.isInstant);

  return (
    <div className="flex-1 p-6 flex flex-col gap-8">
      <Link
        to="/events/new"
        className="self-start px-4 py-2 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
      >
        イベントを作成
      </Link>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            作成したイベント
          </h2>
          {plannedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              まだイベントを作成していません
            </p>
          ) : (
            plannedEvents.map((event) => (
              <EventCard
                key={event.id}
                name={event.name}
                venueName={event.venueName}
                eventDate={event.eventDate}
                showTime={event.showTime}
                isInstant={false}
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
    </div>
  );
}
