import { useParams } from 'react-router'
import { MOCK_EVENT } from '../data/mockData'
import { ParticipantList } from '../components/event/ParticipantList'

export function EventRoomPage() {
  const { eventId } = useParams()
  // Phase 0: eventId に関わらず MOCK_EVENT を表示する
  const event = MOCK_EVENT

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white pb-12">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm px-4 py-4 sticky top-0 z-10">
        <h1 className="text-base font-bold text-gray-900 truncate">{event.name}</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {event.venue} · {event.date}
        </p>
      </div>

      {/* 参加者一覧 */}
      <div className="px-4 pt-4">
        <h2 className="text-sm font-semibold text-gray-600 mb-3">
          参加者 {event.participants.length}人
        </h2>
        <ParticipantList participants={event.participants} />
      </div>

      {/* イベントID表示（デバッグ用） */}
      <p className="text-center text-xs text-gray-300 mt-8">
        {eventId ? `イベントID: ${eventId}` : 'イベントルーム'}
      </p>
    </div>
  )
}
