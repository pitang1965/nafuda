import { useState } from 'react'
import { useNavigate } from 'react-router'

export function LoginMockPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const navigate = useNavigate()

  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6 px-4">
        <div className="text-4xl">✓</div>
        <p className="text-lg font-semibold text-gray-800">ログイン中（デモ）</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-pink-500 text-white rounded-full font-medium"
        >
          プロフィールを見る
        </button>
        <button
          onClick={() => setIsLoggedIn(false)}
          className="text-sm text-gray-400 underline"
        >
          ログアウト（デモ）
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-2xl font-bold text-gray-900">なふだ</h1>
      <p className="text-sm text-gray-500 text-center">
        推し活デジタル名刺アプリ
      </p>
      <button
        onClick={() => setIsLoggedIn(true)}
        className="flex items-center gap-3 px-6 py-3 bg-white border border-gray-300 rounded-full shadow-sm text-gray-700 font-medium hover:bg-gray-50 transition-colors"
      >
        <span>Googleでログイン（デモ）</span>
      </button>
      <p className="text-xs text-gray-400 mt-4 text-center">
        ※ Phase 0 デモ: 実際の認証は行いません
      </p>
    </div>
  )
}
