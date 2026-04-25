import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '../../server/auth'
import { getEventParticipants } from '../../server/functions/event'
import { ParticipantCard } from '../../components/ParticipantCard'

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
    return { data, isLoggedIn: !!session?.user }
  },
  component: EventPage,
})

function EventPage() {
  const { data, isLoggedIn } = Route.useLoaderData()

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
    <div className="min-h-screen p-6 max-w-2xl mx-auto flex flex-col gap-5">
      {/* イベント情報ヘッダー */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-gray-900">{data.event.name}</h1>
        <p className="text-sm text-gray-500">{data.event.venueName}</p>
        <p className="text-xs text-gray-400">
          {new Date(data.event.eventDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* 参加者カウント */}
      <p className="text-sm text-gray-600 font-medium">
        {data.participants.length}人がチェックイン中
      </p>

      {/* 未ログイン時の注意書き（OSHI-05） */}
      {!isLoggedIn && (
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
              profileHref={isLoggedIn ? `/u/${p.urlId}/p/${p.shareToken}` : undefined}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-8">
          現在チェックイン中の参加者はいません
        </p>
      )}
    </div>
  )
}
