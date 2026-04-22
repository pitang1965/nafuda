import { useParams } from 'react-router'
import { MOCK_PROFILE } from '../data/mockData'
import { ProfileCard } from '../components/profile/ProfileCard'

export function ProfilePage() {
  const { userId } = useParams()
  // Phase 0: userId に関わらず MOCK_PROFILE を表示する
  const profile = MOCK_PROFILE

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex flex-col items-center justify-start pt-12 px-4">
      <ProfileCard profile={profile} />
      <p className="mt-6 text-xs text-gray-400">
        {userId ? `ユーザーID: ${userId}` : 'プロフィールページ'}
      </p>
    </div>
  )
}
