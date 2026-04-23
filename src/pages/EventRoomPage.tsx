import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Sheet } from 'react-modal-sheet'
import { MOCK_PROFILE, MY_USER_ID } from '../data/mockData'
import type { MockProfile } from '../data/mockData'
import { useEvents } from '../context/EventContext'
import { useAuth } from '../context/AuthContext'
import { ParticipantList } from '../components/event/ParticipantList'
import { QRBottomSheet } from '../components/ui/QRBottomSheet'

export function EventRoomPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const { getEvent } = useEvents()
  const { isLoggedIn, login } = useAuth()
  const [isQROpen, setIsQROpen] = useState(false)
  const [loginPromptOpen, setLoginPromptOpen] = useState(false)

  const event = getEvent(eventId ?? '')

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        イベントが見つかりません
      </div>
    )
  }

  const isOwner = event.createdBy === MY_USER_ID

  function handleParticipantClick(profile: MockProfile) {
    if (profile.id === MY_USER_ID) {
      navigate('/me')
      return
    }
    if (isLoggedIn) {
      navigate(`/p/${profile.id}`)
    } else {
      setLoginPromptOpen(true)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white pb-12">
      <div className="bg-white shadow-sm px-4 py-4 sticky top-0 z-10 flex items-center justify-between">
        <Link to="/events" className="flex-shrink-0 flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-600 mr-2">
          <span>‹</span>
          <span>戻る</span>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold text-gray-900 truncate">{event.name}</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {event.venue} · {event.date}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {isOwner && (
            <button
              onClick={() => navigate(`/event/${eventId}/edit`)}
              className="text-xs text-indigo-400 hover:text-indigo-600"
            >
              編集
            </button>
          )}
          <button
            onClick={() => setIsQROpen(true)}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-full text-sm font-medium transition-colors"
          >
            QRコード
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-md mx-auto">
        <h2 className="text-sm font-semibold text-gray-600 mb-3">
          参加者 {event.participants.length}人
          <span className="text-xs font-normal text-gray-400 ml-2">タップでプロフィールを表示</span>
        </h2>
        <ParticipantList
          participants={event.participants}
          onCardClick={handleParticipantClick}
        />
      </div>

      <QRBottomSheet
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
        url={`${window.location.origin}/event/${event.id}`}
        title="イベントQRコード"
      />

      {/* 未ログイン時のログイン案内 */}
      <Sheet isOpen={loginPromptOpen} onClose={() => setLoginPromptOpen(false)} detent="content">
        <Sheet.Container>
          <Sheet.Header />
          <Sheet.Content>
            <div className="flex flex-col items-center gap-4 px-6 pb-10 pt-2">
              <p className="text-base font-semibold text-gray-800">ログインが必要です</p>
              <p className="text-sm text-gray-500 text-center">
                参加者のプロフィールを見るにはログインしてください。
              </p>
              <button
                onClick={() => { login(); setLoginPromptOpen(false) }}
                className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white font-semibold rounded-full transition-colors"
              >
                ログイン
              </button>
              <button
                onClick={() => setLoginPromptOpen(false)}
                className="text-sm text-gray-400 underline"
              >
                キャンセル
              </button>
            </div>
          </Sheet.Content>
        </Sheet.Container>
        <Sheet.Backdrop onTap={() => setLoginPromptOpen(false)} />
      </Sheet>
    </div>
  )
}
