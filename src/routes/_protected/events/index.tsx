import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getOwnProfile } from '../../../server/functions/profile'
import {
  checkinToEvent,
  checkoutFromEvent,
  getActiveCheckin,
} from '../../../server/functions/event'
import { EventCheckinCard } from '../../../components/EventCheckinCard'

// ------------------------------------------------------------------
// GPS ヘルパー（ボタン押下時のみ呼ぶ — ページロード時は禁止）
// ------------------------------------------------------------------
async function getGpsCoords(): Promise<{ x: number; y: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ x: pos.coords.longitude, y: pos.coords.latitude }),
      () => resolve(null),
      { timeout: 5000, enableHighAccuracy: false },
    )
  })
}

// ------------------------------------------------------------------
// slug 自動生成ヘルパー
// ------------------------------------------------------------------
function generateSlug(eventName: string, eventDate: string): string {
  const datePart = eventDate.replace(/-/g, '') // "2026-04-05" → "20260405"
  const namePart = eventName
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // 特殊文字除去
    .replace(/[\s_]+/g, '-')  // スペースをハイフンに
    .replace(/-+/g, '-')      // 連続ハイフン除去
    .slice(0, 50)
  return `${namePart}-${datePart}`
}

// ------------------------------------------------------------------
// フォームスキーマ
// ------------------------------------------------------------------
const checkinSchema = z.object({
  eventName: z.string().min(1, 'イベント名を入力してください').max(100),
  venueName: z.string().min(1, '会場名を入力してください').max(100),
  eventDate: z.string().min(1, '日付を選択してください'),
})

type CheckinFormValues = z.infer<typeof checkinSchema>

// ------------------------------------------------------------------
// ルート定義
// ------------------------------------------------------------------
export const Route = createFileRoute('/_protected/events/')({
  loader: async () => {
    const profile = await getOwnProfile()
    const defaultPersona =
      profile?.personas?.find((p) => p.isDefault) ?? profile?.personas?.[0]
    if (!defaultPersona) return { activeCheckin: null, personaId: null }
    const activeCheckin = await getActiveCheckin({
      data: { personaId: defaultPersona.id },
    })
    return { activeCheckin, personaId: defaultPersona.id }
  },
  component: EventsPage,
})

// ------------------------------------------------------------------
// コンポーネント
// ------------------------------------------------------------------
function EventsPage() {
  const { activeCheckin, personaId } = Route.useLoaderData()
  const router = useRouter()
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CheckinFormValues>({
    resolver: zodResolver(checkinSchema),
  })

  // チェックイン送信
  const onSubmit = async (formData: CheckinFormValues) => {
    if (!personaId) {
      setSubmitError('ペルソナが見つかりません。プロフィールを設定してください。')
      return
    }
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      // GPS 取得はボタン押下時のみ（ページロード時の useEffect 呼び出し禁止）
      const gps = await getGpsCoords()
      const slug = generateSlug(formData.eventName, formData.eventDate)
      await checkinToEvent({
        data: {
          slug,
          eventName: formData.eventName,
          venueName: formData.venueName,
          eventDate: new Date(formData.eventDate).toISOString(),
          personaId,
          gpsCoordinates: gps ?? undefined,
        },
      })
      reset()
      await router.invalidate()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'チェックインに失敗しました'
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // チェックアウト処理
  const handleCheckout = async () => {
    if (!activeCheckin?.checkinId) return
    setIsCheckingOut(true)
    try {
      await checkoutFromEvent({ data: { checkinId: activeCheckin.checkinId } })
      await router.invalidate()
    } catch (err) {
      console.error('チェックアウトエラー:', err)
    } finally {
      setIsCheckingOut(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-lg font-bold">イベントチェックイン</h1>
      </div>

      <div className="flex-1 p-6 flex flex-col gap-6 max-w-lg mx-auto w-full">
        {/* アクティブチェックイン中 */}
        {activeCheckin ? (
          <EventCheckinCard
            eventName={activeCheckin.eventName}
            venueName={activeCheckin.venueName}
            eventDate={
              activeCheckin.eventDate instanceof Date
                ? activeCheckin.eventDate.toISOString()
                : String(activeCheckin.eventDate)
            }
            checkedInAt={
              activeCheckin.checkedInAt instanceof Date
                ? activeCheckin.checkedInAt.toISOString()
                : String(activeCheckin.checkedInAt)
            }
            eventSlug={activeCheckin.eventSlug}
            onCheckout={handleCheckout}
            isCheckingOut={isCheckingOut}
          />
        ) : (
          /* チェックインフォーム */
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="rounded-xl border bg-card p-5 shadow-sm flex flex-col gap-4">
              <h2 className="text-base font-semibold">イベントにチェックイン</h2>

              {/* イベント名 */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor="eventName">
                  イベント名
                </label>
                <input
                  id="eventName"
                  type="text"
                  placeholder="例: コミックマーケット105"
                  className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  {...register('eventName')}
                />
                {errors.eventName && (
                  <p className="text-xs text-red-500">{errors.eventName.message}</p>
                )}
              </div>

              {/* 会場名 */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor="venueName">
                  会場名
                </label>
                <input
                  id="venueName"
                  type="text"
                  placeholder="例: 東京ビッグサイト"
                  className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  {...register('venueName')}
                />
                {errors.venueName && (
                  <p className="text-xs text-red-500">{errors.venueName.message}</p>
                )}
              </div>

              {/* 日付 */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor="eventDate">
                  イベント日付
                </label>
                <input
                  id="eventDate"
                  type="date"
                  className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  {...register('eventDate')}
                />
                {errors.eventDate && (
                  <p className="text-xs text-red-500">{errors.eventDate.message}</p>
                )}
              </div>
            </div>

            {/* エラー表示 */}
            {submitError && (
              <p className="text-sm text-red-600 px-1">{submitError}</p>
            )}

            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'チェックイン中...' : 'チェックイン'}
            </button>

            <p className="text-xs text-center text-muted-foreground">
              チェックイン時に位置情報の取得を求める場合があります（任意）
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
