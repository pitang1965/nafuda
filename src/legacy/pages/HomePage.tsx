import { Link } from 'react-router'
import { useAuth } from '../context/AuthContext'

const cards = [
  {
    to: '/me',
    label: 'マイプロフィール',
    description: '自分のプロフィールカードを確認・共有',
    icon: '👤',
  },
  {
    to: '/events',
    label: 'イベント',
    description: 'イベントルームで参加者とつながる',
    icon: '🎪',
  },
  {
    to: '/connections',
    label: 'つながり一覧',
    description: 'これまでつながった人を確認',
    icon: '🤝',
  },
]

export function HomePage() {
  const { logout } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white px-4 pt-12 pb-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-center text-pink-500 mb-2">nafuda</h1>
        <p className="text-center text-sm text-gray-400 mb-10">推し活をもっと楽しく</p>

        <div className="flex flex-col gap-4">
          {cards.map((card) => (
            <Link
              key={card.to}
              to={card.to}
              className="flex items-center gap-4 bg-white rounded-2xl shadow-sm px-5 py-4 hover:shadow-md transition-shadow"
            >
              <span className="text-3xl">{card.icon}</span>
              <div>
                <p className="font-semibold text-gray-800">{card.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{card.description}</p>
              </div>
              <span className="ml-auto text-gray-300">›</span>
            </Link>
          ))}
        </div>

        <button
          onClick={logout}
          className="mt-10 w-full text-xs text-gray-300 hover:text-gray-400 transition-colors"
        >
          ログアウト
        </button>
      </div>
    </div>
  )
}
