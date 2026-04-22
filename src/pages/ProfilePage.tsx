import { useState } from 'react'
import { useParams } from 'react-router'
import { MOCK_PROFILE } from '../data/mockData'
import { ProfileCard } from '../components/profile/ProfileCard'
import { QRBottomSheet } from '../components/ui/QRBottomSheet'

export function ProfilePage() {
  const { userId } = useParams()
  const profile = MOCK_PROFILE
  const [isQROpen, setIsQROpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex flex-col items-center justify-start pt-12 px-4">
      <ProfileCard
        profile={profile}
        onQROpen={() => setIsQROpen(true)}
      />
      <p className="mt-6 text-xs text-gray-400">
        {userId ? `ユーザーID: ${userId}` : 'プロフィールページ'}
      </p>

      <QRBottomSheet
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
        url={profile.profileUrl}
        title="QRコードで共有"
      />
    </div>
  )
}
