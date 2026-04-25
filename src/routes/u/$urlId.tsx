import { createFileRoute, Link } from '@tanstack/react-router'
import { getPublicProfile } from '../../server/functions/profile'
import { InitialsAvatar } from '../../components/InitialsAvatar'
import { SnsLinkButton } from '../../components/SnsLinkButton'

// No beforeLoad auth check — public route per AUTH-03 and AUTH-04
export const Route = createFileRoute('/u/$urlId')({
  loader: ({ params }) => getPublicProfile({ data: { urlId: params.urlId } }),
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
      {profile.bio && (
        <p className="text-sm text-gray-600 text-center whitespace-pre-wrap max-w-sm">{profile.bio}</p>
      )}
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
            <SnsLinkButton key={link.id} platform={link.platform} url={link.url} />
          ))}
        </div>
      )}
      <Link to="/" className="mt-4 text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2">
        なふだとは？
      </Link>
    </div>
  )
}
