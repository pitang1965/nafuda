import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getOwnProfile } from '../../../server/functions/profile'
import { createEventAndCheckin } from '../../../server/functions/event'

async function getGpsCoords(): Promise<{ x: number; y: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ x: pos.coords.longitude, y: pos.coords.latitude }),
      () => resolve(null),
      { timeout: 5000, enableHighAccuracy: false },
    )
  })
}

function generateSlug(eventName: string, eventDate: string): string {
  const datePart = eventDate.replace(/-/g, '')
  const namePart = eventName
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
  return `${namePart}-${datePart}`
}

const schema = z.object({
  eventName: z.string().min(1, 'イベント名を入力してください').max(100),
  venueName: z.string().min(1, '会場名を入力してください').max(100),
  eventDate: z.string().min(1, '日付を選択してください'),
})

type FormValues = z.infer<typeof schema>

export const Route = createFileRoute('/_protected/events/new')({
  loader: async () => {
    const profile = await getOwnProfile()
    const defaultPersona =
      profile?.personas?.find((p) => p.isDefault) ?? profile?.personas?.[0]
    return { personaId: defaultPersona?.id ?? null }
  },
  component: NewEventPage,
})

function NewEventPage() {
  const { personaId } = Route.useLoaderData()
  const router = useRouter()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (formData: FormValues) => {
    if (!personaId) {
      setSubmitError('ペルソナが見つかりません。プロフィールを設定してください。')
      return
    }
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      const gps = await getGpsCoords()
      const slug = generateSlug(formData.eventName, formData.eventDate)
      await createEventAndCheckin({
        data: {
          slug,
          eventName: formData.eventName,
          venueName: formData.venueName,
          eventDate: new Date(formData.eventDate).toISOString(),
          personaId,
          gpsCoordinates: gps ?? undefined,
        },
      })
      await router.navigate({ to: '/e/$slug', params: { slug } })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'イベントの作成に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-4 border-b flex items-center gap-3">
        <button
          onClick={() => router.history.back()}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="戻る"
        >
          ←
        </button>
        <h1 className="text-lg font-bold">イベントを作成</h1>
      </div>

      <div className="flex-1 p-6 flex flex-col gap-6 max-w-lg mx-auto w-full">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="eventName">イベント名</label>
              <input
                id="eventName"
                type="text"
                placeholder="例: コミックマーケット105"
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                {...register('eventName')}
              />
              {errors.eventName && <p className="text-xs text-red-500">{errors.eventName.message}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="venueName">会場名</label>
              <input
                id="venueName"
                type="text"
                placeholder="例: 東京ビッグサイト"
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                {...register('venueName')}
              />
              {errors.venueName && <p className="text-xs text-red-500">{errors.venueName.message}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="eventDate">イベント日付</label>
              <input
                id="eventDate"
                type="date"
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                {...register('eventDate')}
              />
              {errors.eventDate && <p className="text-xs text-red-500">{errors.eventDate.message}</p>}
            </div>
          </div>

          {submitError && <p className="text-sm text-red-600 px-1">{submitError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? '作成中...' : 'イベントを作成する'}
          </button>

          <p className="text-xs text-center text-muted-foreground">
            作成後、QRコード付きイベントページに移動します
          </p>
        </form>
      </div>
    </div>
  )
}
