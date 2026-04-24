import { createFileRoute } from '@tanstack/react-router'
import { getPublicProfile } from '../../server/functions/profile'
import { InitialsAvatar } from '../../components/InitialsAvatar'

// Specific persona by share token — public route, no auth required
export const Route = createFileRoute('/u/$urlId/p/$token')({
  loader: ({ params }) => getPublicProfile({ data: { shareToken: params.token } }),
  component: PublicProfilePage,
})

function PublicProfilePage() {
  const profile = Route.useLoaderData()
  if (!profile) return <div className="p-6 text-sm text-gray-500">プロフィールが見つかりません</div>

  return (
    <div className="min-h-screen p-6 flex flex-col items-center gap-4">
      {profile.avatarUrl ? (
        <img src={profile.avatarUrl} alt="" className="w-20 h-20 rounded-full object-cover" />
      ) : (
        <InitialsAvatar name={profile.displayName} size={80} />
      )}
      <h1 className="text-2xl font-bold">{profile.displayName}</h1>
      {profile.oshiTags.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center">
          {profile.oshiTags.map(tag => (
            <span key={tag} className="px-2 py-0.5 bg-pink-100 text-pink-700 rounded-full text-xs">{tag}</span>
          ))}
        </div>
      )}
      {profile.snsLinks.length > 0 && (
        <div className="w-full max-w-sm flex flex-col gap-2">
          {profile.snsLinks.map(link => (
            <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-3 border rounded-lg text-sm hover:bg-gray-50">
              <span className="font-medium capitalize">{link.platform}</span>
              <span className="text-gray-400 text-xs truncate">{link.url}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
