import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { eq, and } from 'drizzle-orm'
import { getPublicProfile } from '../../server/functions/profile'
import { createConnection } from '../../server/functions/connection'
import { InitialsAvatar } from '../../components/InitialsAvatar'
import { SnsLinkButton } from '../../components/SnsLinkButton'
import { auth } from '../../server/auth'
import { db } from '../../server/db/client'
import { urlIds, personas } from '../../server/db/schema'

const getSessionData = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return { user: null, myUrlId: null, myPersonas: [] }

  const [urlIdRow, myPersonas] = await Promise.all([
    db.select({ urlId: urlIds.urlId })
      .from(urlIds)
      .where(eq(urlIds.userId, session.user.id))
      .limit(1),
    db.select({ id: personas.id, displayName: personas.displayName, isDefault: personas.isDefault })
      .from(personas)
      .where(and(eq(personas.userId, session.user.id)))
      .orderBy(personas.createdAt),
  ])

  return { user: session.user, myUrlId: urlIdRow[0]?.urlId ?? null, myPersonas }
})

// Specific persona by share token — public route, no auth required
export const Route = createFileRoute('/u/$urlId/p/$token')({
  loader: async ({ params }) => {
    const [profile, sessionData] = await Promise.all([
      getPublicProfile({ data: { shareToken: params.token } }),
      getSessionData(),
    ])
    const isOwnProfile = sessionData.myUrlId === params.urlId
    return { profile, session: sessionData, urlId: params.urlId, shareToken: params.token, isOwnProfile }
  },
  component: PublicProfilePage,
})

function PublicProfilePage() {
  const { profile, session, urlId, shareToken, isOwnProfile } = Route.useLoaderData()
  const navigate = useNavigate()
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)

  if (!profile) return <div className="p-6 text-sm text-gray-500">プロフィールが見つかりません</div>

  const handleConnectClick = async () => {
    if (!session.user) {
      await navigate({ to: '/login', search: { redirect: `/u/${urlId}/p/${shareToken}` } })
      return
    }
    if (session.myPersonas.length === 0) {
      await navigate({ to: '/profile/wizard', search: { redirect: `/u/${urlId}/p/${shareToken}` } })
    } else if (session.myPersonas.length === 1) {
      await doConnect(session.myPersonas[0].id)
    } else {
      setShowPicker(true)
    }
  }

  const doConnect = async (fromPersonaId: string) => {
    setShowPicker(false)
    setConnecting(true)
    setError(null)
    try {
      await createConnection({ data: { targetShareToken: shareToken, fromPersonaId } })
      setConnected(true)
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
          ) : showPicker ? (
            <PersonaPicker
              personas={session.myPersonas}
              onSelect={doConnect}
              onCancel={() => setShowPicker(false)}
            />
          ) : (
            <button
              onClick={handleConnectClick}
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

function PersonaPicker({
  personas,
  onSelect,
  onCancel,
}: {
  personas: { id: string; displayName: string; isDefault: boolean }[]
  onSelect: (id: string) => void
  onCancel: () => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-gray-600 text-center">どのなふだとしてつながりますか？</p>
      {personas.map(p => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          className="w-full px-4 py-3 bg-pink-500 text-white rounded-xl text-sm font-medium hover:bg-pink-600 transition-colors flex items-center justify-between"
        >
          <span>{p.displayName}</span>
          {p.isDefault && <span className="text-xs text-pink-200">デフォルト</span>}
        </button>
      ))}
      <button
        onClick={onCancel}
        className="w-full px-4 py-2 text-gray-400 text-sm"
      >
        キャンセル
      </button>
    </div>
  )
}
