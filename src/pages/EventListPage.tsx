import { Link } from 'react-router'
import { useEvents } from '../context/EventContext'
import type { MockEvent } from '../data/mockData'

function EventCard({ event, owned }: { event: MockEvent; owned: boolean }) {
  return (
    <Link
      to={`/event/${event.id}`}
      className="flex items-center gap-3 bg-white rounded-2xl shadow-sm px-4 py-3 hover:shadow-md transition-shadow"
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 text-sm truncate">{event.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">{event.venue} · {event.date}</p>
        <p className="text-xs text-gray-300 mt-0.5">参加者 {event.participants.length}人</p>
      </div>
      {owned && (
        <Link
          to={`/event/${event.id}/edit`}
          onClick={(e) => e.stopPropagation()}
          className="flex-shrink-0 text-xs text-gray-400 hover:text-pink-500 px-2 py-1"
        >
          編集
        </Link>
      )}
      <span className="text-gray-300 flex-shrink-0">›</span>
    </Link>
  )
}

export function EventListPage() {
  const { myEvents, participatingEvents } = useEvents()

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white px-4">
      <header className="flex items-center py-4 max-w-md mx-auto">
        <Link to="/" className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-600">
          <span>‹</span>
          <span>戻る</span>
        </Link>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-gray-700">
          イベント
        </h1>
      </header>

      <div className="max-w-md mx-auto flex flex-col gap-6 pt-2 pb-12">
        <Link
          to="/events/new"
          className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-full shadow-md transition-colors text-center text-sm"
        >
          ＋ イベントを作成
        </Link>

        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">主催イベント</h2>
          {myEvents.length === 0 ? (
            <p className="text-sm text-gray-300 text-center py-4">作成したイベントはありません</p>
          ) : (
            <div className="flex flex-col gap-3">
              {myEvents.map((e) => <EventCard key={e.id} event={e} owned />)}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">参加イベント</h2>
          {participatingEvents.length === 0 ? (
            <p className="text-sm text-gray-300 text-center py-4">参加中のイベントはありません</p>
          ) : (
            <div className="flex flex-col gap-3">
              {participatingEvents.map((e) => <EventCard key={e.id} event={e} owned={false} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
