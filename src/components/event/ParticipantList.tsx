import type { MockProfile } from '../../data/mockData'
import { ParticipantCard } from './ParticipantCard'

interface ParticipantListProps {
  participants: MockProfile[]
  onCardClick?: (profile: MockProfile) => void
}

export function ParticipantList({ participants, onCardClick }: ParticipantListProps) {
  if (participants.length === 0) {
    return (
      <p className="text-center text-gray-400 text-sm py-8">
        まだ参加者がいません
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {participants.map((profile, index) => (
        <ParticipantCard
          key={profile.id}
          profile={profile}
          index={index}
          onClick={onCardClick ? () => onCardClick(profile) : undefined}
        />
      ))}
    </div>
  )
}
