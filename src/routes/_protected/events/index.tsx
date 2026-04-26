import { createFileRoute, Link } from '@tanstack/react-router'
import { getMyEvents } from '../../../server/functions/event'

export const Route = createFileRoute('/_protected/events/')({
  loader: async () => {
    return await getMyEvents()
  },
  component: MyEventsPage,
})

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

interface EventCardProps {
  name: string
  venueName: string
  eventDate: Date | string
  slug: string
}

function EventCard({ name, venueName, eventDate, slug }: EventCardProps) {
  return (
    <Link
      to="/e/$slug"
      params={{ slug }}
      className="block rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <p className="font-semibold leading-snug">{name}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{venueName}</p>
      <p className="text-xs text-muted-foreground mt-1">{formatDate(eventDate)}</p>
    </Link>
  )
}

function MyEventsPage() {
  const { hostedEvents, participatedEvents } = Route.useLoaderData()

  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <h1 className="text-lg font-bold">マイイベント</h1>
        <Link
          to="/events/new"
          className="px-4 py-2 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
        >
          イベントを作成
        </Link>
      </div>

      <div className="flex-1 p-6 flex flex-col gap-8 max-w-lg mx-auto w-full">
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
                slug={event.slug}
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
                slug={event.slug}
              />
            ))
          )}
        </section>
      </div>
    </div>
  )
}
