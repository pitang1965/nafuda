import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useEvents } from '../context/EventContext'

export function EventEditPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const { getEvent, updateEvent, deleteEvent } = useEvents()

  const event = getEvent(eventId ?? '')
  const [name, setName] = useState(event?.name ?? '')
  const [venue, setVenue] = useState(event?.venue ?? '')
  const [date, setDate] = useState(event?.date ?? '')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        イベントが見つかりません
      </div>
    )
  }

  function handleSave() {
    if (!name.trim() || !eventId) return
    updateEvent(eventId, { name: name.trim(), venue: venue.trim(), date })
    navigate(`/event/${eventId}`)
  }

  function handleDelete() {
    if (!eventId) return
    deleteEvent(eventId)
    navigate('/events')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex flex-col items-center px-4">
      <header className="w-full max-w-md flex items-center py-4">
        <Link to={`/event/${eventId}`} className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-600">
          <span>‹</span>
          <span>戻る</span>
        </Link>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-gray-700">
          イベントを編集
        </h1>
      </header>

      <div className="w-full max-w-md flex flex-col gap-5 pt-4 pb-12">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500">イベント名</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500">会場</label>
          <input
            type="text"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500">日付</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-full shadow-md transition-colors mt-2"
        >
          保存する
        </button>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-2.5 border border-red-200 text-red-400 hover:bg-red-50 rounded-full text-sm font-medium transition-colors"
          >
            このイベントを削除
          </button>
        ) : (
          <div className="flex flex-col gap-2 p-4 bg-red-50 rounded-2xl">
            <p className="text-sm text-red-600 text-center font-medium">本当に削除しますか？</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 border border-gray-200 text-gray-500 rounded-full text-sm"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 bg-red-500 text-white rounded-full text-sm font-medium"
              >
                削除する
              </button>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-300 text-center">※ デモ版：保存はされません</p>
      </div>
    </div>
  )
}
