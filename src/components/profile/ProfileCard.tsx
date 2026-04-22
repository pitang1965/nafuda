import type { MockProfile } from '../../data/mockData'
import { SnsLinkList } from './SnsLinkList'

interface ProfileCardProps {
  profile: MockProfile
  onQROpen?: () => void
}

export function ProfileCard({ profile, onQROpen }: ProfileCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col items-center gap-4 max-w-sm w-full mx-auto">
      {/* アバター */}
      <img
        src={profile.avatarUrl}
        alt={profile.handle}
        className="w-24 h-24 rounded-full border-4 border-pink-200"
      />

      {/* ハンドル名 */}
      <h1 className="text-xl font-bold text-gray-900">{profile.handle}</h1>

      {/* 推しタグ */}
      {profile.oshiTags.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center">
          {profile.oshiTags.map((tag) => (
            <span
              key={tag}
              className="text-xs text-pink-600 bg-pink-50 px-3 py-1 rounded-full font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* SNSリンク */}
      <div className="w-full">
        <SnsLinkList links={profile.snsLinks} />
      </div>

      {/* QRボタン */}
      {onQROpen && (
        <button
          onClick={onQROpen}
          className="mt-2 flex items-center gap-2 px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-medium transition-colors"
        >
          <span>QRコードを表示</span>
        </button>
      )}
    </div>
  )
}
