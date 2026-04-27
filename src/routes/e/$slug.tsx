import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { useState, useEffect, useCallback } from 'react'
import { auth } from '../../server/auth'
import { getEventParticipants } from '../../server/functions/event'
import { getOwnProfile } from '../../server/functions/profile'
import { checkinToEvent, getMyCheckinStatus } from '../../server/functions/event'
import { ParticipantCard } from '../../components/ParticipantCard'
import { QRBottomSheet } from '../../components/QRBottomSheet'

// Public route — no auth required (OSHI-04, OSHI-05)
// Returns null when not authenticated instead of throwing redirect
const getOptionalSession = createServerFn({ method: 'GET' })
  .handler(async () => {
    const request = getRequest()
    return await auth.api.getSession({ headers: request.headers })
  })

export const Route = createFileRoute('/e/$slug')({
  loader: async ({ params }) => {
    const [data, session] = await Promise.all([
      getEventParticipants({ data: { slug: params.slug } }),
      getOptionalSession(),
    ])
    let defaultPersonaId: string | null = null
    let isCheckedIn = false
    if (session?.user) {
      const profile = await getOwnProfile()
      defaultPersonaId =
        profile?.personas?.find((p) => p.isDefault)?.id
        ?? profile?.personas?.[0]?.id
        ?? null
      if (defaultPersonaId) {
        isCheckedIn = await getMyCheckinStatus({ data: { slug: params.slug, personaId: defaultPersonaId } })
      }
    }
    return { data, isLoggedIn: !!session?.user, defaultPersonaId, isCheckedIn }
  },
  component: EventPage,
})

function EventPage() {
  const { data, isLoggedIn, defaultPersonaId, isCheckedIn } = Route.useLoaderData()
  const router = useRouter()
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [checkinError, setCheckinError] = useState<string | null>(null)
  const [qrOpen, setQrOpen] = useState(false)
  const [currentUrl, setCurrentUrl] = useState('')
  useEffect(() => { setCurrentUrl(window.location.href) }, [])

  const handleCheckin = useCallback(async () => {
    if (!defaultPersonaId || !data || isCheckedIn) return
    setIsCheckingIn(true)
    setCheckinError(null)
    try {
      await checkinToEvent({ data: { slug: data.event.slug, personaId: defaultPersonaId } })
      await router.navigate({ to: '/e/$slug', params: { slug: data.event.slug }, replace: true })
    } catch (err) {
      setCheckinError(err instanceof Error ? err.message : 'チェックインに失敗しました')
    } finally {
      setIsCheckingIn(false)
    }
  }, [defaultPersonaId, data, isCheckedIn, router])

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-2xl font-semibold text-gray-700">イベントが見つかりません</h1>
        <p className="text-sm text-gray-500">URLを確認してください。</p>
        <Link to="/" className="text-sm text-blue-500 underline">トップへ戻る</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto flex flex-col gap-6">
      {/* イベント情報ヘッダー */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-gray-900">{data.event.name}</h1>
        <p className="text-sm text-gray-500">{data.event.venueName}</p>
        <p className="text-xs text-gray-400">
          {new Date(data.event.eventDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* QRコード */}
      <button
        onClick={() => setQrOpen(true)}
        className="w-full py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
      >
        QRコードを表示
      </button>

      {/* 参加ボタン / ログイン誘導 */}
      {isLoggedIn ? (
        defaultPersonaId ? (
          <div className="flex flex-col gap-2">
            {isCheckedIn ? (
              <div className="w-full py-3 rounded-xl bg-green-100 text-green-700 text-sm font-semibold text-center">
                参加済み
              </div>
            ) : (
              <button
                onClick={handleCheckin}
                disabled={isCheckingIn}
                className="w-full py-3 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCheckingIn ? '参加中...' : '参加する'}
              </button>
            )}
            {checkinError && <p className="text-xs text-red-500 text-center">{checkinError}</p>}
          </div>
        ) : (
          <Link
            to="/_protected/profile"
            className="block w-full py-3 rounded-xl border border-black text-center text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            プロフィールを設定して参加する
          </Link>
        )
      ) : (
        <Link
          to="/login"
          className="block w-full py-3 rounded-xl bg-black text-white text-center text-sm font-semibold hover:bg-gray-800 transition-colors"
        >
          ログインして参加する
        </Link>
      )}

      {/* 参加者カウント */}
      <p className="text-sm text-gray-600 font-medium">
        {data.participants.length}人が参加
      </p>

      {/* 未ログイン時の注意書き（OSHI-05） */}
      {!isLoggedIn && data.participants.length > 0 && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <Link to="/login" className="font-semibold underline">ログイン</Link>
          するとプロフィールを閲覧できます
        </p>
      )}

      {/* 参加者グリッド */}
      {data.participants.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {data.participants.map((p) => (
            <ParticipantCard
              key={p.checkinId}
              displayName={p.displayName}
              avatarUrl={p.avatarUrl}
              // OSHI-05: ログイン済みの場合のみ profileHref を渡す
              profileHref={isLoggedIn && p.urlId ? `/u/${p.urlId}/p/${p.shareToken}` : undefined}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-8">
          まだ参加者はいません
        </p>
      )}

      <QRBottomSheet
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
        url={currentUrl}
        label={`${data.event.name} のQRコード`}
      />
    </div>
  )
}
