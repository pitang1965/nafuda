import { useAuth } from '../context/AuthContext'

const features = [
  {
    icon: '🪪',
    title: 'デジタル名刺をQRで交換',
    description: 'イベント会場でQRを見せ合うだけ。その場でつながれる。',
  },
  {
    icon: '🌟',
    title: '推しタグで仲間を発見',
    description: '同じアーティストを推す人がひと目でわかる。',
  },
  {
    icon: '🎪',
    title: 'イベントルームで盛り上がる',
    description: 'ライブ・握手会・オフ会の参加者と気軽に交流。',
  },
]

export function LandingPage() {
  const { login } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex flex-col items-center px-4 py-12">
      <div className="max-w-md w-full flex flex-col items-center">

        {/* ヒーロー */}
        <h1 className="text-4xl font-bold text-pink-500 mb-2">nafuda</h1>
        <p className="text-sm text-gray-400 mb-10">推し活をもっと楽しく</p>

        {/* ログインボタン */}
        <button
          onClick={login}
          className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white font-semibold rounded-full shadow-md transition-colors mb-12 text-base"
        >
          ログイン
        </button>

        {/* 機能紹介 */}
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-4 self-start">できること</p>
        <div className="flex flex-col gap-4 w-full">
          {features.map((f) => (
            <div key={f.title} className="flex items-start gap-4 bg-white rounded-2xl shadow-sm px-5 py-4">
              <span className="text-3xl mt-0.5">{f.icon}</span>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{f.title}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{f.description}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-12 text-xs text-gray-300 text-center">
          ※ デモ版：実際の認証・データ保存は行いません
        </p>
      </div>
    </div>
  )
}
