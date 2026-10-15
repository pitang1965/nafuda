import { createFileRoute, Link } from "@tanstack/react-router";
import { getMyEvents } from "../../../server/functions/event";
import { useT, useLocale } from "../../../lib/i18n/context";
import type { Locale } from "../../../lib/i18n/types";
import { formatJstDate, formatJstDateTime } from "../../../lib/i18n/formatDate";

export const Route = createFileRoute("/_protected/events/")({
  loader: async () => {
    return await getMyEvents();
  },
  staticData: { title: "nav.events" },
  component: MyEventsPage,
});

function formatEventDate(
  date: Date | string,
  showTime: boolean,
  isInstant: boolean,
  locale: Locale,
) {
  if (showTime || isInstant) return formatJstDateTime(date, locale);
  return formatJstDate(date, locale);
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
  const { locale } = useLocale();
  const dateStr = formatEventDate(eventDate, showTime, isInstant, locale);

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
  const t = useT();
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
        {t("myEvents.createEvent")}
      </Link>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t("myEvents.hostedHeading")}
          </h2>
          {plannedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t("myEvents.hostedEmpty")}
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
            {t("myEvents.participatedHeading")}
          </h2>
          {participatedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t("myEvents.participatedEmpty")}
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
