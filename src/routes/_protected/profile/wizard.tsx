import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useRef, useCallback } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { urlIdSchema, checkUrlIdAvailability, createPersona } from '../../../server/functions/profile'
import { InitialsAvatar } from '../../../components/InitialsAvatar'
import { OshiTagInput } from '../../../components/OshiTagInput'

export const Route = createFileRoute('/_protected/profile/wizard')({
  component: WizardPage,
})

// Steps: 1=URL-ID, 2=表示名, 3=推しタグ, 4=アバター, 5=完了

const WizardSchema = z.object({
  urlId: urlIdSchema,
  displayName: z.string().min(1, '表示名を入力してください').max(50, '50文字以下'),
  oshiTags: z.array(z.string()).min(1, '推しタグを1個以上入力してください'),
  avatarUrl: z.string().url('有効なURLを入力してください').optional().or(z.literal('')),
  useAutoAvatar: z.boolean().default(true),
})

type WizardForm = z.infer<typeof WizardSchema>

function WizardPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [urlIdAvailable, setUrlIdAvailable] = useState<boolean | null>(null)
  const [checkingUrlId, setCheckingUrlId] = useState(false)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [oshiTagsError, setOshiTagsError] = useState<string | null>(null)

  const methods = useForm<WizardForm>({
    resolver: zodResolver(WizardSchema),
    defaultValues: {
      useAutoAvatar: true,
      oshiTags: [],
    },
  })

  const { register, handleSubmit, watch, formState: { errors } } = methods

  const displayName = watch('displayName') ?? ''
  const useAutoAvatar = watch('useAutoAvatar')
  const oshiTags = watch('oshiTags') ?? []

  const handleUrlIdChange = useCallback((value: string) => {
    setUrlIdAvailable(null)
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    if (!value || value.length < 3) return

    debounceTimerRef.current = setTimeout(async () => {
      setCheckingUrlId(true)
      try {
        const result = await checkUrlIdAvailability({ data: { urlId: value } })
        setUrlIdAvailable(result.available)
      } finally {
        setCheckingUrlId(false)
      }
    }, 400)
  }, [])

  const handleProceedFromOshi = () => {
    if (oshiTags.length === 0) {
      setOshiTagsError('推しタグを1個以上入力してください')
      return
    }
    setOshiTagsError(null)
    setStep(4)
  }

  const onSubmit = async (values: WizardForm) => {
    setSubmitError(null)
    try {
      await createPersona({
        data: {
          urlId: values.urlId,
          displayName: values.displayName,
          avatarUrl: values.useAutoAvatar ? null : (values.avatarUrl || null),
          isDefault: true,
          oshiTags: values.oshiTags,
        },
      })
      navigate({ to: '/me' })
    } catch (err) {
      if (err instanceof Error && err.message === 'URL_ID_TAKEN') {
        setSubmitError('このURL-IDはすでに使用されています。別のIDを入力してください。')
        setStep(1)
      } else {
        setSubmitError('エラーが発生しました。もう一度お試しください。')
      }
    }
  }

  // Step labels — 5 steps now
  const steps = ['URL-ID', '表示名', '推しタグ', 'アバター', '完了']

  return (
    <div className="min-h-screen p-6 flex flex-col max-w-md mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center gap-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
              ${i + 1 === step ? 'bg-black text-white' : i + 1 < step ? 'bg-gray-400 text-white' : 'bg-gray-100 text-gray-400'}`}>
              {i + 1}
            </div>
            {i < steps.length - 1 && <div className="w-6 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">

          {/* Step 1: URL-ID */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold">URL-IDを決めましょう</h2>
              <p className="text-sm text-gray-500">
                あなたのプロフィールURLになります。<br />
                <strong>英数字のみ・一度設定したら変更できません。</strong>
              </p>
              <div>
                <div className="flex items-center border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-black">
                  <span className="px-3 py-3 text-sm text-gray-400 bg-gray-50 border-r">/u/</span>
                  <input
                    {...register('urlId')}
                    onChange={(e) => {
                      void register('urlId').onChange(e)
                      handleUrlIdChange(e.target.value)
                    }}
                    placeholder="yourname"
                    className="flex-1 px-3 py-3 text-sm outline-none"
                  />
                </div>
                {checkingUrlId && <p className="text-xs text-gray-400 mt-1">確認中...</p>}
                {!checkingUrlId && urlIdAvailable === true && (
                  <p className="text-xs text-green-600 mt-1">使用できます</p>
                )}
                {!checkingUrlId && urlIdAvailable === false && (
                  <p className="text-xs text-red-600 mt-1">このURL-IDはすでに使用されています</p>
                )}
                {errors.urlId && <p className="text-xs text-red-600 mt-1">{errors.urlId.message}</p>}
              </div>
              <button
                type="button"
                onClick={() => { if (urlIdAvailable) setStep(2) }}
                disabled={!urlIdAvailable}
                className="w-full py-3 bg-black text-white rounded-lg text-sm font-medium disabled:opacity-40"
              >
                次へ
              </button>
            </div>
          )}

          {/* Step 2: Display name */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold">表示名を決めましょう</h2>
              <p className="text-sm text-gray-500">本名は不要です。ハンドル名・ニックネームでOK。絵文字も使えます。</p>
              <div>
                <input
                  {...register('displayName')}
                  placeholder="ぴたんこ🐾"
                  className="w-full px-3 py-3 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-black"
                />
                {errors.displayName && <p className="text-xs text-red-600 mt-1">{errors.displayName.message}</p>}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 border rounded-lg text-sm">戻る</button>
                <button type="button" onClick={() => setStep(3)} className="flex-1 py-3 bg-black text-white rounded-lg text-sm font-medium">次へ</button>
              </div>
            </div>
          )}

          {/* Step 3: Oshi tags */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold">推し・趣味・ジャンルを教えてください</h2>
              <p className="text-sm text-gray-500">
                推しの名前・グループ名・ジャンルなど自由に入力できます。<br />
                入力して <kbd className="px-1 py-0.5 text-xs bg-gray-100 border rounded">Enter</kbd> で追加、×で削除。複数登録OK。
              </p>
              <OshiTagInput name="oshiTags" />
              {oshiTagsError && (
                <p className="text-xs text-red-600">{oshiTagsError}</p>
              )}
              {errors.oshiTags && (
                <p className="text-xs text-red-600">{errors.oshiTags.message}</p>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(2)} className="flex-1 py-3 border rounded-lg text-sm">戻る</button>
                <button type="button" onClick={handleProceedFromOshi} className="flex-1 py-3 bg-black text-white rounded-lg text-sm font-medium">次へ</button>
              </div>
              <button
                type="button"
                onClick={() => { setOshiTagsError(null); setStep(4) }}
                className="text-xs text-gray-400 text-center underline"
              >
                スキップ
              </button>
            </div>
          )}

          {/* Step 4: Avatar */}
          {step === 4 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold">アバターを設定しましょう</h2>
              <div className="flex justify-center">
                <InitialsAvatar name={displayName || '?'} size={80} />
              </div>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register('useAutoAvatar')} className="rounded" />
                  <span className="text-sm">イニシャルアバターを使う（表示名の頭文字＋カラー）</span>
                </label>
                {!useAutoAvatar && (
                  <div>
                    <input
                      {...register('avatarUrl')}
                      placeholder="https://example.com/avatar.png"
                      className="w-full px-3 py-3 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-black"
                    />
                    {errors.avatarUrl && <p className="text-xs text-red-600 mt-1">{errors.avatarUrl.message}</p>}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(3)} className="flex-1 py-3 border rounded-lg text-sm">戻る</button>
                <button type="button" onClick={() => setStep(5)} className="flex-1 py-3 bg-black text-white rounded-lg text-sm font-medium">次へ</button>
              </div>
            </div>
          )}

          {/* Step 5: Confirm + submit */}
          {step === 5 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold">設定完了！</h2>
              <p className="text-sm text-gray-500">プロフィールを作成して始めましょう。</p>
              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{submitError}</div>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(4)} className="flex-1 py-3 border rounded-lg text-sm">戻る</button>
                <button type="submit" className="flex-1 py-3 bg-black text-white rounded-lg text-sm font-medium">プロフィールを作成</button>
              </div>
            </div>
          )}
        </form>
      </FormProvider>
    </div>
  )
}
