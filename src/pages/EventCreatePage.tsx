import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useEvents } from '../context/EventContext'

export function EventCreatePage() {
  const navigate = useNavigate()
  const { createEvent } = useEvents()
  const [name, setName] = useState('')
  const [venue, setVenue] = useState('')
  const [date, setDate] = useState('')

  function handleSave() {
    if (!name.trim()) return
    const event = createEvent({ name: name.trim(), venue: venue.trim(), date })
    navigate(`/event/${event.id}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex flex-col items-center px-4">
      <header className="w-full max-w-md flex items-center py-4">
        <Link to="/events" className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-600">
          <span>‹</span>
          <span>戻る</span>
        </Link>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-gray-700">
          イベントを作成
        </h1>
      </header>

      <div className="w-full max-w-md flex flex-col gap-5 pt-4 pb-12">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500">イベント名 <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 星降る夜のライブ2026"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500">会場</label>
          <input
            type="text"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="例: 東京ドーム"
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
          作成する
        </button>

        <p className="text-xs text-gray-300 text-center">※ デモ版：保存はされません</p>
      </div>
    </div>
  )
}
