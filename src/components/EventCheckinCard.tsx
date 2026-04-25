import { Link } from '@tanstack/react-router'

interface EventCheckinCardProps {
  eventName: string
  venueName: string
  eventDate: string       // ISO日付文字列
  checkedInAt: string     // ISO日付文字列
  eventSlug: string       // /e/$slug リンク用
  onCheckout: () => void
  isCheckingOut?: boolean
}

export function EventCheckinCard({
  eventName,
  venueName,
  eventDate,
  checkedInAt,
  eventSlug,
  onCheckout,
  isCheckingOut = false,
}: EventCheckinCardProps) {
  const formattedDate = new Date(eventDate).toLocaleDateString('ja-JP')
  const formattedTime = new Date(checkedInAt).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm flex flex-col gap-4">
      {/* ステータスバッジ */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          チェックイン中
        </span>
      </div>

      {/* イベント情報 */}
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold leading-snug">{eventName}</h2>
        <p className="text-sm text-muted-foreground">{venueName}</p>
        <p className="text-xs text-muted-foreground">{formattedDate}</p>
      </div>

      {/* チェックイン時刻 */}
      <p className="text-xs text-muted-foreground">
        チェックイン時刻: <span className="font-medium text-foreground">{formattedTime}</span>
      </p>

      {/* アクション */}
      <div className="flex flex-col gap-2 pt-1">
        <Link
          to="/e/$slug"
          params={{ slug: eventSlug }}
          className="text-sm text-center text-blue-600 underline hover:text-blue-800"
        >
          イベント参加者を見る
        </Link>
        <button
          onClick={onCheckout}
          disabled={isCheckingOut}
          className="w-full py-2.5 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isCheckingOut ? 'チェックアウト中...' : 'チェックアウト'}
        </button>
      </div>
    </div>
  )
}
