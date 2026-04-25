import { Link } from '@tanstack/react-router'
import { InitialsAvatar } from './InitialsAvatar'

interface ParticipantCardProps {
  displayName: string
  avatarUrl?: string | null
  profileHref?: string       // undefined のとき: カードはクリック不可・リンクなし（OSHI-05）
  className?: string
}

export function ParticipantCard({ displayName, avatarUrl, profileHref, className }: ParticipantCardProps) {
  const content = (
    <div className={`flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-200 bg-white ${profileHref ? 'hover:border-pink-300 hover:shadow-sm transition-all' : 'opacity-80'} ${className ?? ''}`}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="w-14 h-14 rounded-full object-cover"
        />
      ) : (
        <InitialsAvatar name={displayName} size={56} />
      )}
      <span className="text-sm font-medium text-gray-800 text-center leading-tight break-all line-clamp-2">
        {displayName}
      </span>
      {profileHref && (
        <span className="text-xs text-pink-500">プロフィールを見る</span>
      )}
    </div>
  )

  if (profileHref) {
    return (
      <Link to={profileHref} className="block no-underline">
        {content}
      </Link>
    )
  }

  return content
}
