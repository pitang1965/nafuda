import { motion } from 'motion/react'
import type { MockProfile } from '../../data/mockData'

interface ParticipantCardProps {
  profile: MockProfile
  index: number
  onClick?: () => void
}

export function ParticipantCard({ profile, index, onClick }: ParticipantCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.12, duration: 0.3, ease: 'easeOut' }}
      onClick={onClick}
      className={`flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]' : ''}`}
    >
      <img
        src={profile.avatarUrl}
        alt={profile.handle}
        className="w-10 h-10 rounded-full flex-shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm text-gray-900 truncate">{profile.handle}</p>
        <div className="flex flex-wrap gap-1 mt-0.5">
          {profile.oshiTags.slice(0, 2).map((tag) => (
            <span key={tag} className="text-xs text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      </div>
      {onClick && <span className="text-gray-300 flex-shrink-0 text-sm">›</span>}
    </motion.div>
  )
}
