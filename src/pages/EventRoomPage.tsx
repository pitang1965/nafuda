import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { MOCK_EVENT, MOCK_PROFILE } from '../data/mockData'
import { ParticipantList } from '../components/event/ParticipantList'
import { QRBottomSheet } from '../components/ui/QRBottomSheet'

export function EventRoomPage() {
  const { eventId } = useParams()
  const event = MOCK_EVENT
  const [isQROpen, setIsQROpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white pb-12">
      <div className="bg-white shadow-sm px-4 py-4 sticky top-0 z-10 flex items-center justify-between">
        <Link to="/" className="flex-shrink-0 flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-600 mr-2">
          <span>‹</span>
          <span>戻る</span>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold text-gray-900 truncate">{event.name}</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {event.venue} · {event.date}
          </p>
        </div>
        <button
          onClick={() => setIsQROpen(true)}
          className="flex-shrink-0 ml-3 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-full text-sm font-medium transition-colors"
        >
          QRコード
        </button>
      </div>

      <div className="px-4 pt-4">
        <h2 className="text-sm font-semibold text-gray-600 mb-3">
          参加者 {event.participants.length}人
        </h2>
        <ParticipantList participants={event.participants} />
      </div>

      <p className="text-center text-xs text-gray-300 mt-8">
        {eventId ? `イベントID: ${eventId}` : 'イベントルーム'}
      </p>

      <QRBottomSheet
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
        url={`${window.location.origin}/p/${MOCK_PROFILE.id}`}
        title="自分のQRコード"
      />
    </div>
  )
}
