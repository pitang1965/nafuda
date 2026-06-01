import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { getMyConnections } from '../../server/functions/connection'
import { InitialsAvatar } from '../../components/InitialsAvatar'

export const Route = createFileRoute('/_protected/connections')({
  loader: () => getMyConnections(),
  component: ConnectionsPage,
})

function ConnectionsPage() {
  const connections = Route.useLoaderData()
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-4 border-b flex items-center gap-3">
        <button
          onClick={() => router.history.back()}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="戻る"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <h1 className="text-lg font-bold">つながり</h1>
      </div>

      {/* コネクション一覧 */}
      <div className="flex-1 p-4">
        {connections.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-3">
            {connections.map((conn) => (
              <ConnectionCard key={conn.connectionId} conn={conn} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

type Connection = Awaited<ReturnType<typeof getMyConnections>>[number]

function ConnectionCard({ conn }: { conn: Connection }) {
  const connectedDate = new Date(conn.connectedAt).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <Link
      to="/u/$urlId/p/$token"
      params={{ urlId: conn.toUrlId, token: conn.toShareToken }}
      className="flex items-start gap-3 p-4 bg-white rounded-xl border hover:bg-gray-50 transition-colors"
    >
      {/* アバター */}
      <div className="shrink-0">
        {conn.toAvatarUrl ? (
          <img src={conn.toAvatarUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <InitialsAvatar name={conn.toDisplayName} size={48} />
        )}
      </div>

      {/* 情報 */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{conn.toDisplayName}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {conn.fromLabel || conn.fromDisplayName} として · {connectedDate}
        </p>

        {/* イベントコンテキスト（チェックイン中につながった場合のみ表示） */}
        {conn.eventName && (
          <div className="mt-1.5 px-2 py-1 bg-pink-50 rounded text-xs text-pink-700">
            <span className="font-medium">{conn.eventName}</span>
            {conn.venueName && <span className="text-pink-500"> @ {conn.venueName}</span>}
            {conn.eventDate && (
              <span className="text-pink-400">
                {' '}({new Date(conn.eventDate).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })})
              </span>
            )}
          </div>
        )}
      </div>

      {/* 矢印 */}
      <div className="shrink-0 text-gray-300 self-center">›</div>
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="text-4xl">🤝</div>
      <p className="text-sm text-gray-500 text-center">
        まだつながりがありません
      </p>
      <p className="text-xs text-gray-400 text-center">
        相手のQRコードを読み取り、なふだページで「つながる」を押してみましょう
      </p>
    </div>
  )
}
