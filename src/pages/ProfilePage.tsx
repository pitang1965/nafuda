import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { MOCK_PROFILE } from '../data/mockData'
import { ProfileCard } from '../components/profile/ProfileCard'
import { QRBottomSheet } from '../components/ui/QRBottomSheet'

export function ProfilePage() {
  const { userId } = useParams()
  const profile = MOCK_PROFILE
  const [isQROpen, setIsQROpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex flex-col items-center justify-start px-4">
      <header className="w-full max-w-md flex items-center py-4">
        <Link to="/" className="flex items-center gap-1 text-sm text-pink-400 hover:text-pink-600">
          <span>‹</span>
          <span>戻る</span>
        </Link>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-gray-700">
          マイプロフィール
        </h1>
      </header>

      <div className="pt-6 w-full max-w-md flex flex-col items-center gap-4 pb-12">
        <ProfileCard
          profile={profile}
          onQROpen={() => setIsQROpen(true)}
        />

        {!userId && (
          <Link
            to="/me/edit"
            className="w-full text-center py-2.5 border border-pink-300 text-pink-500 hover:bg-pink-50 rounded-full text-sm font-medium transition-colors"
          >
            プロフィールを編集
          </Link>
        )}

        <p className="text-xs text-gray-300">
          {userId ? `ユーザーID: ${userId}` : 'プロフィールページ'}
        </p>
      </div>

      <QRBottomSheet
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
        url={profile.profileUrl}
        title="QRコードで共有"
      />
    </div>
  )
}
