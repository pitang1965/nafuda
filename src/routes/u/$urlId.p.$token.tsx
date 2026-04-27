import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { getPublicProfile } from '../../server/functions/profile'
import { createConnection } from '../../server/functions/connection'
import { InitialsAvatar } from '../../components/InitialsAvatar'
import { SnsLinkButton } from '../../components/SnsLinkButton'
import { auth } from '../../server/auth'
import { db } from '../../server/db/client'
import { urlIds } from '../../server/db/schema'

const getSessionWithUrlId = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return { user: null, myUrlId: null }

  const row = await db.select({ urlId: urlIds.urlId })
    .from(urlIds)
    .where(eq(urlIds.userId, session.user.id))
    .limit(1)

  return { user: session.user, myUrlId: row[0]?.urlId ?? null }
})

// Specific persona by share token — public route, no auth required
export const Route = createFileRoute('/u/$urlId/p/$token')({
  loader: async ({ params }) => {
    const [profile, sessionData] = await Promise.all([
      getPublicProfile({ data: { shareToken: params.token } }),
      getSessionWithUrlId(),
    ])
    const isOwnProfile = sessionData.myUrlId === params.urlId
    return { profile, session: sessionData, urlId: params.urlId, isOwnProfile }
  },
  component: PublicProfilePage,
})

function PublicProfilePage() {
  const { profile, session, urlId, isOwnProfile } = Route.useLoaderData()
  const navigate = useNavigate()
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!profile) return <div className="p-6 text-sm text-gray-500">プロフィールが見つかりません</div>

  const handleConnect = async () => {
    if (!session.user) {
      await navigate({ to: '/login' })
      return
    }
    setConnecting(true)
    setError(null)
    try {
      const result = await createConnection({ data: { targetUrlId: urlId } })
      if (result.alreadyConnected) {
        setConnected(true)
      } else {
        setConnected(true)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'エラーが発生しました'
      setError(message)
    } finally {
      setConnecting(false)
    }
  }

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

      {/* 「つながる」ボタン: 自分のプロフィールでは非表示 */}
      {!isOwnProfile && (
        <div className="w-full max-w-sm mt-2">
          {connected ? (
            <div className="w-full text-center px-6 py-3 bg-gray-100 text-gray-500 rounded-xl text-sm font-medium">
              つながり済み ✓
            </div>
          ) : (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full px-6 py-3 bg-pink-500 text-white rounded-xl text-sm font-medium hover:bg-pink-600 transition-colors disabled:opacity-50"
            >
              {connecting ? 'つながっています...' : 'つながる'}
            </button>
          )}
          {error && <p className="text-xs text-red-500 text-center mt-2">{error}</p>}
        </div>
      )}

      <Link to="/" className="mt-4 text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2">
        なふだとは？
      </Link>
    </div>
  )
}
